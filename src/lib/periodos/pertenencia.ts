import { anioDe, type FechaCivil, mesDe } from '../fecha'
import type { Anulaciones, MesObjetivo } from './tipos'

/**
 * Regla 1 de las que cruzan meses: **un cheque se asigna al mes que financia,
 * no al mes en que cae.** Un cheque del 28 de agosto que paga las cuentas de
 * septiembre pertenece a septiembre.
 *
 * Por defecto el mes es el de la fecha de pago. El usuario lo mueve con un
 * control explícito, y ese control entra por aquí y solo por aquí.
 */

export function mesPorDefecto(fechaPago: FechaCivil): MesObjetivo {
  return { anio: anioDe(fechaPago), mes: mesDe(fechaPago) }
}

export function mesQueFinancia(fechaPago: FechaCivil, anulaciones?: Anulaciones): MesObjetivo {
  return anulaciones?.get(fechaPago) ?? mesPorDefecto(fechaPago)
}

export function mismoMesObjetivo(a: MesObjetivo, b: MesObjetivo): boolean {
  return a.anio === b.anio && a.mes === b.mes
}

export function perteneceAlMes(
  fechaPago: FechaCivil,
  objetivo: MesObjetivo,
  anulaciones?: Anulaciones,
): boolean {
  return mismoMesObjetivo(mesQueFinancia(fechaPago, anulaciones), objetivo)
}
