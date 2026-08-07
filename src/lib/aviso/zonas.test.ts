import { describe, expect, it } from 'vitest'
import { hoyEn, horaEn } from '../../../api/avisos'

/**
 * El aviso corre en la zona horaria del usuario, no en la del servidor. Vercel
 * ejecuta en UTC y el público de Jubileo vive entre California y Nueva York:
 * una hora mal calculada manda el aviso del domingo un sábado por la noche.
 */

describe('la hora del usuario, no la del servidor', () => {
  // 4 de agosto de 2026, 3 de la mañana UTC. En América es todavía el 3.
  const madrugada = new Date('2026-08-04T03:00:00Z')

  it('el día civil cambia según la zona', () => {
    expect(hoyEn('UTC', madrugada)).toBe('2026-08-04')
    expect(hoyEn('America/New_York', madrugada)).toBe('2026-08-03')
    expect(hoyEn('America/Los_Angeles', madrugada)).toBe('2026-08-03')
  })

  it('y la hora también', () => {
    expect(horaEn('UTC', madrugada)).toBe(3)
    expect(horaEn('America/New_York', madrugada)).toBe(23)
    expect(horaEn('America/Los_Angeles', madrugada)).toBe(20)
  })

  it('las ocho de la mañana en Nueva York son las ocho, no las doce', () => {
    const manana = new Date('2026-08-04T12:00:00Z')
    expect(horaEn('America/New_York', manana)).toBe(8)
    expect(hoyEn('America/New_York', manana)).toBe('2026-08-04')
  })

  it('el horario de verano no lo tiene que saber nadie a mano', () => {
    // En enero Nueva York está en UTC-5; en agosto, en UTC-4.
    expect(horaEn('America/New_York', new Date('2026-01-15T12:00:00Z'))).toBe(7)
    expect(horaEn('America/New_York', new Date('2026-08-15T12:00:00Z'))).toBe(8)
  })

  it('una zona inventada no tumba el cron: cae a UTC', () => {
    expect(() => horaEn('Marte/Olympus', madrugada)).not.toThrow()
    expect(horaEn('Marte/Olympus', madrugada)).toBe(3)
  })
})
