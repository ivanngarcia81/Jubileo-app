import { describe, expect, it } from 'vitest'
import { type Centavos, centavos, suma } from '../dinero'
import { fecha } from '../fecha'
import {
  type Asignacion,
  type LineaPresupuesto,
  explicarDescuadre,
  generarPeriodos,
  puedeCerrarMes,
  repartirLinea,
  repartirMes,
  validarLinea,
  validarMes,
} from './index'
import type { ConfigPago } from './tipos'

const LINEAS: LineaPresupuesto[] = [
  { id: 'renta', nombre: 'Renta', montoMensualCents: centavos(90000) },
  { id: 'diezmo', nombre: 'Diezmo y ofrenda', montoMensualCents: centavos(36800) },
  { id: 'comida', nombre: 'Comida', montoMensualCents: centavos(60000) },
  // Un monto que no divide parejo entre 2 ni entre 5: el caso interesante.
  { id: 'luz', nombre: 'Luz y agua', montoMensualCents: centavos(13001) },
]

const QUINCENAL: ConfigPago = { frecuencia: 'cada_dos_semanas', fechaAncla: fecha('2026-01-05') }

describe('la invariante de asignaciones', () => {
  it('un reparto recién hecho siempre cuadra', () => {
    const periodos = generarPeriodos(QUINCENAL, { anio: 2026, mes: 4 })
    const asignaciones = repartirMes(LINEAS, periodos)

    const estado = validarMes(LINEAS, asignaciones)
    expect(estado.cuadra).toBe(true)
    expect(estado.descuadradas).toEqual([])
    expect(puedeCerrarMes(LINEAS, asignaciones)).toBe(true)
  })

  it('reparte los centavos que no dividen parejo sin perder ninguno', () => {
    const periodos = generarPeriodos(QUINCENAL, { anio: 2026, mes: 4 })
    const luz = LINEAS[3]!
    const asignaciones = repartirLinea(luz, periodos)

    expect(asignaciones.map((a) => a.montoCents)).toEqual([6501, 6500])
    expect(suma(asignaciones.map((a) => a.montoCents))).toBe(luz.montoMensualCents)
  })

  it('el cheque extra no entra en el reparto', () => {
    // Agosto de 2026 trae 3 cheques con esta ancla.
    const periodos = generarPeriodos(QUINCENAL, { anio: 2026, mes: 8 })
    expect(periodos).toHaveLength(3)

    const asignaciones = repartirLinea(LINEAS[0]!, periodos)
    expect(asignaciones).toHaveLength(2)
    expect(asignaciones.map((a) => a.periodoNumero)).toEqual([1, 2])
    // Y el monto mensual completo sigue repartido entre los dos que sí entran.
    expect(suma(asignaciones.map((a) => a.montoCents))).toBe(centavos(90000))
  })

  it('reparte con pesos cuando el usuario no quiere partes iguales', () => {
    const periodos = generarPeriodos(QUINCENAL, { anio: 2026, mes: 4 })
    const renta = LINEAS[0]!
    // Toda la renta al primer cheque, porque vence el día 3.
    const asignaciones = repartirLinea(renta, periodos, [1, 0])
    expect(asignaciones.map((a) => a.montoCents)).toEqual([90000, 0])
    expect(validarLinea(renta, asignaciones).cuadra).toBe(true)
  })

  it('rechaza pesos que no coinciden con los periodos', () => {
    const periodos = generarPeriodos(QUINCENAL, { anio: 2026, mes: 4 })
    expect(() => repartirLinea(LINEAS[0]!, periodos, [1, 1, 1])).toThrow(RangeError)
  })
})

describe('el mes no se cierra si la invariante está rota', () => {
  // PRUEBA EXIGIDA 6.
  const periodos = generarPeriodos(QUINCENAL, { anio: 2026, mes: 4 })
  const renta = LINEAS[0]!

  it('rechaza el cierre cuando falta por repartir', () => {
    const asignaciones: Asignacion[] = [
      { lineaPresupuestoId: 'renta', periodoNumero: 1, montoCents: centavos(45000) },
      // Falta el segundo cheque: se quedaron $450 sin repartir.
    ]
    const estado = validarLinea(renta, asignaciones)
    expect(estado.cuadra).toBe(false)
    expect(estado.faltanteCents).toBe(45000)
    expect(explicarDescuadre(estado)).toBe('Te falta repartir $450.00 en Renta.')
    expect(puedeCerrarMes([renta], asignaciones)).toBe(false)
  })

  it('rechaza el cierre cuando se repartió de más', () => {
    const asignaciones: Asignacion[] = [
      { lineaPresupuestoId: 'renta', periodoNumero: 1, montoCents: centavos(45000) },
      { lineaPresupuestoId: 'renta', periodoNumero: 2, montoCents: centavos(45001) },
    ]
    const estado = validarLinea(renta, asignaciones)
    expect(estado.cuadra).toBe(false)
    expect(estado.faltanteCents).toBe(-1)
    expect(explicarDescuadre(estado)).toBe('Repartiste $0.01 de más en Renta.')
    expect(puedeCerrarMes([renta], asignaciones)).toBe(false)
  })

  it('rechaza el cierre cuando una línea no tiene ninguna asignación', () => {
    const asignaciones = repartirLinea(renta, periodos)
    // Las otras tres líneas se quedaron sin repartir.
    const estado = validarMes(LINEAS, asignaciones)
    expect(estado.cuadra).toBe(false)
    expect(estado.descuadradas.map((d) => d.lineaId)).toEqual(['diezmo', 'comida', 'luz'])
    expect(puedeCerrarMes(LINEAS, asignaciones)).toBe(false)
  })

  it('basta con que una sola línea no cuadre', () => {
    const buenas = repartirMes(LINEAS, periodos)
    const rotas = buenas.map((a, i) =>
      i === 0 ? { ...a, montoCents: centavos(a.montoCents - 1) as Centavos } : a,
    )
    expect(puedeCerrarMes(LINEAS, buenas)).toBe(true)
    expect(puedeCerrarMes(LINEAS, rotas)).toBe(false)
    expect(validarMes(LINEAS, rotas).descuadradas).toHaveLength(1)
  })

  it('cuando todo cuadra no hay nada que explicar', () => {
    const asignaciones = repartirLinea(renta, periodos)
    expect(explicarDescuadre(validarLinea(renta, asignaciones))).toBeNull()
  })
})
