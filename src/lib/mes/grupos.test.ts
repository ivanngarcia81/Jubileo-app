import { describe, expect, it } from 'vitest'
import {
  ABIERTOS_POR_OMISION,
  alternar,
  escribirAbiertos,
  leerAbiertos,
} from './grupos'

describe('qué grupos de El mes están abiertos', () => {
  it('sin nada guardado, abre los que se reparten a mano', () => {
    expect(leerAbiertos(null)).toEqual(['mayordomia', 'fijo', 'variable'])
  })

  it('lo guardado a mano o de otra versión no tumba la pantalla', () => {
    expect(leerAbiertos('{no es json')).toEqual([...ABIERTOS_POR_OMISION])
    expect(leerAbiertos('"fijo"')).toEqual([...ABIERTOS_POR_OMISION])
    expect(leerAbiertos('7')).toEqual([...ABIERTOS_POR_OMISION])
  })

  it('las claves que ya no existen se caen y las demás se quedan', () => {
    expect(leerAbiertos('["fijo","fondo","deuda",3]')).toEqual(['fijo', 'deuda'])
  })

  it('cerrar todos los grupos no es lo mismo que no haber elegido nada', () => {
    // El error fácil: `guardado || omisión` con una lista vacía vuelve a abrir
    // todo, y el usuario que los cerró los encuentra abiertos cada vez.
    expect(leerAbiertos('[]')).toEqual([])
  })

  it('lo que se escribe se vuelve a leer igual, y siempre en el mismo orden', () => {
    const escrito = escribirAbiertos(['deuda', 'mayordomia'])
    expect(escrito).toBe('["mayordomia","deuda"]')
    expect(leerAbiertos(escrito)).toEqual(['mayordomia', 'deuda'])
  })

  it('alternar abre lo cerrado y cierra lo abierto', () => {
    expect(alternar(['fijo'], 'deuda')).toEqual(['fijo', 'deuda'])
    expect(alternar(['fijo', 'deuda'], 'fijo')).toEqual(['deuda'])
  })
})
