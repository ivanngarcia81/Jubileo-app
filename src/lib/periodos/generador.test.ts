import { describe, expect, it } from 'vitest'
import { centavos } from '../dinero'
import { diasEntre, fecha, sumarDias } from '../fecha'
import { generarPeriodos } from './index'
import type { ConfigPago, MesObjetivo, Periodo } from './tipos'

const LUNES = fecha('2026-01-05')

const pagos = (p: readonly Periodo[]): string[] => p.map((x) => x.fechaPago)
const rangos = (p: readonly Periodo[]): string[] => p.map((x) => `${x.fechaInicio}..${x.fechaFin}`)

/** Propiedades que ningún periodo puede violar, sea cual sea la frecuencia. */
function revisarPropiedades(periodos: readonly Periodo[]): void {
  expect(periodos.length).toBeGreaterThan(0)
  periodos.forEach((p, i) => {
    expect(p.numero).toBe(i + 1)
    expect(p.fechaInicio <= p.fechaPago).toBe(true)
    expect(p.fechaPago <= p.fechaFin).toBe(true)
    const anterior = periodos[i - 1]
    if (anterior) {
      // Ni huecos ni traslapes: el periodo arranca justo al día siguiente.
      expect(p.fechaInicio).toBe(sumarDias(anterior.fechaFin, 1))
    }
  })
}

describe('semanal', () => {
  // PRUEBA EXIGIDA 1 — un mes con 5 semanas.
  it('cuenta 5 semanas cuando el mes trae 5; nunca asume 4', () => {
    const config: ConfigPago = { frecuencia: 'semanal', fechaAncla: LUNES }

    const marzo = generarPeriodos(config, { anio: 2026, mes: 3 })
    expect(marzo).toHaveLength(5)
    expect(pagos(marzo)).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
      '2026-03-23',
      '2026-03-30',
    ])
    // La quinta semana cruza al mes siguiente: es exactamente donde el
    // usuario truena, y por eso tiene que existir.
    expect(marzo[4]!.fechaFin).toBe('2026-04-05')
    revisarPropiedades(marzo)

    const febrero = generarPeriodos(config, { anio: 2026, mes: 2 })
    expect(febrero).toHaveLength(4)
    revisarPropiedades(febrero)
  })

  it('la semana empieza el día que el usuario cobra', () => {
    const viernes = generarPeriodos(
      { frecuencia: 'semanal', fechaAncla: fecha('2026-01-02') },
      { anio: 2026, mes: 4 },
    )
    expect(pagos(viernes)).toEqual(['2026-04-03', '2026-04-10', '2026-04-17', '2026-04-24'])
    expect(rangos(viernes)[0]).toBe('2026-04-03..2026-04-09')
  })

  it('ninguna semana se marca como cheque extra, ni siquiera la quinta', () => {
    const marzo = generarPeriodos({ frecuencia: 'semanal', fechaAncla: LUNES }, { anio: 2026, mes: 3 })
    expect(marzo.some((p) => p.esExtra)).toBe(false)
  })

  it('a lo largo del año todos los meses traen 4 o 5 semanas', () => {
    const config: ConfigPago = { frecuencia: 'semanal', fechaAncla: LUNES }
    for (let mes = 1; mes <= 12; mes++) {
      const p = generarPeriodos(config, { anio: 2026, mes })
      expect([4, 5]).toContain(p.length)
      revisarPropiedades(p)
    }
  })
})

describe('variable', () => {
  it('usa periodos semanales y nunca presupuesta ingreso que no entró', () => {
    const p = generarPeriodos(
      { frecuencia: 'variable', fechaAncla: LUNES, ingresoEsperadoCents: centavos(120000) },
      { anio: 2026, mes: 3 },
    )
    expect(p).toHaveLength(5)
    // Aunque venga un ingreso esperado en la configuración, se ignora.
    expect(p.every((x) => x.ingresoEsperadoCents === null)).toBe(true)
  })
})

