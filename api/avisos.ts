import { createClient } from '@supabase/supabase-js'
import {
  armarAviso,
  avisoEnHtml,
  avisoEnTexto,
  type PagoDelAviso,
  type SobreDelAviso,
} from '../src/lib/aviso'
import { centavos } from '../src/lib/dinero'
import { fecha } from '../src/lib/fecha'

/**
 * El cron del aviso de arranque de periodo.
 *
 * Corre una vez al día y manda el aviso a quien hoy empieza un cheque. Es la
 * primera cosa del repositorio que se ejecuta en un servidor, y por eso es la
 * única que usa la `service_role`: tiene que leer los periodos de todos los
 * hogares, y las políticas de RLS —que existen justamente para que nadie vea el
 * de otro— se lo impedirían. Esa llave **no lleva prefijo `VITE_`**, así que
 * Vite no la puede meter en el bundle ni por accidente.
 *
 * Aquí no se calcula nada del contenido: eso vive en `src/lib/aviso`, que es
 * puro y está probado. Este archivo decide a quién, junta las filas y manda.
 *
 * La idempotencia no es de este código: es de `envios_aviso`, con su
 * `unique (usuario_id, periodo_id, tipo, canal)`. Si el cron corre dos veces, el
 * segundo insert choca y el correo no sale. Un cron no debe ser confiable para
 * que el usuario no reciba dos correos iguales.
 */

interface Peticion {
  headers: { get?(k: string): string | null } & Record<string, unknown>
}
interface Respuesta {
  status(c: number): Respuesta
  json(b: unknown): void
}

const URL_APP = process.env.URL_APP ?? 'https://jubileo-app.vercel.app'

function encabezado(req: Peticion, nombre: string): string | null {
  if (typeof req.headers?.get === 'function') return req.headers.get(nombre)
  const v = (req.headers as Record<string, unknown>)[nombre.toLowerCase()]
  return typeof v === 'string' ? v : null
}

/** El día civil de hoy en la zona del usuario, sin librerías de fechas. */
export function hoyEn(zona: string, ahora: Date): string {
  // `en-CA` da AAAA-MM-DD, que es justo el formato de las fechas civiles.
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zona,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(ahora)
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(ahora)
  }
}

/** La hora local del usuario, 0–23. */
export function horaEn(zona: string, ahora: Date): number {
  try {
    return Number(
      new Intl.DateTimeFormat('en-US', { timeZone: zona, hour: '2-digit', hour12: false }).format(
        ahora,
      ),
    )
  } catch {
    return ahora.getUTCHours()
  }
}

async function mandarCorreo(para: string, asunto: string, html: string, texto: string) {
  const llave = process.env.CORREO_API_KEY
  const de = process.env.CORREO_REMITENTE ?? 'hola@jubileofinanciero.com'
  if (!llave) throw new Error('Falta CORREO_API_KEY')

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Jubileo <${de}>`, to: [para], subject: asunto, html, text: texto }),
  })
  if (!r.ok) throw new Error(`Resend contestó ${r.status}: ${await r.text()}`)
}

export default async function handler(req: Peticion, res: Respuesta) {
  // Vercel firma sus crons con este encabezado. Sin él, cualquiera con la URL
  // dispararía los correos de todos los usuarios.
  const secreto = process.env.CRON_SECRET
  if (secreto && encabezado(req, 'authorization') !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: 'no autorizado' })
  }

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !llave) return res.status(500).json({ error: 'falta la configuración del servidor' })

  const db = createClient(url, llave, { auth: { persistSession: false } })
  const ahora = new Date()
  const mandados: string[] = []
  const fallas: string[] = []

  const { data: usuarios, error } = await db
    .from('usuarios')
    .select('id, correo, nombre, zona_horaria')
  if (error) return res.status(500).json({ error: error.message })

  for (const u of usuarios ?? []) {
    try {
      const zona = u.zona_horaria ?? 'America/New_York'
      const hoy = hoyEn(zona, ahora)

      // El aviso sale a la hora que el usuario eligió, en su reloj.
      const { data: pref } = await db
        .from('preferencias_aviso')
        .select('canal, hora_local, activo')
        .eq('usuario_id', u.id)
        .eq('canal', 'correo')
        .maybeSingle()
      if (pref && !pref.activo) continue
      const horaElegida = Number((pref?.hora_local ?? '08:00').slice(0, 2))
      if (horaEn(zona, ahora) !== horaElegida) continue

      // ¿Hoy le arranca un cheque?
      const { data: periodo } = await db
        .from('periodos')
        .select('id, mes_id, fecha_pago, ingreso_esperado_cents, ingreso_real_cents, es_extra')
        .eq('usuario_id', u.id)
        .eq('fecha_pago', hoy)
        .maybeSingle()
      if (!periodo) continue

      // El insert va **antes** de mandar: si choca, alguien ya lo mandó. Al
      // revés se correría el riesgo de mandar dos veces, que es el que importa.
      const { error: yaFue } = await db.from('envios_aviso').insert({
        usuario_id: u.id,
        periodo_id: periodo.id,
        tipo: 'arranque_periodo',
        canal: 'correo',
      })
      if (yaFue) continue

      const [{ data: asignaciones }, { data: categorias }, { data: lineas }, { data: deudas }] =
        await Promise.all([
          db.from('asignaciones').select('linea_presupuesto_id, monto_cents').eq('periodo_id', periodo.id),
          db.from('categorias').select('id, nombre, grupo, activa, dia_vencimiento, deuda_id'),
          db.from('lineas_presupuesto').select('id, categoria_id').eq('mes_id', periodo.mes_id),
          db.from('deudas').select('id, es_enfoque'),
        ])

      const categoriaPorLinea = new Map(
        (lineas ?? []).map((l) => [l.id, (categorias ?? []).find((c) => c.id === l.categoria_id)]),
      )
      const enfoque = new Set((deudas ?? []).filter((d) => d.es_enfoque).map((d) => d.id))

      const pagos: PagoDelAviso[] = []
      const sobres: SobreDelAviso[] = []
      for (const a of asignaciones ?? []) {
        const c = categoriaPorLinea.get(a.linea_presupuesto_id)
        if (!c?.activa || a.monto_cents === 0) continue
        if (c.grupo === 'variable') {
          sobres.push({ nombre: c.nombre, montoCents: centavos(a.monto_cents) })
        } else if (c.dia_vencimiento) {
          pagos.push({
            nombre: c.nombre,
            dia: c.dia_vencimiento,
            montoCents: centavos(a.monto_cents),
            ...(c.deuda_id && enfoque.has(c.deuda_id) ? { esEnfoque: true } : {}),
          })
        }
      }

      const ingreso = periodo.ingreso_real_cents ?? periodo.ingreso_esperado_cents
      const aviso = armarAviso({
        nombre: u.nombre ?? (u.correo.split('@')[0] ?? 'tú'),
        fechaPago: fecha(periodo.fecha_pago),
        ingresoCents: ingreso === null ? null : centavos(ingreso),
        pagos,
        sobres,
        esExtra: periodo.es_extra,
      })

      await mandarCorreo(
        u.correo,
        aviso.asunto,
        avisoEnHtml(aviso, URL_APP),
        avisoEnTexto(aviso, URL_APP),
      )
      mandados.push(u.correo)
    } catch (e) {
      // Un usuario que falla no puede tumbar el aviso de los demás.
      fallas.push(`${u.correo}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return res.status(200).json({ mandados: mandados.length, fallas })
}
