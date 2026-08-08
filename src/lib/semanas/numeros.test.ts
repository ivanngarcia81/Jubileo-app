import { describe, expect, it } from 'vitest'
import { centavos } from '../dinero'
import { fecha } from '../fecha'
import {
  disponibleConArrastre,
  numerosDeSemanas,
  presupuestoConArrastre,
  semanaDeFijo,
} from './numeros'
import { semanasDelMes } from './semanas'

const AGOSTO = semanasDelMes(2026, 8)
const FEBRERO = semanasDelMes(2027, 2)

describe('en qué semana pesa un fijo', () => {
  it('en la de su vencimiento', () => {
    expect(semanaDeFijo(3, AGOSTO)).toBe(1)
    expect(semanaDeFijo(15, AGOSTO)).toBe(3)
    expect(semanaDeFijo(31, AGOSTO)).toBe(5)
  })

  it('el día 31 en febrero se recorta al 28: semana 4, no truena', () => {
    expect(semanaDeFijo(31, FEBRERO)).toBe(4)
    expect(semanaDeFijo(29, FEBRERO)).toBe(4)
  })

  it('sin fecha cuenta en la última: no se le exige antes de tiempo', () => {
    expect(semanaDeFijo(null, AGOSTO)).toBe(5)
    expect(semanaDeFijo(null, FEBRERO)).toBe(4)
  })
})

describe('el número de cada semana', () => {
  const fijos = [
    { nombre: 'Renta', diaVencimiento: 3, montoCents: centavos(50000) },
    { nombre: 'Seguro', diaVencimiento: 18, montoCents: centavos(14200) },
  ]
  const asignado = [
    { semana: 1, montoCents: centavos(10000) },
    { semana: 3, montoCents: centavos(60000) },
  ]
  const cheques = [
    { fechaPago: fecha('2026-08-06'), ingresoCents: centavos(100000), esExtra: false },
    { fechaPago: fecha('2026-08-20'), ingresoCents: centavos(100000), esExtra: false },
  ]

  it('suma lo fijo que vence más lo variable asignado', () => {
    const numeros = numerosDeSemanas(AGOSTO, fijos, asignado, cheques)
    expect(numeros.map((n) => [n.fijosCents, n.variableCents, n.totalCents])).toEqual([
      [50000, 10000, 60000],
      [0, 0, 0],
      [60000 + 14200 - 60000, 60000, 74200], // el seguro vence el 18: semana 3
      [0, 0, 0],
      [0, 0, 0],
    ])
  })

  it('la bandera de apretada es acumulada y manda la fecha del cheque', () => {
    // Renta 500 + variable 100 en la semana 1, y el primer cheque (1000)
    // llega el día 6: la semana 1 no está apretada. Pero si el cheque llegara
    // el 10, sí — se vence más de lo que hay.
    const aTiempo = numerosDeSemanas(AGOSTO, fijos, asignado, cheques)
    expect(aTiempo.map((n) => n.apretada)).toEqual([false, false, false, false, false])

    const tarde = numerosDeSemanas(AGOSTO, fijos, asignado, [
      { fechaPago: fecha('2026-08-10'), ingresoCents: centavos(100000), esExtra: false },
      { fechaPago: fecha('2026-08-20'), ingresoCents: centavos(100000), esExtra: false },
    ])
    expect(tarde[0]).toMatchObject({ apretada: true, entraAcumuladoCents: 0 })
    expect(tarde[1]!.apretada).toBe(false)
  })

  it('la bandera cuenta el extra: mide la caja real, no el plan', () => {
    // A diferencia del guardia del servidor, que excluye el extra porque
    // vigila promesas movibles. La bandera informa de la realidad.
    const soloExtra = numerosDeSemanas(
      AGOSTO,
      [{ nombre: 'Renta', diaVencimiento: 28, montoCents: centavos(50000) }],
      [],
      [{ fechaPago: fecha('2026-08-25'), ingresoCents: centavos(50000), esExtra: true }],
    )
    expect(soloExtra[3]!.apretada).toBe(false)
  })
})

describe('el arrastre dentro del mes', () => {
  const asignado = [15000, 15000, 15000, 15000, 0].map(centavos)

  it('lo que sobra pasa al mismo sobre en la semana siguiente', () => {
    const gastado = [12000, 0, 0, 0, 0].map(centavos)
    expect(presupuestoConArrastre(asignado, gastado, 1)).toBe(18000)
    expect(disponibleConArrastre(asignado, gastado, 0)).toBe(3000)
  })

  it('lo que se pasó también viaja, en negativo', () => {
    // Esconder el sobregasto haría que la semana 2 prometiera dinero que ya
    // se fue.
    const gastado = [21000, 0, 0, 0, 0].map(centavos)
    expect(presupuestoConArrastre(asignado, gastado, 1)).toBe(9000)
    expect(disponibleConArrastre(asignado, gastado, 0)).toBe(-6000)
  })

  it('la semana 1 no arrastra nada y el mes entero cierra la cuenta', () => {
    const gastado = [10000, 20000, 5000, 15000, 0].map(centavos)
    expect(presupuestoConArrastre(asignado, gastado, 0)).toBe(15000)
    expect(disponibleConArrastre(asignado, gastado, 4)).toBe(60000 - 50000)
  })
})
