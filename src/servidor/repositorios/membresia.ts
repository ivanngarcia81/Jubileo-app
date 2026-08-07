import { cliente } from '../cliente'

/**
 * Hablar con Stripe pasa siempre por nuestro servidor.
 *
 * El navegador no manda su `usuario_id`: manda su token de sesión, y el
 * servidor pregunta a Supabase de quién es. Un id mandado desde el navegador se
 * podría cambiar a mano, y con él alguien abriría el portal de cobro de otro.
 */

async function pedir(camino: string, cuerpo?: unknown): Promise<string> {
  const { data } = await cliente().auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Tu sesión venció. Vuelve a entrar.')

  const r = await fetch(`/api/stripe/${camino}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo ?? {}),
  })
  const respuesta = (await r.json()) as { url?: string; error?: string }
  if (!r.ok || !respuesta.url) {
    throw new Error(respuesta.error ?? 'No se pudo abrir el pago. Inténtalo otra vez.')
  }
  return respuesta.url
}

export async function irAPagar(plan: 'mensual' | 'anual'): Promise<void> {
  window.location.href = await pedir('checkout', { plan })
}

export async function irAlPortal(): Promise<void> {
  window.location.href = await pedir('portal')
}

/**
 * Canjea un código de cortesía y devuelve hasta cuándo queda premium.
 *
 * Pasa por una función de la base y no por la tabla: `codigos_cortesia` niega
 * todo desde el cliente a propósito. Con permiso directo, cualquiera podría
 * leer la lista de códigos y probarlos uno por uno.
 */
export async function canjearCodigo(codigo: string): Promise<string> {
  const { data, error } = await cliente().rpc('canjear_codigo', { codigo_dado: codigo })
  if (error) throw new Error(error.message)
  return data as string
}