describe('dos_veces_al_mes', () => {
  it('siempre son 2 y caen limpios dentro del mes', () => {
    const config: ConfigPago = {
      frecuencia: 'dos_veces_al_mes',
      fechaAncla: fecha('2026-01-01'),
      diasPago: [1, 15],
    }
    const enero = generarPeriodos(config, { anio: 2026, mes: 1 })
    expect(rangos(enero)).toEqual(['2026-01-01..2026-01-14', '2026-01-15..2026-01-31'])
    revisarPropiedades(enero)

    for (let mes = 1; mes <= 12; mes++) {
      const p = generarPeriodos(config, { anio: 2026, mes })
      expect(p).toHaveLength(2)
      expect(p[1]!.fechaFin.slice(0, 7)).toBe(p[0]!.fechaInicio.slice(0, 7))
    }
  })

  // PRUEBA EXIGIDA 3 (parte) — febrero, incluido el bisiesto.
  it('recorta "el último" al 28 o al 29 según el año', () => {
    const config: ConfigPago = {
      frecuencia: 'dos_veces_al_mes',
      fechaAncla: fecha('2026-01-15'),
      diasPago: [15, 31],
    }
    expect(pagos(generarPeriodos(config, { anio: 2026, mes: 2 }))).toEqual([
      '2026-02-15',
      '2026-02-28',
    ])
    expect(pagos(generarPeriodos(config, { anio: 2024, mes: 2 }))).toEqual([
      '2024-02-15',
      '2024-02-29',
    ])
    expect(pagos(generarPeriodos(config, { anio: 2026, mes: 4 }))).toEqual([
      '2026-04-15',
      '2026-04-30',
    ])
  })

  it('exige exactamente dos días de pago', () => {
    const base = { frecuencia: 'dos_veces_al_mes', fechaAncla: LUNES } as const
    expect(() => generarPeriodos(base, { anio: 2026, mes: 1 })).toThrow(RangeError)
    expect(() => generarPeriodos({ ...base, diasPago: [15] }, { anio: 2026, mes: 1 })).toThrow(
      RangeError,
    )
  })
})

describe('mensual', () => {
  it('un solo periodo, que es el mes', () => {
    const p = generarPeriodos(
      { frecuencia: 'mensual', fechaAncla: fecha('2026-01-31') },
      { anio: 2026, mes: 2 },
    )
    expect(p).toHaveLength(1)
    expect(rangos(p)).toEqual(['2026-02-01..2026-02-28'])
    expect(p[0]!.fechaPago).toBe('2026-02-28') // el 31 se recorta
    revisarPropiedades(p)
  })
})

describe('febrero', () => {
  // PRUEBA EXIGIDA 3 — febrero, incluido el año bisiesto.
  it('el último periodo del bisiesto llega hasta el 29', () => {
    const p = generarPeriodos(
      { frecuencia: 'cada_dos_semanas', fechaAncla: fecha('2024-01-05') },
      { anio: 2024, mes: 2 },
    )
    expect(pagos(p)).toEqual(['2024-02-02', '2024-02-16'])
    expect(p[1]!.fechaFin).toBe('2024-02-29')
    revisarPropiedades(p)
  })

  it('febrero de un año normal no inventa el día 29', () => {
    const p = generarPeriodos(
      { frecuencia: 'semanal', fechaAncla: fecha('2026-02-01') },
      { anio: 2026, mes: 2 },
    )
    expect(pagos(p)).toEqual(['2026-02-01', '2026-02-08', '2026-02-15', '2026-02-22'])
    revisarPropiedades(p)
  })
})

describe('entradas inválidas', () => {
  it('rechaza meses y años fuera de rango', () => {
    const config: ConfigPago = { frecuencia: 'semanal', fechaAncla: LUNES }
    const malos: MesObjetivo[] = [
      { anio: 2026, mes: 0 },
      { anio: 2026, mes: 13 },
      { anio: 1800, mes: 1 },
    ]
    for (const m of malos) expect(() => generarPeriodos(config, m)).toThrow(RangeError)
  })
})

describe('el ancla puede estar lejos del mes que se genera', () => {
  it('da lo mismo generar desde un ancla vieja o reciente', () => {
    const vieja = generarPeriodos(
      { frecuencia: 'cada_dos_semanas', fechaAncla: fecha('2019-01-04') },
      { anio: 2026, mes: 8 },
    )
    const reciente = generarPeriodos(
      // 366 pasos de 14 días después: mismo hilo de cheques.
      { frecuencia: 'cada_dos_semanas', fechaAncla: sumarDias(fecha('2019-01-04'), 14 * 100) },
      { anio: 2026, mes: 8 },
    )
    expect(pagos(vieja)).toEqual(pagos(reciente))
    expect(diasEntre(fecha('2019-01-04'), vieja[0]!.fechaPago) % 14).toBe(0)
  })
})
