import { describe, expect, it } from 'vitest'
import {
  FONDOS_GRATIS,
  PRECIOS,
  ahorroAnual,
  nivelDeSuscripcion,
  nivelVigente,
  puede,
} from './nivel'

const AHORA = Date.UTC(2026, 7, 6)
const EN_UN_MES = Date.UTC(2026, 8, 6)
const HACE_UN_MES = Date.UTC(2026, 6, 6)

describe('lo que da cada nivel', () => {
  it('el motor de subperiodos no es premium: es el diferenciador y va gratis', () => {
    // No está en la lista de funciones a propósito. Si alguien lo agregara,
    // esta prueba no lo atraparía — pero el comentario del módulo sí lo dice,
    // y la sección 10 del SPEC es explícita.
    expect(puede('gratis', 'historial_completo')).toBe(false)
    expect(puede('gratis', 'aviso_push')).toBe(false)
  })

  it('premium puede todo', () => {
    for (const f of ['aviso_push', 'modo_pareja', 'exportar_pdf'] as const) {
      expect(puede('premium', f)).toBe(true)
    }
  })

  it('el resumen semanal por correo es gratis, y por eso no está en la lista', () => {
    // Lo recibe todo el mundo (sección 10). Que no exista como función de pago
    // es justamente lo que lo hace gratis.
    expect(puede('gratis', 'aviso_sms')).toBe(false)
  })

  it('el nivel gratis tiene tope de fondos, pero no de cero', () => {
    expect(FONDOS_GRATIS).toBeGreaterThan(0)
  })
})

describe('el nivel según Stripe', () => {
  it('pagando al corriente es premium', () => {
    expect(nivelDeSuscripcion({ estado: 'active', terminaEn: EN_UN_MES }, AHORA)).toEqual({
      nivel: 'premium',
      venceEn: EN_UN_MES,
    })
  })

  it('en prueba también', () => {
    expect(nivelDeSuscripcion({ estado: 'trialing', terminaEn: EN_UN_MES }, AHORA).nivel).toBe(
      'premium',
    )
  })

  it('un pago atrasado sigue siendo premium mientras Stripe reintenta', () => {
    // Quitarle la app a alguien porque su tarjeta venció el martes es
    // castigarlo por algo que todavía se puede arreglar.
    expect(nivelDeSuscripcion({ estado: 'past_due', terminaEn: EN_UN_MES }, AHORA).nivel).toBe(
      'premium',
    )
  })

  it('cuando Stripe se rinde, sí baja', () => {
    expect(nivelDeSuscripcion({ estado: 'unpaid', terminaEn: EN_UN_MES }, AHORA).nivel).toBe(
      'gratis',
    )
  })

  it('cancelada vale hasta el final del periodo que ya pagó', () => {
    expect(nivelDeSuscripcion({ estado: 'canceled', terminaEn: EN_UN_MES }, AHORA)).toEqual({
      nivel: 'premium',
      venceEn: EN_UN_MES,
    })
  })

  it('cancelada y ya vencida es gratis', () => {
    expect(nivelDeSuscripcion({ estado: 'canceled', terminaEn: HACE_UN_MES }, AHORA).nivel).toBe(
      'gratis',
    )
  })

  it('una que nunca se completó no da nada', () => {
    for (const estado of ['incomplete', 'incomplete_expired', 'paused'] as const) {
      expect(nivelDeSuscripcion({ estado, terminaEn: EN_UN_MES }, AHORA).nivel).toBe('gratis')
    }
  })

  it('un estado que Stripe invente mañana cae del lado seguro', () => {
    expect(nivelDeSuscripcion({ estado: 'algo_nuevo', terminaEn: EN_UN_MES }, AHORA).nivel).toBe(
      'gratis',
    )
  })
})

describe('el nivel vigente al leerlo', () => {
  it('corrige un premium ya vencido aunque la base todavía diga premium', () => {
    // Si el webhook del vencimiento se perdió, la base se queda vieja. Esto lo
    // corrige al leer, sin borrar nada.
    expect(nivelVigente('premium', HACE_UN_MES, AHORA)).toBe('gratis')
  })

  it('respeta un premium todavía vigente', () => {
    expect(nivelVigente('premium', EN_UN_MES, AHORA)).toBe('premium')
  })

  it('premium sin fecha es premium: así se guarda un código de cortesía sin tope', () => {
    expect(nivelVigente('premium', null, AHORA)).toBe('premium')
  })

  it('gratis se queda gratis, con o sin fecha', () => {
    expect(nivelVigente('gratis', EN_UN_MES, AHORA)).toBe('gratis')
    expect(nivelVigente('gratis', null, AHORA)).toBe('gratis')
  })
})

describe('los precios', () => {
  it('son los del SPEC, en centavos enteros', () => {
    expect(PRECIOS.mensual.centavos).toBe(800)
    expect(PRECIOS.anual.centavos).toBe(7900)
  })

  it('el anual ahorra $17 al año, y eso es lo que se le dice al usuario', () => {
    expect(ahorroAnual()).toBe(1700)
  })
})
