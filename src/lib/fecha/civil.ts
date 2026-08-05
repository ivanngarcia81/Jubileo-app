/**
 * Fechas civiles: un día del calendario, sin hora y sin zona.
 *
 * El error clásico de este dominio es que `new Date('2026-03-01')` se corra
 * un día según dónde esté parado el usuario. Aquí no hay forma de que pase:
 * el tipo es una cadena `AAAA-MM-DD` y toda la aritmética va por `Date.UTC`.
 * Ninguna función de este módulo llama a `new Date()` sin argumentos ni toca
 * un método local (`getDate`, `getMonth`, `getDay`).
 *
 * La conversión entre la zona horaria del usuario y UTC no vive aquí: es
 * asunto de la capa de avisos (sección 9 del SPEC). Aquí solo días de
 * calendario, que es lo que el presupuesto necesita.
 */

declare const marcaFecha: unique symbol

export type FechaCivil = string & { readonly [marcaFecha]: true }

/** 0 = domingo … 6 = sábado. Misma numeración que `Date.prototype.getUTCDay`. */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

const PATRON = /^(\d{4})-(\d{2})-(\d{2})$/

const dosDigitos = (n: number): string => String(n).padStart(2, '0')

/** Construye una `FechaCivil` desde `AAAA-MM-DD`, validando que exista. */
export function fecha(texto: string): FechaCivil {
  const partes = PATRON.exec(texto)
  if (!partes) {
    throw new RangeError(`Fecha inválida, se esperaba AAAA-MM-DD: ${texto}`)
  }
  const anio = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])
  if (mes < 1 || mes > 12) throw new RangeError(`Mes fuera de rango: ${texto}`)
  if (dia < 1 || dia > diasDelMes(anio, mes)) {
    throw new RangeError(`Ese día no existe: ${texto}`)
  }
  return texto as FechaCivil
}

/** Arma una fecha desde año, mes (1–12) y día. */
export function deYMD(anio: number, mes: number, dia: number): FechaCivil {
  return fecha(`${String(anio).padStart(4, '0')}-${dosDigitos(mes)}-${dosDigitos(dia)}`)
}

export function anioDe(f: FechaCivil): number {
  return Number(f.slice(0, 4))
}

export function mesDe(f: FechaCivil): number {
  return Number(f.slice(5, 7))
}

export function diaDe(f: FechaCivil): number {
  return Number(f.slice(8, 10))
}

/** Días que trae un mes. Sabe de años bisiestos. */
export function diasDelMes(anio: number, mes: number): number {
  if (mes < 1 || mes > 12) throw new RangeError(`Mes fuera de rango: ${mes}`)
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate()
}

export function esBisiesto(anio: number): boolean {
  return diasDelMes(anio, 2) === 29
}

/** Días transcurridos desde la época, en UTC. Base de toda la aritmética. */
function aDias(f: FechaCivil): number {
  return Date.UTC(anioDe(f), mesDe(f) - 1, diaDe(f)) / 86_400_000
}

function deDias(dias: number): FechaCivil {
  const d = new Date(dias * 86_400_000)
  return deYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export function sumarDias(f: FechaCivil, dias: number): FechaCivil {
  return deDias(aDias(f) + dias)
}

/** Días de `a` a `b`. Negativo si `b` es anterior. */
export function diasEntre(a: FechaCivil, b: FechaCivil): number {
  return aDias(b) - aDias(a)
}

export function diaSemana(f: FechaCivil): DiaSemana {
  return new Date(Date.UTC(anioDe(f), mesDe(f) - 1, diaDe(f))).getUTCDay() as DiaSemana
}

/** Suma meses cuidando el fin de mes: 31 de enero + 1 mes = 28 (o 29) de febrero. */
export function sumarMeses(f: FechaCivil, meses: number): FechaCivil {
  const total = (anioDe(f) - 1) * 12 + (mesDe(f) - 1) + meses
  const anio = Math.floor(total / 12) + 1
  const mes = (total % 12) + 1
  return deYMD(anio, mes, Math.min(diaDe(f), diasDelMes(anio, mes)))
}

export function primerDiaDelMes(anio: number, mes: number): FechaCivil {
  return deYMD(anio, mes, 1)
}

export function ultimoDiaDelMes(anio: number, mes: number): FechaCivil {
  return deYMD(anio, mes, diasDelMes(anio, mes))
}

/**
 * El día `dia` del mes, recortado si el mes no llega. Es lo que hace que
 * "me pagan el 31" funcione en febrero, y por eso los días de pago del
 * modo `dos_veces_al_mes` nunca se salen del mes.
 */
export function diaDelMesRecortado(anio: number, mes: number, dia: number): FechaCivil {
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    throw new RangeError(`Día de pago fuera de rango: ${dia}`)
  }
  return deYMD(anio, mes, Math.min(dia, diasDelMes(anio, mes)))
}

export function mismoMes(f: FechaCivil, anio: number, mes: number): boolean {
  return anioDe(f) === anio && mesDe(f) === mes
}

export const antes = (a: FechaCivil, b: FechaCivil): boolean => a < b
export const despues = (a: FechaCivil, b: FechaCivil): boolean => a > b
export const min = (a: FechaCivil, b: FechaCivil): FechaCivil => (a <= b ? a : b)
export const max = (a: FechaCivil, b: FechaCivil): FechaCivil => (a >= b ? a : b)

/** Retrocede hasta el `objetivo` día de la semana, sin moverse si ya cae ahí. */
export function retrocederA(f: FechaCivil, objetivo: DiaSemana): FechaCivil {
  const diferencia = (diaSemana(f) - objetivo + 7) % 7
  return sumarDias(f, -diferencia)
}
