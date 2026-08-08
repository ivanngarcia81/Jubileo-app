import { describe, expect, it } from 'vitest'
import { centavos } from '../dinero'
import { type LineaDelMes, loQueSeArrastra } from './arrastre'

const linea = (categoriaId: string, dolares: number): LineaDelMes => ({
  categoriaId,
  montoMensualCents: centavos(Math.round(dolares * 100)),
})

describe('lo que se arrastra al mes nuevo', () => {
  const activas = new Set(['renta', 'comida', 'gasolina'])

  it('se lleva los montos tal cual, sin redondear ni reajustar', () => {
    const { lineas } = loQueSeArrastra([linea('renta', 1200), linea('comida', 600.55)], activas)
    expect(lineas.map((l) => l.montoMensualCents)).toEqual([120000, 60055])
  })

  it('suma lo que va a costar el mes nuevo, para poder enseñarlo antes de crearlo', () => {
    const { totalMensualCents } = loQueSeArrastra(
      [linea('renta', 1200), linea('comida', 600.55), linea('gasolina', 150)],
      activas,
    )
    expect(totalMensualCents).toBe(120000 + 60055 + 15000)
  })

  // Una línea en cero no es lo mismo que una línea que no existe: es una
  // decisión tomada. El mes nuevo tiene que nacer idéntico al que se cerró.
  it('arrastra también los sobres en cero', () => {
    const { lineas } = loQueSeArrastra([linea('renta', 1200), linea('comida', 0)], activas)
    expect(lineas).toHaveLength(2)
    expect(lineas[1]?.montoMensualCents).toBe(0)
  })

  it('deja fuera lo que ya no está activo, y lo dice', () => {
    const { lineas, seQuedaronFuera } = loQueSeArrastra(
      [linea('renta', 1200), linea('tarjeta-vieja', 300), linea('comida', 600)],
      activas,
    )
    expect(lineas.map((l) => l.categoriaId)).toEqual(['renta', 'comida'])
    expect(seQuedaronFuera).toEqual(['tarjeta-vieja'])
  })

  // Si el sobre quitado siguiera contando, el mes nuevo nacería descuadrado y
  // el usuario no vería por qué: la categoría ya no se enseña en ningún lado.
  it('lo que se queda fuera tampoco cuenta en el total', () => {
    const { totalMensualCents } = loQueSeArrastra(
      [linea('renta', 1200), linea('tarjeta-vieja', 300)],
      activas,
    )
    expect(totalMensualCents).toBe(120000)
  })

  it('un mes anterior vacío no arrastra nada, y no revienta', () => {
    expect(loQueSeArrastra([], activas)).toEqual({
      lineas: [],
      totalMensualCents: 0,
      seQuedaronFuera: [],
    })
  })
})
