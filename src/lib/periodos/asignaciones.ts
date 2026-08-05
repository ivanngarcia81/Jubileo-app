import { type Centavos, centavos, formatear, repartir, resta, suma } from '../dinero'
import { periodosRepartibles } from './extra'
import type { Periodo } from './tipos'

/**
 * La invariante del producto: **para cada línea, la suma de sus asignaciones
 * por periodo tiene que igualar su monto mensual.** Si no cuadra, la interfaz
 * lo marca y el mes no se cierra. No es una advertencia: es un rechazo.
 *
 * El periodo se identifica aquí por su `numero` dentro del mes. La capa que
 * habla con la base de datos traduce ese número al `periodo_id` real.
 */

export interface LineaPresupuesto {
  id: string
  /** Para el mensaje de error. Opcional: el módulo no depende de él. */
  nombre?: string
  montoMensualCents: Centavos
}

export interface Asignacion {
  lineaPresupuestoId: string
  periodoNumero: number
  montoCents: Centavos
}

export interface EstadoLinea {
  lineaId: string
  nombre: string | undefined
  montoMensualCents: Centavos
  asignadoCents: Centavos
  /** Lo que falta por repartir. Negativo si se repartió de más. */
  faltanteCents: Centavos
  cuadra: boolean
}

export interface EstadoMes {
  cuadra: boolean
  lineas: EstadoLinea[]
  descuadradas: EstadoLinea[]
}

export function asignacionesDeLinea(
  lineaId: string,
  asignaciones: readonly Asignacion[],
): Asignacion[] {
  return asignaciones.filter((a) => a.lineaPresupuestoId === lineaId)
}

export function validarLinea(
  linea: LineaPresupuesto,
  asignaciones: readonly Asignacion[],
): EstadoLinea {
  const propias = asignacionesDeLinea(linea.id, asignaciones)
  const asignado = suma(propias.map((a) => a.montoCents))
  const faltante = resta(linea.montoMensualCents, asignado)
  return {
    lineaId: linea.id,
    nombre: linea.nombre,
    montoMensualCents: linea.montoMensualCents,
    asignadoCents: asignado,
    faltanteCents: faltante,
    cuadra: faltante === 0,
  }
}

export function validarMes(
  lineas: readonly LineaPresupuesto[],
  asignaciones: readonly Asignacion[],
): EstadoMes {
  const estados = lineas.map((l) => validarLinea(l, asignaciones))
  const descuadradas = estados.filter((e) => !e.cuadra)
  return { cuadra: descuadradas.length === 0, lineas: estados, descuadradas }
}

/** El mes solo se cierra si todas las líneas cuadran. */
export function puedeCerrarMes(
  lineas: readonly LineaPresupuesto[],
  asignaciones: readonly Asignacion[],
): boolean {
  return validarMes(lineas, asignaciones).cuadra
}

/**
 * Qué pasó y cómo se arregla, sin jerga y sin disculparse (sección 8).
 */
export function explicarDescuadre(estado: EstadoLinea): string | null {
  if (estado.cuadra) return null
  const nombre = estado.nombre ?? 'esta línea'
  if (estado.faltanteCents > 0) {
    return `Te falta repartir ${formatear(estado.faltanteCents)} en ${nombre}.`
  }
  return `Repartiste ${formatear(centavos(-estado.faltanteCents))} de más en ${nombre}.`
}

/**
 * Reparte el monto mensual de una línea entre los periodos del mes.
 *
 * Los cheques extra quedan fuera: llegan completos y el usuario decide a
 * dónde van. El reparto usa `dinero.repartir`, así que la suma da exacta y
 * la invariante nace cumplida.
 */
export function repartirLinea(
  linea: LineaPresupuesto,
  periodos: readonly Periodo[],
  pesos?: readonly number[],
): Asignacion[] {
  const destino = periodosRepartibles(periodos)
  if (destino.length === 0) {
    throw new RangeError('No hay periodos entre los que repartir este mes')
  }
  if (pesos && pesos.length !== destino.length) {
    throw new RangeError(
      `Los pesos no coinciden con los periodos: ${pesos.length} pesos, ${destino.length} periodos`,
    )
  }

  const montos = repartir(linea.montoMensualCents, pesos ?? destino.map(() => 1))
  return destino.map((periodo, i) => ({
    lineaPresupuestoId: linea.id,
    periodoNumero: periodo.numero,
    montoCents: montos[i]!,
  }))
}

/** Reparte todas las líneas del mes en partes iguales entre los periodos. */
export function repartirMes(
  lineas: readonly LineaPresupuesto[],
  periodos: readonly Periodo[],
): Asignacion[] {
  return lineas.flatMap((l) => repartirLinea(l, periodos))
}
