import { describe, expect, it } from 'vitest'
import {
  centavos,
  deDolares,
  formatear,
  formatearRedondo,
  repartir,
  repartirParejo,
  suma,
} from './index'

describe('centavos', () => {
  it('rechaza decimales: el dinero va en enteros', () => {
    expect(() => centavos(12.5)).toThrow(RangeError)
  })

  it('convierte dólares redondeando al centavo', () => {
    expect(deDolares(12.345)).toBe(1235)
    expect(deDolares(0.1 + 0.2)).toBe(30)
  })
})

describe('repartir', () => {
  it('reparte lo que no divide parejo sin perder centavos', () => {
    const partes = repartirParejo(centavos(100), 3)
    expect(partes).toEqual([34, 33, 33])
    expect(suma(partes)).toBe(100)
  })

  it('respeta los pesos', () => {
    // $300 entre dos periodos, uno con el doble de peso que el otro.
    expect(repartir(centavos(30000), [2, 1])).toEqual([20000, 10000])
  })

  it('no le da nada a un peso en cero', () => {
    expect(repartir(centavos(1000), [1, 0, 1])).toEqual([500, 0, 500])
  })

  it('reparte parejo si todos los pesos son cero', () => {
    const partes = repartir(centavos(1000), [0, 0, 0])
    expect(partes).toEqual([334, 333, 333])
    expect(suma(partes)).toBe(1000)
  })

  it('rompe los empates por posición, no al azar', () => {
    expect(repartir(centavos(10), [1, 1, 1, 1])).toEqual([3, 3, 2, 2])
    expect(repartir(centavos(10), [1, 1, 1, 1])).toEqual(repartir(centavos(10), [1, 1, 1, 1]))
  })

  it('maneja montos negativos como el espejo del positivo', () => {
    expect(repartir(centavos(-100), [1, 1, 1])).toEqual([-34, -33, -33])
  })

  it('aguanta montos que se salen del entero seguro al multiplicar', () => {
    // $10 millones repartidos con pesos grandes: el producto intermedio
    // pasa de 2^53 y reventaría en aritmética de punto flotante.
    const total = centavos(1_000_000_000)
    const partes = repartir(total, [999_999_999, 1])
    expect(suma(partes)).toBe(total)
  })

  it('no reparte entre nadie a menos que el monto sea cero', () => {
    expect(repartir(centavos(0), [])).toEqual([])
    expect(() => repartir(centavos(100), [])).toThrow(RangeError)
  })

  it('rechaza pesos negativos o fraccionarios', () => {
    expect(() => repartir(centavos(100), [1, -1])).toThrow(RangeError)
    expect(() => repartir(centavos(100), [1.5, 1])).toThrow(RangeError)
  })

  it('propiedad: la suma del reparto siempre da el total exacto', () => {
    for (let total = 0; total <= 400; total += 7) {
      for (let n = 1; n <= 9; n++) {
        const pesos = Array.from({ length: n }, (_, i) => (i * total) % 13)
        expect(suma(repartir(centavos(total), pesos))).toBe(total)
      }
    }
  })
})

describe('formato', () => {
  it('solo se usa al presentar', () => {
    expect(formatear(centavos(124000))).toBe('$1,240.00')
    expect(formatearRedondo(centavos(6500))).toBe('$65')
  })
})

describe('el espejo del reparto semanal', () => {
  // Los mismos números están fijados en supabase/pruebas/06-semanas.sql: el
  // reparto vive en dos lados —el cliente no puede correr durante una
  // migración— y si un lado cambia de método, el otro lo delata. Los pesos
  // son los días de las semanas del mes: agosto [7,7,7,7,3], febrero de 28
  // [7,7,7,7].
  it('da lo mismo que reparto_semanal en SQL, centavo por centavo', () => {
    expect(repartir(centavos(100003), [7, 7, 7, 7, 3])).toEqual([22582, 22581, 22581, 22581, 9678])
    expect(repartir(centavos(100003), [7, 7, 7, 7])).toEqual([25001, 25001, 25001, 25000])
  })
})
