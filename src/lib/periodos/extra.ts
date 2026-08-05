import type { Periodo } from './tipos'

/**
 * El cheque extra: el tercero de un mes de 3 en `cada_dos_semanas`.
 *
 * No se reparte entre categorías — ese es justo el punto. Llega completo y
 * la app sugiere a dónde mandarlo: a la deuda de enfoque, o al fondo de
 * emergencia si ya no hay deudas. Es una sugerencia, no una decisión:
 * presupuestar es un acto del usuario.
 */

export interface DeudaResumen {
  id: string
  esEnfoque: boolean
  pagadaEn: unknown | null
}

export type DestinoChequeExtra =
  | { tipo: 'deuda_enfoque'; deudaId: string }
  | { tipo: 'fondo_emergencia' }

export function periodosExtra(periodos: readonly Periodo[]): Periodo[] {
  return periodos.filter((p) => p.esExtra)
}

/** Los periodos entre los que sí se reparte el presupuesto del mes. */
export function periodosRepartibles(periodos: readonly Periodo[]): Periodo[] {
  return periodos.filter((p) => !p.esExtra)
}

export function sugerenciaChequeExtra(deudas: readonly DeudaResumen[]): DestinoChequeExtra {
  const pendientes = deudas.filter((d) => d.pagadaEn === null)
  const enfoque = pendientes.find((d) => d.esEnfoque) ?? pendientes[0]
  return enfoque ? { tipo: 'deuda_enfoque', deudaId: enfoque.id } : { tipo: 'fondo_emergencia' }
}
