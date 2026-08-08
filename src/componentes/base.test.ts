import { describe, expect, it } from 'vitest'
import { centavos } from '../lib/dinero'
import { colorDeSobre, porcentaje } from './base'

/**
 * La regla 4 de los tokens escrita como prueba. Es una regla de las que se
 * rompen sin que nadie se dé cuenta: el rojo de más no truena nada, solo deja
 * de significar algo.
 */
describe('el color de una barra según lo gastado', () => {
  const color = (gastado: number, presupuesto: number) =>
    colorDeSobre(centavos(gastado), centavos(presupuesto))

  it('teal mientras vas por debajo del 80%', () => {
    expect(color(0, 20000)).toBe('var(--teal)')
    expect(color(15199, 20000)).toBe('var(--teal)')
  })

  it('ámbar del 80% para arriba, mientras no llegues', () => {
    expect(color(16000, 20000)).toBe('var(--ambar)')
    expect(color(19999, 20000)).toBe('var(--ambar)')
  })

  it('cuadrar al centavo es acertar, no pasarse: teal, no rojo', () => {
    // La renta pagada completa llega aquí todos los meses. En rojo, el rojo
    // deja de querer decir nada.
    expect(color(20000, 20000)).toBe('var(--teal)')
  })

  it('rojo solo pasado el 100%', () => {
    expect(color(20001, 20000)).toBe('var(--rojo)')
    expect(color(45000, 20000)).toBe('var(--rojo)')
  })

  it('sin presupuesto no hay de qué pasarse', () => {
    // Una categoría recién creada, todavía sin monto. Dividir entre cero daría
    // Infinity y la pintaría de rojo el día que nace.
    expect(color(0, 0)).toBe('var(--teal)')
    expect(color(5000, 0)).toBe('var(--teal)')
  })
})

describe('el porcentaje que dibuja la barra', () => {
  it('redondea y aguanta el cero', () => {
    expect(porcentaje(centavos(4020), centavos(4500))).toBe(89)
    expect(porcentaje(centavos(0), centavos(4500))).toBe(0)
    expect(porcentaje(centavos(4500), centavos(0))).toBe(0)
  })
})
