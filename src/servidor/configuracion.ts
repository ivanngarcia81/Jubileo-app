/**
 * Leer y revisar la configuración del servidor.
 *
 * Vive aparte de `cliente.ts` y sin tocar `import.meta.env` para poder
 * probarse. Lo que se comprueba aquí no es teórico: es exactamente cómo se
 * rompió en producción la primera vez que alguien configuró la app.
 */

export interface Configuracion {
  url: string
  llave: string
}

export type RevisionConfig =
  | { ok: true; configuracion: Configuracion }
  | { ok: false; motivo: string }
  /** No hay servidor configurado: la app corre con datos de ejemplo. */
  | { ok: false; sinConfigurar: true; motivo: string }

const COMO_SE_LLENA =
  'Cada variable va en su propio renglón: el nombre en Key y solo el valor en Value.'

function limpiar(valor: string | undefined): string | undefined {
  const recortado = valor?.trim()
  return recortado === '' ? undefined : recortado
}

/**
 * ¿El valor trae pegado el nombre de la variable, o dos variables juntas?
 *
 * El panel *Connect* de Supabase entrega un bloque de dos renglones. Pegarlo
 * completo en un solo campo es el error más fácil de cometer, y la app lo
 * aceptaba sin chistar hasta soltar un encabezado HTTP con la llave adentro.
 */
function pareceBloquePegado(valor: string): boolean {
  return valor.includes('=') || /\s/.test(valor) || valor.startsWith('VITE_')
}

export function revisarConfiguracion(entorno: {
  url?: string | undefined
  anonKey?: string | undefined
  publishableKey?: string | undefined
}): RevisionConfig {
  const url = limpiar(entorno.url)
  // Supabase renombró la `anon key` a `publishable key`. Su panel entrega el
  // nombre nuevo; su documentación vieja y muchos proyectos, el viejo. Se
  // aceptan los dos para que copiar de donde sea simplemente funcione.
  const llave = limpiar(entorno.anonKey) ?? limpiar(entorno.publishableKey)

  if (!url && !llave) {
    return {
      ok: false,
      sinConfigurar: true,
      motivo: 'No hay servidor configurado. La app corre con datos de ejemplo.',
    }
  }

  if (!url) {
    return { ok: false, motivo: `Falta VITE_SUPABASE_URL. ${COMO_SE_LLENA}` }
  }
  if (!llave) {
    return { ok: false, motivo: `Falta VITE_SUPABASE_ANON_KEY. ${COMO_SE_LLENA}` }
  }

  if (pareceBloquePegado(url) || pareceBloquePegado(llave)) {
    return {
      ok: false,
      motivo: `Parece que pegaste el bloque completo en un solo campo. ${COMO_SE_LLENA}`,
    }
  }

  if (!url.startsWith('https://')) {
    return {
      ok: false,
      motivo:
        'La dirección del servidor tiene que empezar con https:// y verse como https://algo.supabase.co. Cópiala de Project Settings → API.',
    }
  }

  return { ok: true, configuracion: { url, llave } }
}
