import { type Centavos, centavos } from '../../lib/dinero'
import { type FechaCivil, fecha } from '../../lib/fecha'
import { type ConfigPago, type MesObjetivo, generarPeriodos } from '../../lib/periodos'
import { cliente } from '../cliente'
import type { FilaDescuadre, FilaUsuario } from '../esquema'

/**
 * Sembrar y cerrar el mes.
 *
 * `sembrarMes` **no genera el calendario**: se lo pide a `generarPeriodos` de
 * `src/lib/periodos`, que sigue siendo el único lugar del código donde se
 * genera (regla técnica de la sección 4). Aquí solo se guarda lo que ese
 * módulo devuelve.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

function configDe(u: FilaUsuario): ConfigPago | null {
  if (!u.frecuencia_pago || !u.fecha_ancla) return null
  return {
    frecuencia: u.frecuencia_pago,
    fechaAncla: fecha(u.fecha_ancla),
    ...(u.dias_pago ? { diasPago: u.dias_pago } : {}),
    ingresoEsperadoCents: u.ingreso_esperado_cents === null ? null : centavos(u.ingreso_esperado_cents),
  }
}

/**
 * Crea el mes y los periodos de **cada miembro que cobra**. En modo pareja son
 * dos juegos, uno por persona, numerados por separado — por eso `periodos`
 * lleva `usuario_id` y por eso el único índice es (mes, usuario, número).
 */
export async function sembrarMes(
  hogarId: string,
  objetivo: MesObjetivo,
  miembros: readonly FilaUsuario[],
): Promise<string> {
  const db = cliente()

  const { data: mes, error: errorMes } = await db
    .from('meses')
    .upsert(
      { hogar_id: hogarId, anio: objetivo.anio, mes: objetivo.mes, estado: 'activo' },
      { onConflict: 'hogar_id,anio,mes' },
    )
    .select('id')
    .single<{ id: string }>()
  reventar('No se pudo crear el mes', errorMes)
  if (!mes) throw new Error('No se pudo crear el mes')

  const filas = miembros.flatMap((miembro) => {
    const config = configDe(miembro)
    if (!config) return []
    return generarPeriodos(config, objetivo).map((p) => ({
      hogar_id: hogarId,
      mes_id: mes.id,
      usuario_id: miembro.id,
      numero: p.numero,
      fecha_inicio: p.fechaInicio,
      fecha_fin: p.fechaFin,
      fecha_pago: p.fechaPago,
      ingreso_esperado_cents: p.ingresoEsperadoCents,
      es_extra: p.esExtra,
    }))
  })

  if (filas.length === 0) {
    throw new Error(
      'Nadie del hogar tiene configurada su frecuencia de pago, así que no hay cheques que generar.',
    )
  }

  const { error } = await db
    .from('periodos')
    .upsert(filas, { onConflict: 'mes_id,usuario_id,numero' })
  reventar('No se pudieron guardar los cheques del mes', error)

  return mes.id
}

export interface Descuadre {
  categoria: string
  faltanteCents: Centavos
}

/** Las líneas que no cuadran, según el servidor. */
export async function lineasDescuadradas(mesId: string): Promise<Descuadre[]> {
  const { data, error } = await cliente().rpc('lineas_descuadradas', { objetivo: mesId })
  reventar('No se pudo revisar el mes', error)
  return ((data ?? []) as FilaDescuadre[]).map((d) => ({
    categoria: d.categoria,
    faltanteCents: centavos(d.faltante_cents),
  }))
}

/**
 * Cierra el mes. El servidor vuelve a comprobar la invariante y **rechaza** si
 * alguna línea no cuadra: el cliente puede mentir. El mensaje que sube ya
 * viene en español desde la función de Postgres.
 */
export async function cerrarMes(mesId: string): Promise<void> {
  const { error } = await cliente().rpc('cerrar_mes', { objetivo: mesId })
  if (error) throw new Error(error.message)
}

/** Cuándo empieza a contar la fecha de libertad de las deudas. */
export function inicioDelMes({ anio, mes }: MesObjetivo): FechaCivil {
  return fecha(`${anio}-${String(mes).padStart(2, '0')}-01`)
}
