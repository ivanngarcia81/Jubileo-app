import { describe, expect, it } from 'vitest'
import { centavos, suma } from '../dinero'
import { fecha } from '../fecha'
import {
  type LineaPresupuesto,
  cambiarFrecuencia,
  generarPeriodos,
  puedeCerrarMes,
  repartirMes,
  validarMes,
} from './index'
import type { ConfigPago, MesObjetivo } from './tipos'

/**
 * PRUEBA EXIGIDA 5 — cambiar de `semanal` a `cada_dos_semanas` con el
 * presupuesto ya armado: los montos mensuales quedan idénticos.
 *
 * Cambiar de frecuencia no rehace el presupuesto. Se regeneran los periodos
 * y se re-reparte; el trabajo de armar el mes no se pierde.
 */

const LINEAS: LineaPresupuesto[] = [
  { id: 'renta', nombre: 'Renta', montoMensualCents: centavos(90000) },
  { id: 'diezmo', nombre: 'Diezmo y ofrenda', montoMensualCents: centavos(36800) },
  { id: 'comida', nombre: 'Comida', montoMensualCents: centavos(60000) },
  { id: 'luz', nombre: 'Luz y agua', montoMensualCents: centavos(13001) },
  { id: 'gasolina', nombre: 'Gasolina', montoMensualCents: centavos(12000) },
]

const MARZO: MesObjetivo = { anio: 2026, mes: 3 } // 5 semanas con esta ancla
const SEMANAL: ConfigPago = { frecuencia: 'semanal', fechaAncla: fecha('2026-01-05') }
const QUINCENAL: ConfigPago = { frecuencia: 'cada_dos_semanas', fechaAncla: fecha('2026-01-05') }

const totalPorLinea = (asignaciones: readonly { lineaPresupuestoId: string; montoCents: number }[]) =>
  Object.fromEntries(
    LINEAS.map((l) => [
      l.id,
      suma(
        asignaciones
          .filter((a) => a.lineaPresupuestoId === l.id)
          .map((a) => centavos(a.montoCents)),
      ),
    ]),
  )

describe('cambiar de frecuencia', () => {
  it('deja los montos mensuales idénticos y la invariante intacta', () => {
    const periodosAntes = generarPeriodos(SEMANAL, MARZO)
    const antes = repartirMes(LINEAS, periodosAntes)
    expect(periodosAntes).toHaveLength(5)
    expect(validarMes(LINEAS, antes).cuadra).toBe(true)

    const despues = cambiarFrecuencia(LINEAS, QUINCENAL, MARZO)

    expect(despues.periodos).toHaveLength(3) // marzo trae 3 cheques con esta ancla
    expect(totalPorLinea(despues.asignaciones)).toEqual(totalPorLinea(antes))
    expect(validarMes(LINEAS, despues.asignaciones).cuadra).toBe(true)
    expect(puedeCerrarMes(LINEAS, despues.asignaciones)).toBe(true)
  })

  it('no toca el monto mensual de ninguna línea', () => {
    const { asignaciones } = cambiarFrecuencia(LINEAS, QUINCENAL, MARZO)
    for (const linea of LINEAS) {
      const suyas = asignaciones.filter((a) => a.lineaPresupuestoId === linea.id)
      expect(suma(suyas.map((a) => a.montoCents))).toBe(linea.montoMensualCents)
    }
  })

  it('el cheque extra sigue fuera del reparto después del cambio', () => {
    // Marzo de 2026 es mes de 3 cheques con esta ancla.
    const { periodos, asignaciones } = cambiarFrecuencia(LINEAS, QUINCENAL, MARZO)
    expect(periodos[2]!.esExtra).toBe(true)
    expect(asignaciones.some((a) => a.periodoNumero === 3)).toBe(false)
  })

  it('funciona en las dos direcciones y aguanta ida y vuelta', () => {
    const aQuincenal = cambiarFrecuencia(LINEAS, QUINCENAL, MARZO)
    const deVuelta = cambiarFrecuencia(LINEAS, SEMANAL, MARZO)

    expect(deVuelta.periodos).toHaveLength(5)
    expect(totalPorLinea(deVuelta.asignaciones)).toEqual(totalPorLinea(aQuincenal.asignaciones))
    expect(validarMes(LINEAS, deVuelta.asignaciones).cuadra).toBe(true)
  })

  it('sirve para cualquier par de frecuencias', () => {
    const destinos: ConfigPago[] = [
      SEMANAL,
      QUINCENAL,
      { frecuencia: 'mensual', fechaAncla: fecha('2026-01-05') },
      { frecuencia: 'dos_veces_al_mes', fechaAncla: fecha('2026-01-05'), diasPago: [1, 15] },
      { frecuencia: 'variable', fechaAncla: fecha('2026-01-05') },
    ]
    for (const destino of destinos) {
      const { asignaciones } = cambiarFrecuencia(LINEAS, destino, MARZO)
      expect(validarMes(LINEAS, asignaciones).cuadra).toBe(true)
    }
  })

  it('se puede cambiar de frecuencia en cualquier mes del año sin descuadrar', () => {
    for (let mes = 1; mes <= 12; mes++) {
      const { asignaciones } = cambiarFrecuencia(LINEAS, QUINCENAL, { anio: 2026, mes })
      expect(puedeCerrarMes(LINEAS, asignaciones)).toBe(true)
    }
  })
})
