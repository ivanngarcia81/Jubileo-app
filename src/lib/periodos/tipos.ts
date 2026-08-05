import type { Centavos } from '../dinero'
import type { FechaCivil } from '../fecha'

/** Cada cuánto le cae el cheque al usuario. Define todo lo demás. */
export type FrecuenciaPago =
  | 'semanal'
  | 'cada_dos_semanas'
  | 'dos_veces_al_mes'
  | 'mensual'
  | 'variable'

export interface ConfigPago {
  frecuencia: FrecuenciaPago
  /** Un cheque conocido. Desde aquí se genera todo el calendario. */
  fechaAncla: FechaCivil
  /** Solo para `dos_veces_al_mes`: dos días del mes, ej. `[1, 15]` o `[15, 31]`. */
  diasPago?: readonly number[]
  /**
   * Lo que entra por cheque. Nulo cuando el ingreso es variable: nunca se
   * presupuesta ingreso que no ha entrado.
   */
  ingresoEsperadoCents?: Centavos | null
}

export interface MesObjetivo {
  anio: number
  /** 1–12. */
  mes: number
}

export interface Periodo {
  /** 1…n dentro del mes. */
  numero: number
  fechaInicio: FechaCivil
  /** Inclusive: el último día que el periodo cubre. */
  fechaFin: FechaCivil
  fechaPago: FechaCivil
  /** Tercer cheque de un mes de 3. No se reparte entre categorías. */
  esExtra: boolean
  ingresoEsperadoCents: Centavos | null
}

/**
 * Un cheque se asigna al mes que financia, no al mes en que cae. Por defecto
 * es el mes de la fecha de pago; el usuario lo puede mover con un control
 * explícito, y esas mudanzas viajan aquí.
 */
export type Anulaciones = ReadonlyMap<FechaCivil, MesObjetivo>

export interface OpcionesGenerador {
  anulaciones?: Anulaciones
}
