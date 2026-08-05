import { type Asignacion, type LineaPresupuesto, repartirMes } from './asignaciones'
import { generarPeriodos } from './generador'
import type { ConfigPago, MesObjetivo, OpcionesGenerador, Periodo } from './tipos'

/**
 * Cambiar de frecuencia de pago **no rehace el presupuesto**.
 *
 * Es un solo control en ajustes: se regeneran los periodos y las asignaciones
 * se vuelven a repartir entre los nuevos. Los montos mensuales de cada línea
 * no se tocan — el usuario no pierde el trabajo de armar su mes solo porque
 * cambió de trabajo o le cambiaron el ciclo de nómina.
 *
 * El reparto nuevo sale de `dinero.repartir`, así que la invariante queda
 * cumplida desde el primer momento y el mes se puede cerrar.
 */

export interface ResultadoCambioFrecuencia {
  periodos: Periodo[]
  asignaciones: Asignacion[]
}

export function cambiarFrecuencia(
  lineas: readonly LineaPresupuesto[],
  configNueva: ConfigPago,
  objetivo: MesObjetivo,
  opciones: OpcionesGenerador = {},
): ResultadoCambioFrecuencia {
  const periodos = generarPeriodos(configNueva, objetivo, opciones)
  return { periodos, asignaciones: repartirMes(lineas, periodos) }
}
