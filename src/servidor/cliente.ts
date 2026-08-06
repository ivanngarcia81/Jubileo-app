import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { revisarConfiguracion } from './configuracion'

/**
 * El único lugar donde se construye el cliente de Supabase.
 *
 * Las llaves salen del entorno y nunca del código. La `anon key` — que Supabase
 * ahora llama `publishable key` — es pública por diseño: lo que protege los
 * datos son las políticas de RLS del esquema, probadas en
 * `supabase/pruebas/03-rls.sql`. La `service role key` **nunca** llega al
 * navegador: va sin el prefijo `VITE_` justamente para que Vite no la pueda
 * meter en el bundle.
 */

const revision = revisarConfiguracion({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
})

/** ¿Hay servidor configurado y bien? Si no, la app corre con datos de ejemplo. */
export function hayServidor(): boolean {
  return revision.ok
}

/**
 * Por qué no hay servidor, cuando la configuración existe pero está mal. Nulo
 * si todo está bien, o si sencillamente no se configuró nada.
 */
export function problemaDeConfiguracion(): string | null {
  if (revision.ok || 'sinConfigurar' in revision) return null
  return revision.motivo
}

let cache: SupabaseClient | null = null

export function cliente(): SupabaseClient {
  if (!revision.ok) throw new Error(revision.motivo)
  const { url, llave } = revision.configuracion
  cache ??= createClient(url, llave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return cache
}

// ---------------------------------------------------------------------------
// Entrar
//
// Supabase puede mandar un enlace, un código de seis dígitos, o los dos. Aquí
// va solo el código, y las plantillas del correo tampoco llevan enlace.
//
// El enlace es frágil en teléfono: al pedirlo se guarda un secreto en el
// navegador que hizo la petición, y si el correo lo abre en otro visor —lo
// normal en iPhone— el secreto no está y la sesión no se crea, sin decir nada.
// El código no tiene ese problema porque nadie abre nada: se teclea donde ya
// estás.
//
// Cuál de las dos plantillas se usa depende de la cuenta: `signInWithOtp` crea
// al usuario si no existe, y a uno nuevo o sin confirmar le llega «Confirm
// signup»; a los demás, «Magic Link». Las dos tienen que llevar `{{ .Token }}`
// — está en el README. `type: 'email'` en `verifyOtp` cubre las dos.
// ---------------------------------------------------------------------------

/** Manda el correo con el código. */
export async function pedirCodigo(correo: string): Promise<void> {
  const volverA = import.meta.env.VITE_URL_APP
  const { error } = await cliente().auth.signInWithOtp({
    email: correo,
    options: volverA ? { emailRedirectTo: volverA } : {},
  })
  if (error) throw new Error(traducir(error.message))
}

/** Canjea el código de seis dígitos por una sesión. */
export async function verificarCodigo(correo: string, codigo: string): Promise<void> {
  const { error } = await cliente().auth.verifyOtp({
    email: correo,
    token: codigo.trim(),
    type: 'email',
  })
  if (error) throw new Error(traducir(error.message))
}

/**
 * Los mensajes de Supabase llegan en inglés y con jerga. La sección 8 del SPEC
 * pide decir qué pasó y cómo se arregla, sin disculparse.
 */
function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase()
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Ya mandamos varios correos. Espera unos minutos antes de pedir otro.'
  if (m.includes('expired'))
    return 'El código ya venció. Pide uno nuevo y tecléalo en cuanto llegue.'
  if (m.includes('invalid') && (m.includes('token') || m.includes('otp')))
    return 'Ese código no es. Revisa el correo, o pide uno nuevo.'
  if (m.includes('invalid') && m.includes('email'))
    return 'Ese correo no se ve bien. Revísalo.'
  return mensaje
}

export async function salir(): Promise<void> {
  await cliente().auth.signOut()
}

export async function usuarioConSesion(): Promise<string | null> {
  const { data } = await cliente().auth.getUser()
  return data.user?.id ?? null
}
