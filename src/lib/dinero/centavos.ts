/**
 * Dinero en centavos enteros. Nunca flotantes.
 *
 * `Centavos` es un tipo nominal: un `number` cualquiera no entra sin pasar
 * por `centavos()`. Así el compilador atrapa el caso de meter dólares donde
 * van centavos, que es el error que nadie nota hasta que la suma no cuadra.
 */
declare const marcaCentavos: unique symbol

export type Centavos = number & { readonly [marcaCentavos]: true }

export const CERO = 0 as Centavos

/** Construye `Centavos`. Rechaza decimales, NaN e infinitos. */
export function centavos(n: number): Centavos {
  if (!Number.isInteger(n)) {
    throw new RangeError(`El dinero va en centavos enteros, llegó: ${n}`)
  }
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`Monto fuera de rango seguro: ${n}`)
  }
  return n as Centavos
}

/** Convierte dólares (número de la interfaz) a centavos, redondeando. */
export function deDolares(dolares: number): Centavos {
  if (!Number.isFinite(dolares)) {
    throw new RangeError(`Monto en dólares inválido: ${dolares}`)
  }
  return centavos(Math.round(dolares * 100))
}

export function suma(montos: readonly Centavos[]): Centavos {
  let total = 0
  for (const m of montos) total += m
  return centavos(total)
}

export function resta(a: Centavos, b: Centavos): Centavos {
  return centavos(a - b)
}

export function esNegativo(m: Centavos): boolean {
  return m < 0
}
