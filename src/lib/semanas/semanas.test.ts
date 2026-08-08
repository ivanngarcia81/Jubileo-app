import { describe, expect, it } from 'vitest'
import { fecha } from '../fecha'
import { semanaDeDia, semanaDeFecha, semanaEnCurso, semanasDelMes } from './semanas'

describe('las semanas del mes', () => {
  it('un mes de 31 días tiene 5, y la quinta mide 3', () => {
    const agosto = semanasDelMes(2026, 8)
    expect(agosto.map((s) => [s.fechaInicio, s.fechaFin, s.dias])).toEqual([
      ['2026-08-01', '2026-08-07', 7],
      ['2026-08-08', '2026-08-14', 7],
      ['2026-08-15', '2026-08-21', 7],
      ['2026-08-22', '2026-08-28', 7],
      ['2026-08-29', '2026-08-31', 3],
    ])
    expect(agosto.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5])
  })

  it('un mes de 30 deja una quinta de 2 días', () => {
    const abril = semanasDelMes(2026, 4)
    expect(abril).toHaveLength(5)
    expect(abril[4]).toMatchObject({ fechaInicio: '2026-04-29', fechaFin: '2026-04-30', dias: 2 })
  })

  it('febrero de 29 deja una quinta de un solo día', () => {
    const bisiesto = semanasDelMes(2028, 2)
    expect(bisiesto).toHaveLength(5)
    expect(bisiesto[4]).toMatchObject({ fechaInicio: '2028-02-29', fechaFin: '2028-02-29', dias: 1 })
  })

  it('febrero de 28 tiene exactamente 4: la quinta no existe', () => {
    const febrero = semanasDelMes(2027, 2)
    expect(febrero).toHaveLength(4)
    expect(febrero[3]).toMatchObject({ fechaFin: '2027-02-28', dias: 7 })
  })

  it('los días de las semanas suman los del mes, sin huecos ni traslapes', () => {
    for (const [anio, mes, dias] of [
      [2026, 8, 31],
      [2026, 4, 30],
      [2028, 2, 29],
      [2027, 2, 28],
    ] as const) {
      const semanas = semanasDelMes(anio, mes)
      expect(semanas.reduce((n, s) => n + s.dias, 0)).toBe(dias)
      for (let i = 1; i < semanas.length; i++) {
        expect(semanas[i]!.fechaInicio > semanas[i - 1]!.fechaFin).toBe(true)
      }
    }
  })
})

describe('a qué semana pertenece un día', () => {
  it('los bordes caen donde deben', () => {
    expect(semanaDeDia(1)).toBe(1)
    expect(semanaDeDia(7)).toBe(1)
    expect(semanaDeDia(8)).toBe(2)
    expect(semanaDeDia(14)).toBe(2)
    expect(semanaDeDia(15)).toBe(3)
    expect(semanaDeDia(21)).toBe(3)
    expect(semanaDeDia(22)).toBe(4)
    expect(semanaDeDia(28)).toBe(4)
    expect(semanaDeDia(29)).toBe(5)
    expect(semanaDeDia(31)).toBe(5)
  })

  it('toda fecha cae dentro del rango de su semana', () => {
    // La propiedad completa, no unos cuantos casos: las dos maneras de
    // calcular la semana —por el día y por los rangos— dicen lo mismo.
    const semanas = semanasDelMes(2026, 8)
    for (let dia = 1; dia <= 31; dia++) {
      const f = fecha(`2026-08-${String(dia).padStart(2, '0')}`)
      const semana = semanas[semanaDeFecha(f) - 1]!
      expect(f >= semana.fechaInicio && f <= semana.fechaFin).toBe(true)
    }
  })
})

describe('la semana en curso', () => {
  const agosto = semanasDelMes(2026, 8)

  it('manda la fecha', () => {
    expect(semanaEnCurso(agosto, fecha('2026-08-01'))).toBe(0)
    expect(semanaEnCurso(agosto, fecha('2026-08-08'))).toBe(1)
    expect(semanaEnCurso(agosto, fecha('2026-08-31'))).toBe(4)
  })

  it('fuera del mes: antes, la primera; después, la última', () => {
    // Mirando septiembre desde agosto se empieza por el principio; mirando
    // julio ya cerrado se cae en su última semana, no en un índice inventado.
    expect(semanaEnCurso(agosto, fecha('2026-07-15'))).toBe(0)
    expect(semanaEnCurso(agosto, fecha('2026-09-02'))).toBe(4)
  })
})
