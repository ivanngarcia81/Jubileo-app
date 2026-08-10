import { describe, expect, it } from 'vitest'
import {
  CLAVES_DE_CATEGORIA,
  NOMBRE_DE_CLAVE,
  esClaveDeCategoria,
  normalizar,
  sugerirIcono,
} from './claves'

/**
 * Los mismos casos están fijados en `supabase/pruebas/07-iconos.sql`: la
 * migración siembra con esta lógica escrita en SQL, y no hay forma de que
 * compartan el código. Si un lado cambia de criterio, el otro lo delata.
 */

describe('la sugerencia por nombre', () => {
  it('reconoce lo que la gente escribe de verdad', () => {
    expect(sugerirIcono('Comida')).toBe('comida')
    expect(sugerirIcono('Supermercado')).toBe('comida')
    expect(sugerirIcono('Despensa del mes')).toBe('comida')
    expect(sugerirIcono('Gasolina')).toBe('transporte')
    expect(sugerirIcono('Pagos del carro')).toBe('transporte')
    expect(sugerirIcono('Uber al trabajo')).toBe('transporte')
    expect(sugerirIcono('Renta')).toBe('casa')
    // Las cuatro maneras de decir el mismo recibo. "Electricidad" salió con el
    // rombo genérico en producción hasta 0009: `luz` estaba, la otra no.
    expect(sugerirIcono('Luz')).toBe('servicios')
    expect(sugerirIcono('Electricidad')).toBe('servicios')
    expect(sugerirIcono('Cable e internet')).toBe('servicios')
    expect(sugerirIcono('Plan celular')).toBe('servicios')
    expect(sugerirIcono('Hipoteca')).toBe('casa')
    expect(sugerirIcono('Luz y agua')).toBe('servicios')
    expect(sugerirIcono('Internet')).toBe('servicios')
  })

  it('no se le escapa por los acentos ni por las mayúsculas', () => {
    // "Teléfono" y "telefono" tienen que caer en el mismo lugar: depende del
    // teclado que traiga el usuario, no de lo que quiso decir.
    expect(sugerirIcono('Teléfono')).toBe('servicios')
    expect(sugerirIcono('TELEFONO')).toBe('servicios')
    expect(sugerirIcono('Súper')).toBe('comida')
    expect(normalizar('Teléfono')).toBe('telefono')
    expect(normalizar('Súper')).toBe('super')
  })

  it('el orden manda: "Seguro del carro" es un seguro, no un coche', () => {
    // El nombre trae las dos palabras. Sin un orden fijo, el resultado
    // dependería de cómo esté escrito el objeto, que es como se rompen las
    // cosas en silencio.
    expect(sugerirIcono('Seguro del carro')).toBe('seguro')
    expect(sugerirIcono('Seguro de la casa')).toBe('seguro')
  })

  it('lo que no se parece a nada se queda sin icono, y manda el grupo', () => {
    expect(sugerirIcono('Diezmo y ofrenda')).toBeNull()
    expect(sugerirIcono('Personal')).toBeNull()
    expect(sugerirIcono('Remesa a la familia')).toBeNull()
    expect(sugerirIcono('')).toBeNull()
  })
})

describe('las claves que se pueden elegir', () => {
  it('son dieciséis, sin repetir', () => {
    expect(CLAVES_DE_CATEGORIA).toHaveLength(16)
    expect(new Set(CLAVES_DE_CATEGORIA).size).toBe(16)
  })

  it('todas tienen nombre en español para el lector de pantalla', () => {
    for (const clave of CLAVES_DE_CATEGORIA) {
      expect(NOMBRE_DE_CLAVE[clave]).toBeTruthy()
    }
  })

  it('todo lo que sugiere el nombre se puede elegir a mano', () => {
    // Si la siembra pudiera poner un icono que la rejilla no ofrece, el
    // usuario vería uno que no puede cambiar ni volver a escoger.
    for (const nombre of ['Comida', 'Gasolina', 'Renta', 'Luz', 'Seguro']) {
      const sugerida = sugerirIcono(nombre)!
      expect(CLAVES_DE_CATEGORIA).toContain(sugerida)
    }
  })

  it('rechaza lo que no es una clave, que es lo que revisa el CHECK', () => {
    expect(esClaveDeCategoria('comida')).toBe(true)
    expect(esClaveDeCategoria('bitcoin')).toBe(false)
    expect(esClaveDeCategoria('')).toBe(false)
    // `fijo`, `variable` e `ingreso` salen del grupo: no se eligen a mano.
    expect(esClaveDeCategoria('fijo')).toBe(false)
    expect(esClaveDeCategoria('ingreso')).toBe(false)
  })
})

/**
 * `gas` no está en la lista, y tiene que seguir sin estar. La comparación es
 * por trozo y `servicios` se prueba antes que `transporte`: el día que alguien
 * lo agregue "por completar la lista", la gasolina de todo el mundo cambia de
 * icono sin que nadie lo pida. Esta prueba es el que lo delata.
 */
describe('la trampa de gas', () => {
  it('la gasolina sigue siendo transporte', () => {
    expect(sugerirIcono('Gasolina')).toBe('transporte')
    expect(sugerirIcono('Gasolina del mes')).toBe('transporte')
  })

  it('y "gas" a secas no sugiere servicios: no está, y por eso no cae ahí', () => {
    // Cae en transporte por el trozo de "gasolina"... no: "gas" no contiene
    // "gasolina". No se parece a nada, así que manda el grupo.
    expect(sugerirIcono('Gas')).toBe(null)
  })
})
