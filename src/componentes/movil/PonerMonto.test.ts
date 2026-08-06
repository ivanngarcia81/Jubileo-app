import { describe, expect, it } from 'vitest'
import { aCentavos } from './PonerMonto'

describe('lo que se teclea en el campo de monto', () => {
  it('convierte dólares a centavos enteros', () => {
    expect(aCentavos('600')).toBe(60000)
    expect(aCentavos('600.50')).toBe(60050)
    expect(aCentavos('0.07')).toBe(7)
  })

  it('no pierde el centavo del clásico 19.99', () => {
    // 19.99 * 100 en punto flotante da 1998.9999999999998. Truncar dejaría
    // $19.98, y ese centavo desaparecido descuadra el mes.
    expect(aCentavos('19.99')).toBe(1999)
    expect(aCentavos('1234.56')).toBe(123456)
  })

  it('acepta la coma decimal, que es como teclea medio mundo', () => {
    expect(aCentavos('600,50')).toBe(60050)
  })

  it('acepta comas de miles', () => {
    expect(aCentavos('1,240')).toBe(124000)
    expect(aCentavos('1,240.75')).toBe(124075)
  })

  it('recorta los espacios', () => {
    expect(aCentavos('  600  ')).toBe(60000)
  })

  it('el cero es un monto válido: es como se vacía una categoría', () => {
    expect(aCentavos('0')).toBe(0)
    expect(aCentavos('0.00')).toBe(0)
  })

  it('rechaza lo que no es un monto en vez de adivinar', () => {
    for (const malo of ['', '   ', '.', 'abc', '12abc', '1.2.3', '-5', '$600']) {
      expect(aCentavos(malo)).toBeNull()
    }
  })

  it('un monto a medio teclear no rompe nada', () => {
    // El campo se lee en cada tecla: "6." pasa por aquí camino a "6.50".
    expect(aCentavos('6.')).toBe(600)
    expect(aCentavos('.5')).toBe(50)
  })
})
