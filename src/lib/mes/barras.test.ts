import { describe, expect, it } from 'vitest'
import { alcanzables, alturas } from './barras'

describe('las barras del selector de mes', () => {
  it('el mes más grande llena la barra', () => {
    expect(alturas([50000, 100000])).toEqual([50, 100])
  })

  it('un solo mes también llena', () => {
    expect(alturas([684000])).toEqual([100])
  })

  // Sin esto, un mes flojo junto a uno bueno da menos de un píxel y se lee
  // como "ese mes no hubo nada", que no es lo que pasó.
  it('un mes chiquito se sigue viendo', () => {
    const [chico, grande] = alturas([4000, 684000])
    expect(chico).toBe(6)
    expect(grande).toBe(100)
  })

  // La barra dice cuánto, no de qué lado. Pasarse por $300 se ve igual de
  // alto que sobrar $300 — el color y el número dicen cuál es cuál.
  it('pasarse se ve igual de alto que sobrar lo mismo', () => {
    expect(alturas([-30000, 30000])).toEqual([100, 100])
  })

  it('cero es cero: esa barra no se dibuja', () => {
    expect(alturas([0, 100000])).toEqual([0, 100])
  })

  it('un mes recién abierto, con todo en cero, no revienta ni inventa altura', () => {
    expect(alturas([0, 0, 0])).toEqual([0, 0, 0])
  })

  it('sin meses no hay barras', () => {
    expect(alturas([])).toEqual([])
  })
})

describe('hasta dónde se puede mirar atrás', () => {
  const meses = ['may', 'jun', 'jul', 'ago']
  const esAgosto = (m: string) => m === 'ago'

  it('premium llega a todos', () => {
    expect(alcanzables(meses, esAgosto, true)).toEqual([true, true, true, true])
  })

  // "Historial: mes actual y el anterior" — sección 10 del SPEC.
  it('gratis llega al mes actual y al anterior, no más', () => {
    expect(alcanzables(meses, esAgosto, false)).toEqual([false, false, true, true])
  })

  it('con un solo mes, ese se alcanza', () => {
    expect(alcanzables(['ago'], esAgosto, false)).toEqual([true])
  })

  it('con dos, los dos', () => {
    expect(alcanzables(['jul', 'ago'], esAgosto, false)).toEqual([true, true])
  })

  it('sin meses no hay nada que alcanzar', () => {
    expect(alcanzables([], esAgosto, false)).toEqual([])
  })
})
