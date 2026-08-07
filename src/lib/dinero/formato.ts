import type { Centavos } from './centavos.js'

/**
 * Formateo. Vive aparte a propósito: es capa de presentación y no debe
 * colarse en ningún cálculo. Todo número de dinero se muestra con
 * `font-variant-numeric: tabular-nums` (clase `.num` de los tokens).
 */

const CON_CENTAVOS = new Intl.NumberFormat('es-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const REDONDO = new Intl.NumberFormat('es-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** `$1,240.00` */
export function formatear(monto: Centavos): string {
  return CON_CENTAVOS.format(monto / 100)
}

/**
 * `$1,240` — sin centavos. Es lo que usan las cifras héroe y los avisos:
 * los mockups muestran `$65`, no `$65.00`. Solo para presentar.
 */
export function formatearRedondo(monto: Centavos): string {
  return REDONDO.format(Math.round(monto / 100))
}
