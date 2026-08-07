import { centavos } from '../../lib/dinero'
import type { FechaCivil } from '../../lib/fecha'
import { type ConfigPago, type MesObjetivo, generarPeriodos } from '../../lib/periodos'
import { cliente } from '../cliente'
import type { FilaPeriodo, FilaTransaccion } from '../esquema'
import { repartirElMes } from './mes'

/**
 * Cambiar cómo te pagan.
 *
 * La regla 3 de la sección 6 del SPEC: **cambiar de frecuencia no rehace el
 * presupuesto**. Se regeneran los cheques y se re-reparte, pero los montos
 * mensuales no se tocan — el trabajo de armar el mes no se pierde.
 *
 * La parte delicada no es generar el calendario nuevo: eso lo hace el motor, que
 * está probado. Es que los gastos ya anotados cuelgan de los cheques viejos, y
 * unos cheques nuevos con otras fechas los dejarían huérfanos. Por eso los
 * movimientos se remapean por su **fecha** antes de borrar nada: un gasto del 12
 * de agosto sigue siendo del cheque que cubre el 12 de agosto, se llame como se
 * llame.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

export interface ComoMePagan {
  frecuencia: ConfigPago['frecuencia']
  fechaAncla: FechaCivil
  diasPago?: readonly number[] | undefined
  ingresoEsperadoCents: number | null
}

/** El cheque nuevo al que pertenece una fecha, o el último si se sale del riel. */
function chequeDe(fechaGasto: string, periodos: readonly FilaPeriodo[]): string | null {
  const dentro = periodos.find((p) => p.fecha_inicio <= fechaGasto && fechaGasto <= p.fecha_fin)
  return (dentro ?? periodos.at(-1))?.id ?? null
}

export async function cambiarComoMePagan(
  usuarioId: string,
  mesId: string,
  hogarId: string,
  objetivo: MesObjetivo,
  como: ComoMePagan,
): Promise<void> {
  const db = cliente()

  const config: ConfigPago = {
    frecuencia: como.frecuencia,
    fechaAncla: como.fechaAncla,
    ...(como.frecuencia === 'dos_veces_al_mes' ? { diasPago: como.diasPago ?? [1, 15] } : {}),
    ingresoEsperadoCents:
      como.ingresoEsperadoCents === null ? null : centavos(como.ingresoEsperadoCents),
  }
  // El calendario nuevo sale del motor, que es el único lugar donde se genera.
  const nuevos = generarPeriodos(config, objetivo)

  const { error: errorPerfil } = await db
    .from('usuarios')
    .update({
      frecuencia_pago: como.frecuencia,
      fecha_ancla: como.fechaAncla,
      dias_pago: como.frecuencia === 'dos_veces_al_mes' ? (como.diasPago ?? [1, 15]) : null,
      ingreso_esperado_cents: como.ingresoEsperadoCents,
    })
    .eq('id', usuarioId)
  reventar('No se pudo guardar cómo te pagan', errorPerfil)

  // Se escriben los nuevos **antes** de borrar los viejos. Al revés, borrar
  // dejaría a los movimientos sin cheque —la llave es `on delete set null`— y
  // no habría a dónde devolverlos.
  const { error: errorAlta } = await db.from('periodos').upsert(
    nuevos.map((p) => ({
      hogar_id: hogarId,
      mes_id: mesId,
      usuario_id: usuarioId,
      numero: p.numero,
      fecha_inicio: p.fechaInicio,
      fecha_fin: p.fechaFin,
      fecha_pago: p.fechaPago,
      ingreso_esperado_cents: p.ingresoEsperadoCents,
      es_extra: p.esExtra,
    })),
    { onConflict: 'mes_id,usuario_id,numero' },
  )
  reventar('No se pudieron generar tus cheques', errorAlta)

  const { data: enLaBase, error: errorLeer } = await db
    .from('periodos')
    .select(
      'id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, ingreso_esperado_cents, ingreso_real_cents, es_extra, estado',
    )
    .eq('mes_id', mesId)
    .eq('usuario_id', usuarioId)
    .order('numero')
    .returns<FilaPeriodo[]>()
  reventar('No se pudieron leer tus cheques', errorLeer)

  const vigentes = (enLaBase ?? []).filter((p) => p.numero <= nuevos.length)
  const sobrantes = (enLaBase ?? []).filter((p) => p.numero > nuevos.length)

  // Cada gasto vuelve al cheque que cubre su fecha. Si se quedara donde está,
  // aparecería en la semana equivocada; si se borrara el cheque primero, se
  // perdería el vínculo y el gasto dejaría de contar contra su sobre.
  if (vigentes.length > 0) {
    const { data: movimientos } = await db
      .from('transacciones')
      .select('id, periodo_id, fecha')
      .in('periodo_id', (enLaBase ?? []).map((p) => p.id))
      .returns<Pick<FilaTransaccion, 'id' | 'periodo_id' | 'fecha'>[]>()

    for (const m of movimientos ?? []) {
      const destino = chequeDe(m.fecha, vigentes)
      if (!destino || destino === m.periodo_id) continue
      const { error } = await db
        .from('transacciones')
        .update({ periodo_id: destino })
        .eq('id', m.id)
      reventar('No se pudieron mover tus gastos al cheque nuevo', error)
    }
  }

  if (sobrantes.length > 0) {
    const { error } = await db
      .from('periodos')
      .delete()
      .in('id', sobrantes.map((p) => p.id))
    reventar('No se pudieron quitar los cheques que sobraban', error)
  }

  // Y se re-reparte. Los montos mensuales no se tocan: solo cambia en cuántos
  // pedazos se parten.
  await repartirElMes(mesId)
}
