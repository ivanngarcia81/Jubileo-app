/// <reference types="vite/client" />

/**
 * Las variables de entorno que la app lee del navegador. Solo las que llevan
 * el prefijo `VITE_` llegan al bundle; las llaves de servidor viven en `.env`
 * sin ese prefijo justamente para que no puedan llegar aquí.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /**
   * La misma llave con dos nombres: Supabase renombró `anon` a `publishable`.
   * Basta con una — el código acepta cualquiera de las dos.
   */
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_URL_APP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
