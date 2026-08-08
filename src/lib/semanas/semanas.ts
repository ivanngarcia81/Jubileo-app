import { type FechaCivil, deYMD, diaDe, diasDelMes } from '../fecha'

/**
 * Las semanas del mes — el eje donde se presupuesta lo variable.
 *
 * Son semanas **del calendario del mes**, no de la semana civil: 1–7, 8–14,
 * 15–21, 22–28, y 29–fin cuando el mes tiene más de 28 días. No empiezan en
 * domingo a propósito: si empezaran, la semana 1 de cada mes mediría distinto
 * y el usuario no podría comparar "la semana 2 de julio" con "la semana 2 de
 * agosto". Aquí las cuatro primeras miden 7 días siempre, y la quinta es el
 * pico del mes: 1 a 3 días, o no existe (febrero de 28).
 *
 * El módulo es puro y sin reloj, como `lib/periodos`: la semana "en curso"
 * recibe el hoy por parámetro, y así se puede probar el 29 de febrero igual
 * que cualquier martes.
 */

export interface SemanaDelMes {
  /** 1 a 5. La quinta solo existe en meses de 29 días o más. */
  numero: number
  fechaInicio: FechaCivil
  fechaFin: FechaCivil
  /** 7 en las cuatro primeras; 1 a 3 en la quinta. */
  dias: number
}

export function semanasDelMes(anio: number, mes: number): SemanaDelMes[] {
  const total = diasDelMes(anio, mes)
  const semanas: SemanaDelMes[] = []
  for (let inicio = 1; inicio <= total; inicio += 7) {
    const fin = Math.min(inicio + 6, total)
    semanas.push({
      numero: semanas.length + 1,
      fechaInicio: deYMD(anio, mes, inicio),
      fechaFin: deYMD(anio, mes, fin),
      dias: fin - inicio + 1,
    })
  }
  return semanas
}

/** A qué semana (1–5) pertenece un día del mes. */
export function semanaDeDia(dia: number): number {
  return Math.floor((dia - 1) / 7) + 1
}

/** A qué semana pertenece una fecha. Solo mira el día: la semana es del mes. */
export function semanaDeFecha(f: FechaCivil): number {
  return semanaDeDia(diaDe(f))
}

/**
 * El índice (base 0) de la semana en curso dentro de `semanas`.
 *
 * Manda la fecha, igual que en el cheque en curso: si el hoy cae antes del
 * mes se está mirando un mes futuro y se empieza por la primera; si cae
 * después, es un mes pasado y se termina en la última.
 */
export function semanaEnCurso(semanas: readonly SemanaDelMes[], hoy: FechaCivil): number {
  if (semanas.length === 0) return 0
  const dentro = semanas.findIndex((s) => s.fechaInicio <= hoy && hoy <= s.fechaFin)
  if (dentro !== -1) return dentro
  return hoy < semanas[0]!.fechaInicio ? 0 : semanas.length - 1
}
