import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { nivelDeSuscripcion, type Plan } from '../src/lib/membresia'

/**
 * Membresía: cobrar, administrar y —lo que de verdad importa— enterarse.
 *
 * Los webhooks son **la única fuente de verdad del nivel** (sección 10 del
 * SPEC). El navegador nunca dice "ya pagué": puede mentir, puede cerrarse a
 * media redirección, y puede quedarse con una pantalla de éxito mientras el
 * cargo falló. Aquí solo se cree lo que llega firmado desde Stripe.
 *
 * Un solo archivo con tres caminos porque los tres comparten el cliente, las
 * llaves y la traducción de estados. Ninguno de esos secretos lleva prefijo
 * `VITE_`: viven en el servidor y no pueden llegar al navegador.
 */

interface Peticion {
  method?: string
  url?: string
  headers: { get?(k: string): string | null } & Record<string, unknown>
  body?: unknown
  text?(): Promise<string>
}
interface Respuesta {
  status(c: number): Respuesta
  json(b: unknown): void
  send?(b: string): void
}

function encabezado(req: Peticion, nombre: string): string | null {
  if (typeof req.headers?.get === 'function') return req.headers.get(nombre)
  const v = (req.headers as Record<string, unknown>)[nombre.toLowerCase()]
  return typeof v === 'string' ? v : null
}

function servidor() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !llave) throw new Error('Falta la configuración de Supabase')
  return createClient(url, llave, { auth: { persistSession: false } })
}

function stripe() {
  const llave = process.env.STRIPE_SECRET_KEY
  if (!llave) throw new Error('Falta STRIPE_SECRET_KEY')
  return new Stripe(llave)
}

const URL_APP = process.env.URL_APP ?? 'https://jubileo-app.vercel.app'

const PRECIO_DE: Record<Plan, string | undefined> = {
  mensual: process.env.STRIPE_PRECIO_MENSUAL,
  anual: process.env.STRIPE_PRECIO_ANUAL,
}

/**
 * Quién está pidiendo esto. El token de sesión viaja en el encabezado y se
 * verifica contra Supabase: un `usuario_id` mandado desde el navegador se
 * podría cambiar a mano, y con él alguien pagaría la membresía de otro — o
 * peor, abriría el portal de cobro de otro.
 */
async function quienEs(req: Peticion): Promise<{ id: string; correo: string }> {
  const auth = encabezado(req, 'authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) throw new Error('Falta la sesión')
  const { data, error } = await servidor().auth.getUser(token)
  if (error || !data.user?.email) throw new Error('Sesión no válida')
  return { id: data.user.id, correo: data.user.email }
}

/** El cliente de Stripe del usuario, creándolo la primera vez. */
async function clienteDeStripe(usuarioId: string, correo: string): Promise<string> {
  const db = servidor()
  const { data } = await db
    .from('usuarios')
    .select('stripe_customer_id')
    .eq('id', usuarioId)
    .maybeSingle<{ stripe_customer_id: string | null }>()
  if (data?.stripe_customer_id) return data.stripe_customer_id

  // El id del usuario viaja en los metadatos: es lo que amarra el webhook de
  // vuelta a la cuenta correcta sin depender del correo, que se puede cambiar.
  const cliente = await stripe().customers.create({
    email: correo,
    metadata: { usuario_id: usuarioId },
  })
  await db.from('usuarios').update({ stripe_customer_id: cliente.id }).eq('id', usuarioId)
  return cliente.id
}

/** Aplica lo que dice Stripe. Es el único lugar donde el nivel cambia. */
async function aplicarSuscripcion(s: Stripe.Subscription): Promise<void> {
  const db = servidor()
  const clienteId = typeof s.customer === 'string' ? s.customer : s.customer.id

  const termina = (s as unknown as { current_period_end?: number }).current_period_end
  const { nivel, venceEn } = nivelDeSuscripcion(
    { estado: s.status, terminaEn: termina ? termina * 1000 : null },
    Date.now(),
  )

  await db
    .from('usuarios')
    .update({
      nivel,
      nivel_vence_en: venceEn === null ? null : new Date(venceEn).toISOString(),
    })
    .eq('stripe_customer_id', clienteId)
}

export default async function handler(req: Peticion, res: Respuesta) {
  const ruta = (req.url ?? '').split('?')[0] ?? ''

  try {
    // ---- El webhook: la única fuente de verdad --------------------------
    if (ruta.endsWith('/webhook')) {
      const secreto = process.env.STRIPE_WEBHOOK_SECRET
      const firma = encabezado(req, 'stripe-signature')
      if (!secreto || !firma) return res.status(400).json({ error: 'sin firma' })

      // El cuerpo **crudo**: la firma se calcula sobre los bytes exactos, y
      // cualquier cosa que lo vuelva a serializar la invalida.
      const crudo = req.text ? await req.text() : String(req.body ?? '')
      let evento: Stripe.Event
      try {
        evento = await stripe().webhooks.constructEventAsync(crudo, firma, secreto)
      } catch (e) {
        // Firma mala: alguien está tocando la puerta. No se toca nada.
        return res.status(400).json({ error: e instanceof Error ? e.message : 'firma inválida' })
      }

      switch (evento.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await aplicarSuscripcion(evento.data.object)
          break
        case 'checkout.session.completed': {
          // Al terminar el pago la suscripción ya existe: se pide entera en vez
          // de adivinar el nivel desde la sesión, que no trae el estado real.
          const sesion = evento.data.object
          if (sesion.subscription) {
            const id =
              typeof sesion.subscription === 'string'
                ? sesion.subscription
                : sesion.subscription.id
            await aplicarSuscripcion(await stripe().subscriptions.retrieve(id))
          }
          break
        }
        default:
          break
      }
      return res.status(200).json({ recibido: true })
    }

    // ---- Empezar a pagar -------------------------------------------------
    if (ruta.endsWith('/checkout')) {
      const { id, correo } = await quienEs(req)
      const cuerpo = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
        plan?: Plan
      }
      const plan: Plan = cuerpo?.plan === 'anual' ? 'anual' : 'mensual'
      const precio = PRECIO_DE[plan]
      if (!precio) return res.status(500).json({ error: `Falta el precio de ${plan}` })

      const sesion = await stripe().checkout.sessions.create({
        mode: 'subscription',
        customer: await clienteDeStripe(id, correo),
        line_items: [{ price: precio, quantity: 1 }],
        locale: 'es',
        success_url: `${URL_APP}/#/ajustes?pago=listo`,
        cancel_url: `${URL_APP}/#/ajustes`,
        // Sirve de red por si el webhook llega tarde: el usuario vuelve y el
        // nivel se puede confirmar contra esta sesión.
        client_reference_id: id,
      })
      return res.status(200).json({ url: sesion.url })
    }

    // ---- Administrar lo que ya se paga -----------------------------------
    if (ruta.endsWith('/portal')) {
      const { id, correo } = await quienEs(req)
      const sesion = await stripe().billingPortal.sessions.create({
        customer: await clienteDeStripe(id, correo),
        locale: 'es',
        return_url: `${URL_APP}/#/ajustes`,
      })
      return res.status(200).json({ url: sesion.url })
    }

    return res.status(404).json({ error: 'no existe' })
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : String(e) })
  }
}

/**
 * Vercel entrega el cuerpo ya parseado, y eso rompería la firma del webhook.
 * Con esto llega crudo.
 */
export const config = { api: { bodyParser: false } }
