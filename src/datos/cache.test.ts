import { describe, expect, it } from 'vitest'
import { VIGENCIA_MS, llaveDe, sirve } from './cache'
import type { Copia } from './cache'

const AHORA = Date.UTC(2026, 7, 6)

function copia(guardadoEn: number): Copia {
  return { presupuesto: {} as Copia['presupuesto'], guardadoEn }
}

describe('la llave de la copia', () => {
  it('separa por usuario y por mes', () => {
    expect(llaveDe('u1', { anio: 2026, mes: 8 })).toBe('u1:2026-08')
    expect(llaveDe('u2', { anio: 2026, mes: 8 })).not.toBe(llaveDe('u1', { anio: 2026, mes: 8 }))
  })

  it('rellena el mes con cero, para que no choquen enero y octubre', () => {
    // Sin el cero, '2026-1' y '2026-10' se ordenarían y compararían mal.
    expect(llaveDe('u1', { anio: 2026, mes: 1 })).toBe('u1:2026-01')
    expect(llaveDe('u1', { anio: 2026, mes: 10 })).toBe('u1:2026-10')
  })
})

describe('si una copia todavía sirve', () => {
  it('una recién guardada sirve', () => {
    expect(sirve(copia(AHORA), AHORA)).toBe(true)
  })

  it('una de ayer sirve', () => {
    expect(sirve(copia(AHORA - 24 * 60 * 60 * 1000), AHORA)).toBe(true)
  })

  it('una más vieja que la vigencia se descarta', () => {
    // Un dato viejo con cara de fresco es peor que no tener dato: el usuario
    // decidiría si le alcanza con números de hace un mes.
    expect(sirve(copia(AHORA - VIGENCIA_MS - 1), AHORA)).toBe(false)
  })

  it('justo en el límite ya no sirve', () => {
    expect(sirve(copia(AHORA - VIGENCIA_MS), AHORA)).toBe(false)
  })

  it('sin copia, nada que enseñar', () => {
    expect(sirve(null, AHORA)).toBe(false)
  })

  it('una guardada en el futuro sirve: el reloj del teléfono puede ir atrasado', () => {
    // Pasa de verdad cuando alguien corrige la hora del aparato. Tirar la copia
    // por eso dejaría al usuario sin nada, y el mal es menor al revés.
    expect(sirve(copia(AHORA + 60_000), AHORA)).toBe(true)
  })
})
