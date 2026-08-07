/**
 * Qué da cada nivel, y cómo se decide desde Stripe.
 *
 * Puro y probado. Los webhooks son la única fuente de verdad del nivel
 * (sección 10 del SPEC), pero *traducir* un estado de Stripe a un nivel es una
 * decisión con orillas —¿un pago atrasado ya es gratis?, ¿un plan cancelado
 * sigue valiendo hasta que termine el periodo?— y esas decisiones se prueban
 * aquí, sin red y sin base.
 */

export type Nivel = 'gratis' | 'premium'

/**
 * Lo que separa un nivel del otro. El motor de subperiodos **no está aquí a
 * propósito**: es el diferenciador del producto y va gratis, porque es lo que
 * hace que la gente lo cuente.
 */
export type Funcion =
  | 'aviso_push'
  | 'aviso_sms'
  | 'banco_conectado'
  | 'modo_pareja'
  | 'planificador_remesas'
  | 'fondos_ilimitados'
  | 'historial_completo'
  | 'simulador'
  | 'exportar_pdf'
  | 'compartir_con_coach'

const SOLO_PREMIUM: ReadonlySet<Funcion> = new Set<Funcion>([
  'aviso_push',
  'aviso_sms',
  'banco_conectado',
  'modo_pareja',
  'planificador_remesas',
  'fondos_ilimitados',
  'historial_completo',
  'simulador',
  'exportar_pdf',
  'compartir_con_coach',
])

/** Cuántos fondos de reserva caben en el nivel gratis. */
export const FONDOS_GRATIS = 3

export function puede(nivel: Nivel, funcion: Funcion): boolean {
  return nivel === 'premium' || !SOLO_PREMIUM.has(funcion)
}

/**
 * Estados de suscripción de Stripe. Los de aquí son los que llegan de verdad;
 * cualquier otro se trata como no pagado, que es el lado seguro para nosotros y
 * el que menos sorprende al usuario: si algo raro pasa, ve el nivel gratis con
 * todos sus datos intactos, no una app rota.
 */
export type EstadoStripe =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | (string & {})

export interface Suscripcion {
  estado: EstadoStripe
  /** Fin del periodo ya pagado, en milisegundos. */
  terminaEn: number | null
}

/**
 * A qué nivel corresponde una suscripción, y hasta cuándo.
 *
 * `past_due` sigue siendo premium: Stripe reintenta el cobro varios días, y
 * quitarle la app a alguien porque su tarjeta venció el martes es castigarlo
 * por algo que todavía se puede arreglar. Cuando Stripe se rinde manda
 * `canceled` o `unpaid`, y ahí sí baja.
 *
 * Una suscripción cancelada vale hasta el final del periodo que ya pagó. El
 * usuario pagó el mes; que lo use completo.
 */
export function nivelDeSuscripcion(
  s: Suscripcion,
  ahora: number,
): { nivel: Nivel; venceEn: number | null } {
  const pagando = s.estado === 'active' || s.estado === 'trialing' || s.estado === 'past_due'
  if (pagando) return { nivel: 'premium', venceEn: s.terminaEn }

  // Cancelada pero con periodo pagado por delante.
  if (s.estado === 'canceled' && s.terminaEn !== null && s.terminaEn > ahora) {
    return { nivel: 'premium', venceEn: s.terminaEn }
  }

  return { nivel: 'gratis', venceEn: null }
}

/**
 * El nivel que se le enseña al usuario, ya con la fecha en la mano.
 *
 * Lo guardado puede quedarse viejo: si el webhook del vencimiento se pierde, la
 * base seguiría diciendo `premium`. Esto lo corrige al leer, sin borrar nada —
 * la sección 10 pide que al vencer se baje a gratis **sin borrar datos**.
 */
export function nivelVigente(
  guardado: Nivel,
  venceEn: number | null,
  ahora: number,
): Nivel {
  if (guardado !== 'premium') return guardado
  if (venceEn === null) return 'premium'
  return venceEn > ahora ? 'premium' : 'gratis'
}

/** Los precios del SPEC, en centavos, para no escribirlos sueltos. */
export const PRECIOS = {
  mensual: { centavos: 800, etiqueta: '$8 al mes' },
  anual: { centavos: 7900, etiqueta: '$79 al año' },
} as const

export type Plan = keyof typeof PRECIOS

/** Cuánto se ahorra al año pagando anual, en centavos. */
export function ahorroAnual(): number {
  return PRECIOS.mensual.centavos * 12 - PRECIOS.anual.centavos
}
