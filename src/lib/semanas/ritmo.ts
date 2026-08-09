import { type Centavos, centavos, repartir } from '../dinero/index.js'

/**
 * El ritmo del plan: cuánto tocaría llevar gastado a estas alturas de la
 * semana, y por cuánto vas por encima o por debajo.
 *
 * Es la diferencia entre "llevas $180 de $300" —que no dice nada— y "vas $40
 * por encima del ritmo": lo primero es un dato, lo segundo es una decisión. En
 * martes, $180 de $300 va fatal; en domingo, va perfecto.
 *
 * El ritmo se reparte a partes iguales entre los días de la semana. No es
 * verdad que la gente gaste parejo —el súper cae un día y la gasolina otro—
 * pero cualquier curva más lista sería una suposición sobre la vida de alguien
 * que no conocemos, y una suposición vestida de precisión es peor que un
 * promedio honesto. El día en curso cuenta **completo**: el usuario mira esto
 * a media tarde con el día ya gastado, y descontar las horas que le quedan
 * haría que la píldora cambiara de color sola mientras la mira.
 */
export interface Ritmo {
  /** Lo que tocaría llevar gastado hoy si el gasto fuera parejo. */
  esperadoCents: Centavos
  /** Gastado − esperado. Positivo: vas por encima. Negativo: por debajo. */
  diferenciaCents: Centavos
}

/**
 * @param planeadoCents lo presupuestado para la semana entera
 * @param gastadoCents  lo que se lleva gastado
 * @param diaDeLaSemana 1 = primer día de la semana, y así hasta `dias`
 * @param dias          cuántos días mide la semana (la quinta mide 1 a 3)
 */
export function ritmoDelPlan(
  planeadoCents: Centavos,
  gastadoCents: Centavos,
  diaDeLaSemana: number,
  dias: number,
): Ritmo {
  if (dias <= 0 || planeadoCents <= 0) {
    return { esperadoCents: centavos(0), diferenciaCents: gastadoCents }
  }
  // Fuera de rango se recorta en vez de reventar: la semana pedida puede venir
  // de una fecha que el usuario cambió a mano.
  const transcurridos = Math.min(Math.max(diaDeLaSemana, 0), dias)
  if (transcurridos === 0) {
    return { esperadoCents: centavos(0), diferenciaCents: gastadoCents }
  }
  // `repartir` es el único lugar donde se divide dinero (regla de CLAUDE.md).
  // Se reparte entre los días y se suman los transcurridos, en vez de
  // multiplicar y redondear: así el ritmo del último día da exactamente el
  // planeado, sin un centavo de sobra ni de menos.
  const porDia = repartir(planeadoCents, new Array<number>(dias).fill(1))
  const esperado = centavos(
    porDia.slice(0, transcurridos).reduce((suma, monto) => suma + monto, 0),
  )
  return { esperadoCents: esperado, diferenciaCents: centavos(gastadoCents - esperado) }
}
