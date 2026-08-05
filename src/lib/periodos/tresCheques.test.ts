import { describe, expect, it } from 'vitest'
import { centavos } from '../dinero'
import { diaSemana, fecha } from '../fecha'
import { esMesDeTresCheques, generarPeriodos, periodosRepartibles, sugerenciaChequeExtra } from './index'
import type { ConfigPago } from './tipos'

/**
 * PRUEBA EXIGIDA 2 — los meses de 3 cheques en `cada_dos_semanas`, con la
 * fecha ancla en distintos días de la semana.
 *
 * 26 cheques al año, cada 14 días. Dos meses traen 3. Cuál par depende del
 * día en que cae el ancla, así que se recorre la semana completa y se
 * comprueba el año entero — no se asume nada.
 */

const ANCLAS = [
  { ancla: '2026-01-02', diaSemana: 5, tresCheques: [1, 7] },
  { ancla: '2026-01-03', diaSemana: 6, tresCheques: [1, 8] },
  { ancla: '2026-01-04', diaSemana: 0, tresCheques: [3, 8] },
  { ancla: '2026-01-05', diaSemana: 1, tresCheques: [3, 8] },
  { ancla: '2026-01-06', diaSemana: 2, tresCheques: [3, 9] },
  { ancla: '2026-01-07', diaSemana: 3, tresCheques: [4, 9] },
] as const

describe('cada_dos_semanas — meses de 3 cheques', () => {
  it.each(ANCLAS)(
    'ancla $ancla (día $diaSemana): los meses de 3 cheques son $tresCheques',
    ({ ancla, diaSemana: dia, tresCheques }) => {
      const config: ConfigPago = { frecuencia: 'cada_dos_semanas', fechaAncla: fecha(ancla) }
      expect(diaSemana(fecha(ancla))).toBe(dia)

      const conTres: number[] = []
      let totalCheques = 0

      for (let mes = 1; mes <= 12; mes++) {
        const periodos = generarPeriodos(config, { anio: 2026, mes })
        totalCheques += periodos.length
        expect([2, 3]).toContain(periodos.length)

        if (periodos.length === 3) {
          conTres.push(mes)
          expect(esMesDeTresCheques(periodos)).toBe(true)
          // El tercero, y solo el tercero, es el extra.
          expect(periodos.map((p) => p.esExtra)).toEqual([false, false, true])
          // Y no entra en el reparto entre categorías.
          expect(periodosRepartibles(periodos)).toHaveLength(2)
        } else {
          expect(esMesDeTresCheques(periodos)).toBe(false)
          expect(periodos.some((p) => p.esExtra)).toBe(false)
        }
      }

      expect(conTres).toEqual([...tresCheques])
      expect(totalCheques).toBe(26)
    },
  )

  it('un ancla el 1 de enero deja 27 cheques en el año calendario', () => {
    // 26 × 14 = 364 días: con el ancla en el primer día del año, el cheque
    // del día 364 todavía cae dentro. Es real y la app no debe ocultarlo.
    const config: ConfigPago = { frecuencia: 'cada_dos_semanas', fechaAncla: fecha('2026-01-01') }
    const conTres: number[] = []
    let total = 0
    for (let mes = 1; mes <= 12; mes++) {
      const p = generarPeriodos(config, { anio: 2026, mes })
      total += p.length
      if (p.length === 3) conTres.push(mes)
    }
    expect(conTres).toEqual([1, 7, 12])
    expect(total).toBe(27)
  })

  it('el cheque extra dura sus 14 días como cualquier otro', () => {
    const agosto = generarPeriodos(
      { frecuencia: 'cada_dos_semanas', fechaAncla: fecha('2026-01-05') },
      { anio: 2026, mes: 8 },
    )
    expect(agosto.map((p) => `${p.fechaInicio}..${p.fechaFin}`)).toEqual([
      '2026-08-03..2026-08-16',
      '2026-08-17..2026-08-30',
      '2026-08-31..2026-09-13',
    ])
    expect(agosto[2]!.esExtra).toBe(true)
  })

  it('el ingreso esperado viaja a cada cheque, extra incluido', () => {
    const [primero, , extra] = generarPeriodos(
      {
        frecuencia: 'cada_dos_semanas',
        fechaAncla: fecha('2026-01-05'),
        ingresoEsperadoCents: centavos(124000),
      },
      { anio: 2026, mes: 8 },
    )
    expect(primero!.ingresoEsperadoCents).toBe(124000)
    expect(extra!.ingresoEsperadoCents).toBe(124000)
  })
})

describe('a dónde va el cheque extra', () => {
  it('a la deuda de enfoque cuando hay una', () => {
    expect(
      sugerenciaChequeExtra([
        { id: 'carro', esEnfoque: false, pagadaEn: null },
        { id: 'capital-one', esEnfoque: true, pagadaEn: null },
      ]),
    ).toEqual({ tipo: 'deuda_enfoque', deudaId: 'capital-one' })
  })

  it('al fondo de emergencia cuando ya no hay deudas', () => {
    expect(sugerenciaChequeExtra([])).toEqual({ tipo: 'fondo_emergencia' })
    expect(
      sugerenciaChequeExtra([{ id: 'carro', esEnfoque: true, pagadaEn: '2026-05-01' }]),
    ).toEqual({ tipo: 'fondo_emergencia' })
  })
})
