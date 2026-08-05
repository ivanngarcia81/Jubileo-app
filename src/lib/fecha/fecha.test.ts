import { describe, expect, it } from 'vitest'
import {
  deYMD,
  diaDelMesRecortado,
  diaSemana,
  diasDelMes,
  diasEntre,
  esBisiesto,
  fecha,
  retrocederA,
  sumarDias,
  sumarMeses,
  ultimoDiaDelMes,
} from './index'

describe('fechas civiles', () => {
  it('corre en una zona horaria hostil', () => {
    // La configuración de Vitest fija TZ=Pacific/Kiritimati (UTC+14). Si algo
    // del módulo se escapara a la hora local, esta prueba lo delata.
    expect(process.env['TZ']).toBe('Pacific/Kiritimati')
    expect(new Date().getTimezoneOffset()).toBe(-840)
  })

  it('no se corre un día en UTC+14', () => {
    expect(fecha('2026-03-01')).toBe('2026-03-01')
    expect(sumarDias(fecha('2026-03-01'), 0)).toBe('2026-03-01')
    expect(sumarDias(fecha('2026-02-28'), 1)).toBe('2026-03-01')
  })

  it('rechaza días que no existen', () => {
    expect(() => fecha('2026-02-29')).toThrow(RangeError)
    expect(() => fecha('2026-13-01')).toThrow(RangeError)
    expect(() => fecha('1 de marzo')).toThrow(RangeError)
  })

  it('sabe de años bisiestos, incluidos los siglos', () => {
    expect(esBisiesto(2024)).toBe(true)
    expect(esBisiesto(2026)).toBe(false)
    expect(esBisiesto(2100)).toBe(false)
    expect(esBisiesto(2000)).toBe(true)
    expect(diasDelMes(2024, 2)).toBe(29)
    expect(fecha('2024-02-29')).toBe('2024-02-29')
  })

  it('cruza el fin de año sumando días', () => {
    expect(sumarDias(fecha('2026-12-31'), 1)).toBe('2027-01-01')
    expect(sumarDias(fecha('2027-01-01'), -1)).toBe('2026-12-31')
    expect(diasEntre(fecha('2026-01-01'), fecha('2027-01-01'))).toBe(365)
    expect(diasEntre(fecha('2024-01-01'), fecha('2025-01-01'))).toBe(366)
  })

  it('recorta al sumar meses cuando el mes destino no llega', () => {
    expect(sumarMeses(fecha('2026-01-31'), 1)).toBe('2026-02-28')
    expect(sumarMeses(fecha('2024-01-31'), 1)).toBe('2024-02-29')
    expect(sumarMeses(fecha('2026-03-15'), -3)).toBe('2025-12-15')
  })

  it('recorta el día de pago al último día del mes', () => {
    expect(diaDelMesRecortado(2026, 2, 31)).toBe('2026-02-28')
    expect(diaDelMesRecortado(2024, 2, 31)).toBe('2024-02-29')
    expect(diaDelMesRecortado(2026, 4, 31)).toBe('2026-04-30')
    expect(diaDelMesRecortado(2026, 1, 15)).toBe('2026-01-15')
    expect(ultimoDiaDelMes(2026, 2)).toBe('2026-02-28')
  })

  it('da el día de la semana en UTC', () => {
    expect(diaSemana(fecha('2026-08-03'))).toBe(1) // lunes
    expect(diaSemana(fecha('2026-08-02'))).toBe(0) // domingo
  })

  it('retrocede al día de la semana pedido sin moverse si ya cae ahí', () => {
    expect(retrocederA(fecha('2026-08-05'), 1)).toBe('2026-08-03') // miércoles → lunes
    expect(retrocederA(fecha('2026-08-03'), 1)).toBe('2026-08-03')
    expect(retrocederA(fecha('2026-08-02'), 1)).toBe('2026-07-27') // domingo → lunes previo
  })

  it('las fechas se ordenan como texto', () => {
    const desordenadas = [deYMD(2026, 12, 1), deYMD(2026, 2, 28), deYMD(2026, 2, 3)]
    expect([...desordenadas].sort()).toEqual(['2026-02-03', '2026-02-28', '2026-12-01'])
  })
})
