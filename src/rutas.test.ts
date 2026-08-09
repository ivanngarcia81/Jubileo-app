import { describe, expect, it } from 'vitest'
import { DESTINOS_ESCRITORIO, DESTINOS_MOVIL, ROTULO } from './componentes/rotulos'
import { RUTAS, type Ruta } from './rutas'

/**
 * El enrutador lee del `location.hash`, así que para probarlo hace falta
 * escribirlo. `useRuta` es un hook y arrastra React; lo que importa aquí es la
 * regla de lectura, y esa se puede aislar reimplementando las tres líneas que
 * la definen. Si esas tres líneas cambian en `rutas.ts` sin cambiar aquí, la
 * prueba deja de decir la verdad — por eso están escritas igual, y por eso el
 * caso de la mudanza es el que se comprueba en el navegador también.
 */
const MUDANZAS: Record<string, Ruta> = { semana: 'resumen' }
const RUTA_INICIAL: Ruta = 'resumen'

function rutaDe(hash: string): Ruta {
  const [camino = ''] = hash.replace(/^#\/?/, '').split('?')
  return (RUTAS as readonly string[]).includes(camino)
    ? (camino as Ruta)
    : (MUDANZAS[camino] ?? RUTA_INICIAL)
}

describe('las direcciones', () => {
  it('abre en el Dashboard cuando no dice nada', () => {
    expect(rutaDe('')).toBe('resumen')
    expect(rutaDe('#/')).toBe('resumen')
  })

  it('manda #/semana al Dashboard en vez de dejarlo caer por descarte', () => {
    // La diferencia importa aunque el resultado se parezca: quien tenga
    // #/semana clavado en la pantalla de inicio llega porque se lo prometimos,
    // no porque el enrutador no supo qué hacer con él.
    expect(rutaDe('#/semana')).toBe('resumen')
    expect(rutaDe('#/semana?semana=3')).toBe('resumen')
  })

  it('ya no reconoce semana como destino propio', () => {
    expect(RUTAS as readonly string[]).not.toContain('semana')
  })

  it('deja pasar las que sí existen, con y sin parámetro', () => {
    expect(rutaDe('#/mes')).toBe('mes')
    expect(rutaDe('#/mes?semana=4')).toBe('mes')
    expect(rutaDe('#/ajustes?pago=listo')).toBe('ajustes')
  })

  it('lo que no reconoce cae al Dashboard', () => {
    expect(rutaDe('#/loquesea')).toBe('resumen')
  })
})

describe('los rótulos', () => {
  it('nombra todas las rutas, sin sobrar ninguna', () => {
    expect(Object.keys(ROTULO).sort()).toEqual([...RUTAS].sort())
  })

  it('los cuatro de la píldora traen su nombre corto', () => {
    // Sin nombre corto, "Presupuesto mensual" no cabe en un cuarto del ancho
    // de un teléfono y el botón se rompe en silencio.
    for (const ruta of DESTINOS_MOVIL) expect(ROTULO[ruta].pildora).toBeTruthy()
  })

  it('el Dashboard es el primero en los dos marcos', () => {
    expect(DESTINOS_MOVIL[0]).toBe('resumen')
    expect(DESTINOS_ESCRITORIO[0]).toBe('resumen')
  })

  it('ningún destino de navegación se llama igual que otro', () => {
    const nombres = DESTINOS_ESCRITORIO.map((r) => ROTULO[r].pantalla)
    expect(new Set(nombres).size).toBe(nombres.length)
  })
})
