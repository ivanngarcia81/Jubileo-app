import { describe, expect, it } from 'vitest'
import { revisarConfiguracion } from './configuracion'

// Valores inventados a propósito: ni la URL ni la llave de un proyecto de
// verdad entran a un commit, aunque la llave pública se pueda publicar.
const URL = 'https://ejemplo.supabase.co'
const LLAVE = 'sb_publishable_deMentiras'

describe('revisar la configuración del servidor', () => {
  it('acepta el nombre viejo de la llave', () => {
    const r = revisarConfiguracion({ url: URL, anonKey: LLAVE })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.configuracion).toEqual({ url: URL, llave: LLAVE })
  })

  it('acepta el nombre nuevo, que es el que da el panel de Supabase', () => {
    const r = revisarConfiguracion({ url: URL, publishableKey: LLAVE })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.configuracion.llave).toBe(LLAVE)
  })

  it('si vienen las dos, gana la del nombre viejo', () => {
    const r = revisarConfiguracion({ url: URL, anonKey: 'vieja', publishableKey: 'nueva' })
    expect(r.ok && r.configuracion.llave).toBe('vieja')
  })

  it('recorta los espacios de alrededor', () => {
    const r = revisarConfiguracion({ url: `  ${URL}\n`, anonKey: ` ${LLAVE} ` })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.configuracion).toEqual({ url: URL, llave: LLAVE })
  })

  it('sin nada configurado, no es un error: la app corre con el ejemplo', () => {
    const r = revisarConfiguracion({})
    expect(r.ok).toBe(false)
    expect(r).toHaveProperty('sinConfigurar', true)
  })

  it('con la URL pero sin llave, sí es un error y dice cuál falta', () => {
    const r = revisarConfiguracion({ url: URL })
    expect(r.ok).toBe(false)
    expect(r).not.toHaveProperty('sinConfigurar')
    if (!r.ok) expect(r.motivo).toContain('VITE_SUPABASE_ANON_KEY')
  })

  describe('el bloque completo pegado en un solo campo', () => {
    // Esto pasó de verdad: el panel Connect de Supabase entrega dos renglones
    // y se pegaron enteros en el campo de la llave. La app arrancó como si
    // nada y falló hasta el momento de mandar el correo, con un encabezado
    // HTTP de doscientos caracteres como único mensaje.
    const BLOQUE = `VITE_SUPABASE_URL=${URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${LLAVE}`

    it('se detecta en la llave', () => {
      const r = revisarConfiguracion({ url: URL, anonKey: BLOQUE })
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.motivo).toContain('bloque completo')
        expect(r.motivo).toContain('Key')
        expect(r.motivo).toContain('Value')
      }
    })

    it('se detecta en la URL', () => {
      const r = revisarConfiguracion({ url: BLOQUE, anonKey: LLAVE })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.motivo).toContain('bloque completo')
    })

    it('también cuando solo se pegó el nombre y el valor de una', () => {
      const r = revisarConfiguracion({ url: URL, anonKey: `VITE_SUPABASE_ANON_KEY=${LLAVE}` })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.motivo).toContain('bloque completo')
    })
  })

  it('rechaza una dirección que no sea https', () => {
    for (const mala of ['ejemplo.supabase.co', 'http://ejemplo.supabase.co']) {
      const r = revisarConfiguracion({ url: mala, anonKey: LLAVE })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.motivo).toContain('https://')
    }
  })

  it('una llave con formato raro pero sin espacios ni = sí pasa', () => {
    // No se valida el formato de la llave a propósito: Supabase ya cambió el
    // suyo una vez y la app no debería romperse cuando lo vuelva a cambiar.
    const r = revisarConfiguracion({ url: URL, anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc' })
    expect(r.ok).toBe(true)
  })
})
