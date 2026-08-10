import { describe, expect, it } from 'vitest'
import { centavos } from '../lib/dinero'
import { FAMILIA_POR_CLAVE, FAMILIAS, claseDeQueda, colorDeSobre, porcentaje } from './base'
import { CLAVES_DE_CATEGORIA } from '../lib/iconos'

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

/**
 * La cifra que queda es la única con color. Su regla se deriva de la de las
 * barras, así que lo que se prueba aquí es la traducción: que los tres estados
 * lleguen enteros al texto y que ninguno se quede sin clase.
 */
describe('el color de la cifra que queda', () => {
  const clase = (gastado: number, planeado: number) =>
    claseDeQueda(centavos(gastado), centavos(planeado))

  it('teal mientras vas bien', () => {
    expect(clase(0, 20000)).toBe('text-teal-osc')
    expect(clase(15199, 20000)).toBe('text-teal-osc')
  })

  it('ámbar del 80% para arriba, mientras no llegues', () => {
    expect(clase(16000, 20000)).toBe('text-ambar')
    expect(clase(19999, 20000)).toBe('text-ambar')
  })

  it('cuadrar al centavo sigue siendo acertar', () => {
    expect(clase(20000, 20000)).toBe('text-teal-osc')
  })

  it('rojo solo cuando ya te pasaste', () => {
    expect(clase(20001, 20000)).toBe('text-rojo')
  })

  it('dice lo mismo que la barra, siempre', () => {
    // La prueba de que no se pueden separar: si alguien mueve el 80% en una
    // sola de las dos, esto revienta.
    const equivalente: Record<string, string> = {
      'var(--teal)': 'text-teal-osc',
      'var(--ambar)': 'text-ambar',
      'var(--rojo)': 'text-rojo',
    }
    for (let gastado = 0; gastado <= 30000; gastado += 137) {
      expect(clase(gastado, 20000)).toBe(
        equivalente[colorDeSobre(centavos(gastado), centavos(20000))],
      )
    }
  })
})

/**
 * El color de categoría dice *qué es*; el de estado, *cómo va*. Que no
 * compartan tinta es lo que sostiene la regla 4: si una categoría fuera ámbar,
 * la bandera de semana apretada dejaría de querer decir algo, y el día que el
 * usuario de verdad se pase, el rojo ya no lo va a leer.
 *
 * Es una regla que se rompe sola: el día que alguien busque un octavo color
 * bonito, el ámbar es el primero que va a probar.
 */
describe('la paleta de categorías', () => {
  it('no gasta la tinta del ámbar ni la del rojo', () => {
    for (const [familia, clases] of Object.entries(FAMILIAS)) {
      expect(clases, `la familia "${familia}"`).not.toMatch(/ambar|rojo/)
    }
  })

  it('toda categoría de la rejilla tiene su familia', () => {
    // Sin esto, una clave nueva saldría con `undefined` de clase y la píldora
    // se dibujaría transparente sin que nadie lo note.
    for (const clave of CLAVES_DE_CATEGORIA) {
      expect(FAMILIA_POR_CLAVE[clave], clave).toBeTruthy()
      expect(FAMILIAS[FAMILIA_POR_CLAVE[clave]], clave).toBeTruthy()
    }
  })

  it('las que más aparecen en una lista no comparten familia', () => {
    // Comida, transporte, los recibos, la salud y la casa son las que llenan
    // una lista de movimientos: si dos de ellas cayeran en el mismo color, el
    // color dejaría de servir para lo único que sirve, que es reconocer.
    const cotidianas = ['comida', 'transporte', 'servicios', 'salud', 'casa'] as const
    const familias = cotidianas.map((c) => FAMILIA_POR_CLAVE[c])
    expect(new Set(familias).size).toBe(cotidianas.length)
  })
})
