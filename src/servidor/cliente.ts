import { type SupabaseClient, createClient } from '@supabase/supabase-js'

/**
 * El único lugar donde se construye el cliente de Supabase.
 *
 * Las llaves salen de `.env` y nunca del código. La `anon key` es pública por
 * diseño — lo que protege los datos son las políticas de RLS del esquema, que
 * se prueban en `supabase/pruebas/03-rls.sql`. La `service role key` **nunca**
 * llega al navegador: va sin el prefijo `VITE_` justamente para que Vite no la
 * pueda meter en el bundle.
 */

const url = import.meta.env.VITE_SUPABASE_URL
const llave = import.meta.env.VITE_SUPABASE_ANON_KEY

/** ¿Hay servidor configurado? Si no, la app corre con datos de ejemplo. */
export function hayServidor(): boolean {
  return Boolean(url && llave)
}

let cache: SupabaseClient | null = null

export function cliente(): SupabaseClient {
  if (!url || !llave) {
    throw new Error(
      'Falta configurar el servidor. Copia .env.example a .env y llena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    )
  }
  cache ??= createClient(url, llave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return cache
}

/** Entrar con enlace mágico. Las pantallas de sesión van con el onboarding. */
export async function entrarConEnlace(correo: string): Promise<void> {
  const volverA = import.meta.env.VITE_URL_APP
  const { error } = await cliente().auth.signInWithOtp({
    email: correo,
    options: volverA ? { emailRedirectTo: volverA } : {},
  })
  if (error) throw new Error(`No se pudo mandar el enlace: ${error.message}`)
}

export async function salir(): Promise<void> {
  await cliente().auth.signOut()
}

export async function usuarioConSesion(): Promise<string | null> {
  const { data } = await cliente().auth.getUser()
  return data.user?.id ?? null
}
