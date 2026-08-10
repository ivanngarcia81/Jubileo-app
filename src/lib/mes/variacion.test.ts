import { describe, expect, it } from 'vitest'
import { centavos } from '../dinero'
import { type MesComparable, variacionContraElMesPasado } from './variacion'

const mes = (anio: number, m: number, entra: number, sale: number): MesComparable => ({
  anio,
  mes: m,
  etiqueta: `${m}/${anio}`,
  entraCents: centavos(entra),
  saleCents: centavos(sale),
})

const AGOSTO = [mes(2026, 7, 300000, 280000), mes(2026, 8, 368000, 250000)]

describe('la variación contra el mes pasado', () => {
  it('dice cuánto más entró', () => {
    const v = variacionContraElMesPasado(AGOSTO, 2026, 8, 'entra')
    expect(v?.diferenciaCents).toBe(68000)
    expect(v?.etiquetaAnterior).toBe('7/2026')
  })

  it('y cuánto menos salió, en negativo', () => {
    expect(variacionContraElMesPasado(AGOSTO, 2026, 8, 'sale')?.diferenciaCents).toBe(-30000)
  })

  it('sin mes anterior no hay comparación', () => {
    // El primer mes de una cuenta nueva. "+$0" diría que no cambió nada, cuando
    // la verdad es que no hay contra qué medir.
    expect(variacionContraElMesPasado([mes(2026, 8, 368000, 250000)], 2026, 8, 'entra')).toBe(null)
  })

  it('cruza el año hacia atrás', () => {
    const meses = [mes(2025, 12, 100000, 90000), mes(2026, 1, 120000, 90000)]
    expect(variacionContraElMesPasado(meses, 2026, 1, 'entra')?.diferenciaCents).toBe(20000)
  })

  it('un hueco no convierte a dos meses atrás en "el mes pasado"', () => {
    // Alguien que no abrió septiembre. Comparar octubre contra agosto llamándolo
    // el mes pasado es mentir con precisión.
    const meses = [mes(2026, 8, 300000, 200000), mes(2026, 10, 400000, 200000)]
    expect(variacionContraElMesPasado(meses, 2026, 10, 'entra')).toBe(null)
  })

  it('sin cambio no dibuja nada', () => {
    const meses = [mes(2026, 7, 300000, 250000), mes(2026, 8, 300000, 250000)]
    expect(variacionContraElMesPasado(meses, 2026, 8, 'entra')).toBe(null)
  })

  it('un mes anterior en cero no da comparación útil', () => {
    // Un mes que se abrió y no se usó. "Subió $3,000" contra la nada no dice
    // nada de cómo va este.
    const meses = [mes(2026, 7, 0, 0), mes(2026, 8, 300000, 250000)]
    expect(variacionContraElMesPasado(meses, 2026, 8, 'entra')).toBe(null)
  })

  it('si el mes que se mira no está en la lista, no inventa', () => {
    expect(variacionContraElMesPasado(AGOSTO, 2026, 12, 'entra')).toBe(null)
  })
})
