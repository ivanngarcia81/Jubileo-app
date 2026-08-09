import { describe, expect, it } from 'vitest'
import { VIGENCIA_MS, llaveDe, sirve } from './cache'
import type { Copia } from './cache'

const AHORA = Date.UTC(2026, 7, 6)

/** El formato de hoy. Si sube en `cache.ts`, sube aquí y las pruebas lo dicen. */
const FORMATO = 2

// `null` y no `undefined` para decir "sin formato": pasarle `undefined` a un
// parámetro con valor por omisión activa el valor por omisión, y la prueba
// estaría comprobando lo contrario de lo que dice.
function copia(guardadoEn: number, formato: number | null = FORMATO): Copia {
  return {
    presupuesto: {} as Copia['presupuesto'],
    guardadoEn,
    ...(formato === null ? {} : { formato }),
  }
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

describe('el formato de la copia', () => {
  // La falla de verdad, en agosto de 2026: el eje semanal agregó `semanas` al
  // `Presupuesto`, y como la copia se enseña ANTES que la respuesta del
  // servidor, los teléfonos que traían una copia anterior abrieron en blanco.
  // La computadora no, porque ahí ya se había recargado. Una copia de otro
  // formato se tira; no cuesta nada, la siguiente respuesta la reescribe.
  it('una copia sin formato es de antes de que existiera: se descarta', () => {
    expect(sirve(copia(AHORA, null), AHORA)).toBe(false)
  })

  it('una de un formato viejo también', () => {
    expect(sirve(copia(AHORA, 1), AHORA)).toBe(false)
  })

  it('y una de un formato que este código no conoce: puede traer de más o de menos', () => {
    expect(sirve(copia(AHORA, 99), AHORA)).toBe(false)
  })

  it('la del formato de hoy, fresca, sí sirve', () => {
    expect(sirve(copia(AHORA, FORMATO), AHORA)).toBe(true)
  })
})
