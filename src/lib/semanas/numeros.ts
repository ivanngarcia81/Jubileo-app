import { type Centavos, centavos, suma } from '../dinero/index.js'
import type { FechaCivil } from '../fecha/index.js'
import type { SemanaDelMes } from './semanas.js'

/**
 * El número de cada semana: lo fijo que se vence en sus días más lo variable
 * que se le asignó. Y la bandera de apretada: en esa semana se vence más de lo
 * que ha llegado.
 *
 * La bandera es acumulada y cuenta TODO el dinero que entra, el cheque extra
 * incluido — mide la caja real, no el plan. Es distinta a propósito del
 * guardia del servidor (`semanas_sobregiradas`), que solo vigila lo repartible
 * y excluye el extra: el guardia bloquea promesas que sí se pueden mover; la
 * bandera informa de la realidad completa, fijos incluidos, que muchas veces
 * no se puede mover — la renta vence cuando vence. Informar no es bloquear.
 */

export interface FijoDeSemana {
  nombre: string
  /** Nulo cuando no tiene fecha: cuenta en la última semana, como en SQL. */
  diaVencimiento: number | null
  montoCents: Centavos
}

export interface AsignacionSemanal {
  /** 1 a 5. */
  semana: number
  montoCents: Centavos
}

export interface ChequeDeSemana {
  fechaPago: FechaCivil
  ingresoCents: Centavos
  esExtra: boolean
}

export interface NumeroDeSemana {
  numero: number
  /** Lo fijo (y deudas) que se vence dentro de la semana. */
  fijosCents: Centavos
  /** Lo variable asignado a la semana. */
  variableCents: Centavos
  totalCents: Centavos
  /** Todo lo que ha entrado hasta el fin de la semana, extra incluido. */
  entraAcumuladoCents: Centavos
  /** Hasta aquí se vence más de lo que ha llegado. */
  apretada: boolean
}

/**
 * En qué semana pesa un fijo. El día se recorta al último del mes —"el 31" en
 * febrero es el 28— y sin día cuenta en la última: no se sabe cuándo, así que
 * no se le exige antes de tiempo. Espejo de `semanas_sobregiradas` en SQL.
 */
export function semanaDeFijo(diaVencimiento: number | null, semanas: readonly SemanaDelMes[]): number {
  if (diaVencimiento === null) return semanas.length
  const diasDelMes = (semanas.length - 1) * 7 + (semanas.at(-1)?.dias ?? 7)
  return Math.floor((Math.min(diaVencimiento, diasDelMes) - 1) / 7) + 1
}

export function numerosDeSemanas(
  semanas: readonly SemanaDelMes[],
  fijos: readonly FijoDeSemana[],
  asignado: readonly AsignacionSemanal[],
  cheques: readonly ChequeDeSemana[],
): NumeroDeSemana[] {
  let vencidoAcumulado = 0
  return semanas.map((semana) => {
    const fijosCents = centavos(
      suma(
        fijos
          .filter((f) => semanaDeFijo(f.diaVencimiento, semanas) === semana.numero)
          .map((f) => f.montoCents),
      ),
    )
    const variableCents = centavos(
      suma(asignado.filter((a) => a.semana === semana.numero).map((a) => a.montoCents)),
    )
    const entraAcumuladoCents = centavos(
      suma(cheques.filter((c) => c.fechaPago <= semana.fechaFin).map((c) => c.ingresoCents)),
    )
    vencidoAcumulado += fijosCents + variableCents
    return {
      numero: semana.numero,
      fijosCents,
      variableCents,
      totalCents: centavos(fijosCents + variableCents),
      entraAcumuladoCents,
      apretada: vencidoAcumulado > entraAcumuladoCents,
    }
  })
}

/**
 * El arrastre dentro del mes: lo que sobra de un sobre en una semana pasa al
 * mismo sobre en la siguiente — y lo que se pasó también viaja, en negativo.
 * Esconder el sobregasto haría que las semanas siguientes prometieran dinero
 * que ya se fue.
 */

/** El presupuesto de la semana `indice` (base 0): lo asignado más el arrastre. */
export function presupuestoConArrastre(
  asignadoPorSemana: readonly Centavos[],
  gastadoPorSemana: readonly Centavos[],
  indice: number,
): Centavos {
  const asignadoHasta = suma(asignadoPorSemana.slice(0, indice + 1))
  const gastadoAntes = suma(gastadoPorSemana.slice(0, indice))
  return centavos(asignadoHasta - gastadoAntes)
}

/** Lo que queda del sobre en la semana `indice`, ya con lo gastado en ella. */
export function disponibleConArrastre(
  asignadoPorSemana: readonly Centavos[],
  gastadoPorSemana: readonly Centavos[],
  indice: number,
): Centavos {
  const asignadoHasta = suma(asignadoPorSemana.slice(0, indice + 1))
  const gastadoHasta = suma(gastadoPorSemana.slice(0, indice + 1))
  return centavos(asignadoHasta - gastadoHasta)
}
