import { anioDe, type FechaCivil, mesDe } from '../lib/fecha'

/** Nombres de mes en español. Solo para presentar. */
export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

export function nombreDeMes(mes: number): string {
  return MESES[mes - 1] ?? ''
}

const conMayuscula = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1)

/** "Marzo 2028" */
export function mesYAnio(f: FechaCivil): string {
  return `${conMayuscula(nombreDeMes(mesDe(f)))} ${anioDe(f)}`
}

/** "marzo 2028", para meterlo dentro de una frase. */
export function mesYAnioEnFrase(f: FechaCivil): string {
  return `${nombreDeMes(mesDe(f))} ${anioDe(f)}`
}

/** "5 meses" / "1 mes" */
export function meses(n: number): string {
  return n === 1 ? '1 mes' : `${n} meses`
}
