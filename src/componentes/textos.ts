import { anioDe, diaDe, diaSemana, type FechaCivil, mesDe, sumarDias } from '../lib/fecha'

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

/** "12 de agosto". Sin año: se usa dentro del mes que se está mirando. */
export function diaYMes(f: FechaCivil): string {
  return `${diaDe(f)} de ${nombreDeMes(mesDe(f))}`
}

/** "5 meses" / "1 mes" */
export function meses(n: number): string {
  return n === 1 ? '1 mes' : `${n} meses`
}

const DIAS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const

/**
 * El encabezado de un día de movimientos: "Hoy · viernes 8", "Ayer · jueves 7",
 * "Miércoles 6".
 *
 * "Hoy" y "ayer" se calculan contra el hoy que le pasen, no contra el reloj:
 * el reloj de la máquina no es el del usuario, y quien vive en otra zona vería
 * "hoy" en el día equivocado durante unas horas todos los días.
 */
export function etiquetaDeDia(f: FechaCivil, hoy: FechaCivil): string {
  // El mes va cuando no es el de hoy. Los cheques cruzan meses a propósito
  // —el que financia agosto puede caer el 20 de julio— así que un "Martes 28"
  // suelto en una lista de agosto no dice de cuándo es.
  const otroMes = mesDe(f) !== mesDe(hoy) || anioDe(f) !== anioDe(hoy)
  const dia = `${DIAS[diaSemana(f)]} ${diaDe(f)}${otroMes ? ` de ${nombreDeMes(mesDe(f))}` : ''}`
  if (f === hoy) return `Hoy · ${dia}`
  if (f === sumarDias(hoy, -1)) return `Ayer · ${dia}`
  return conMayuscula(dia)
}
