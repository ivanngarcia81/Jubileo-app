import { type Centavos, centavos } from '../../lib/dinero'
import type { FechaCivil } from '../../lib/fecha'
import { cliente } from '../cliente'
import { anotarGasto } from './anotar'

/**
 * Cerrar la semana.
 *
 * Tres preguntas, treinta segundos (sección 9 del SPEC): ¿entró lo esperado?,
 * ¿cuánto gastaste en los sobres variables?, ¿pagaste lo que faltaba? Es lo que
 * hace que el mes avance en vez de quedarse congelado el día que se armó.
 *
 * Nada de lo que ya está anotado se reescribe. Si el usuario dice que gastó $80
 * y la app tiene $62, se anota la diferencia como un movimiento aparte y con su
 * nombre. Sobrescribir el registro sería más limpio de programar y borraría la
 * única cosa que el usuario no puede reconstruir: lo que de verdad pasó.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

export interface AjusteDeSobre {
  categoriaId: string
  /** Lo que el usuario dice que gastó en total en ese sobre, este cheque. */
  gastadoCents: Centavos
  /** Lo que la app ya tenía anotado. */
  yaAnotadoCents: Centavos
}

export interface CierreDeSemana {
  hogarId: string
  usuarioId: string
  periodoId: string
  fecha: FechaCivil
  /** Nulo si el usuario dice que entró lo esperado y no quiere corregirlo. */
  ingresoRealCents: Centavos | null
  sobres: readonly AjusteDeSobre[]
  /** Categorías de pagos fijos que quedaron por marcar y sí se pagaron. */
  pagosHechos: readonly { categoriaId: string; nombre: string; montoCents: Centavos }[]
}

/**
 * Cierra el cheque en curso: guarda lo que entró de verdad, anota los ajustes
 * que haga falta y lo marca como cerrado.
 *
 * No se toca el estado de los demás cheques. Cuál está en curso lo decide la
 * fecha, no una bandera que alguien tenga que acordarse de mover.
 */
export async function cerrarSemana(cierre: CierreDeSemana): Promise<void> {
  const db = cliente()

  for (const sobre of cierre.sobres) {
    const falta = centavos(sobre.gastadoCents - sobre.yaAnotadoCents)
    if (falta <= 0) continue
    await anotarGasto({
      hogarId: cierre.hogarId,
      usuarioId: cierre.usuarioId,
      periodoId: cierre.periodoId,
      categoriaId: sobre.categoriaId,
      fecha: cierre.fecha,
      montoCents: falta,
      descripcion: 'Ajuste al cerrar la semana',
    })
  }

  for (const pago of cierre.pagosHechos) {
    await anotarGasto({
      hogarId: cierre.hogarId,
      usuarioId: cierre.usuarioId,
      periodoId: cierre.periodoId,
      categoriaId: pago.categoriaId,
      fecha: cierre.fecha,
      montoCents: pago.montoCents,
      descripcion: pago.nombre,
    })
  }

  const { error } = await db
    .from('periodos')
    .update({
      estado: 'cerrado',
      ...(cierre.ingresoRealCents === null ? {} : { ingreso_real_cents: cierre.ingresoRealCents }),
    })
    .eq('id', cierre.periodoId)
  reventar('No se pudo cerrar la semana', error)
}
