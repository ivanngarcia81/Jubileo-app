import { describe, expect, it } from 'vitest'
import { fecha } from '../fecha'
import { porDia } from './dias'

const gasto = (f: string, monto: number, id = f) => ({
  id,
  fecha: fecha(f),
  montoCents: monto,
  tipo: 'gasto' as const,
})
const ingreso = (f: string, monto: number, id = f) => ({
  id,
  fecha: fecha(f),
  montoCents: monto,
  tipo: 'ingreso' as const,
})

describe('los movimientos agrupados por día', () => {
  it('junta el mismo día en un solo grupo y suma lo que salió', () => {
    const dias = porDia([gasto('2026-08-08', 4830, 'a'), gasto('2026-08-08', 1490, 'b')])
    expect(dias).toHaveLength(1)
    expect(dias[0]!.salioCents).toBe(6320)
    expect(dias[0]!.movimientos.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('separa lo que entró de lo que salió', () => {
    // El día que cae el cheque también se gasta. Un solo total mezclaría las
    // dos cosas y el encabezado diría una cifra que no es ninguna de las dos.
    const dias = porDia([ingreso('2026-08-06', 124000, 'chq'), gasto('2026-08-06', 12400, 'diezmo')])
    expect(dias[0]!.entroCents).toBe(124000)
    expect(dias[0]!.salioCents).toBe(12400)
  })

  it('va del día más reciente al más viejo, aunque lleguen revueltos', () => {
    const dias = porDia([
      gasto('2026-08-06', 100),
      gasto('2026-08-08', 100),
      gasto('2026-08-07', 100),
    ])
    expect(dias.map((d) => d.fecha)).toEqual(['2026-08-08', '2026-08-07', '2026-08-06'])
  })

  it('un día no se cuela dos veces aunque sus movimientos no vengan juntos', () => {
    const dias = porDia([gasto('2026-08-08', 100, 'a'), gasto('2026-08-07', 100, 'b'), gasto('2026-08-08', 200, 'c')])
    expect(dias).toHaveLength(2)
    expect(dias[0]!.salioCents).toBe(300)
    expect(dias[0]!.movimientos.map((m) => m.id)).toEqual(['a', 'c'])
  })

  it('sin movimientos no hay días', () => {
    expect(porDia([])).toEqual([])
  })

  it('el orden no depende de la zona horaria', () => {
    // Las fechas civiles se comparan como texto. Pasarlas por `Date` haría que
    // el orden cambiara según dónde esté parado el usuario.
    const dias = porDia([gasto('2025-12-31', 100), gasto('2026-01-01', 100)])
    expect(dias.map((d) => d.fecha)).toEqual(['2026-01-01', '2025-12-31'])
  })
})
