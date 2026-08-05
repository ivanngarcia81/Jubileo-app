import { describe, expect, it } from 'vitest'
import { type FechaCivil, diaDe, fecha } from '../fecha'
import { generarPeriodos, mesPorDefecto, mesQueFinancia, perteneceAlMes } from './index'
import type { Anulaciones, ConfigPago, MesObjetivo } from './tipos'

/**
 * PRUEBA EXIGIDA 4 — un cheque que cae el 28–31 y financia el mes siguiente.
 *
 * Regla: un cheque se asigna al mes que financia, no al mes en que cae. Por
 * defecto va al mes de su fecha de pago; el usuario lo mueve con un control
 * explícito y la app respeta esa decisión.
 */

// Ancla en viernes: los cheques caen 2, 16 y 30 de enero de 2026.
const CONFIG: ConfigPago = { frecuencia: 'cada_dos_semanas', fechaAncla: fecha('2026-01-02') }
const CHEQUE_DE_FIN_DE_MES = fecha('2026-01-30')
const FEBRERO: MesObjetivo = { anio: 2026, mes: 2 }
const ENERO: MesObjetivo = { anio: 2026, mes: 1 }

const pagos = (mes: MesObjetivo, anulaciones?: Anulaciones): FechaCivil[] =>
  generarPeriodos(CONFIG, mes, anulaciones ? { anulaciones } : {}).map((p) => p.fechaPago)

describe('un cheque que cae a fin de mes', () => {
  it('por defecto pertenece al mes en que cae', () => {
    expect(diaDe(CHEQUE_DE_FIN_DE_MES)).toBe(30)
    expect(mesPorDefecto(CHEQUE_DE_FIN_DE_MES)).toEqual(ENERO)
    expect(pagos(ENERO)).toContain(CHEQUE_DE_FIN_DE_MES)
    expect(pagos(FEBRERO)).not.toContain(CHEQUE_DE_FIN_DE_MES)
  })

  it('se muda al mes que financia cuando el usuario lo dice', () => {
    const anulaciones: Anulaciones = new Map([[CHEQUE_DE_FIN_DE_MES, FEBRERO]])

    expect(mesQueFinancia(CHEQUE_DE_FIN_DE_MES, anulaciones)).toEqual(FEBRERO)
    expect(perteneceAlMes(CHEQUE_DE_FIN_DE_MES, FEBRERO, anulaciones)).toBe(true)

    // Sale de enero y entra en febrero. En ningún momento está en los dos.
    expect(pagos(ENERO, anulaciones)).toEqual(['2026-01-02', '2026-01-16'])
    expect(pagos(FEBRERO, anulaciones)).toEqual(['2026-01-30', '2026-02-13', '2026-02-27'])
  })

  it('el cheque mudado se renumera dentro de su mes nuevo', () => {
    const anulaciones: Anulaciones = new Map([[CHEQUE_DE_FIN_DE_MES, FEBRERO]])
    const febrero = generarPeriodos(CONFIG, FEBRERO, { anulaciones })
    expect(febrero.map((p) => p.numero)).toEqual([1, 2, 3])
    expect(febrero[0]!.fechaPago).toBe(CHEQUE_DE_FIN_DE_MES)
  })

  it('funciona igual con un cheque del 31 que paga el mes siguiente', () => {
    // Ancla en lunes: hay cheque el 31 de agosto de 2026.
    const config: ConfigPago = { frecuencia: 'cada_dos_semanas', fechaAncla: fecha('2026-01-05') }
    const treintaYUno = fecha('2026-08-31')
    const septiembre: MesObjetivo = { anio: 2026, mes: 9 }
    const anulaciones: Anulaciones = new Map([[treintaYUno, septiembre]])

    const agostoSinMudar = generarPeriodos(config, { anio: 2026, mes: 8 })
    expect(agostoSinMudar.map((p) => p.fechaPago)).toContain(treintaYUno)
    expect(agostoSinMudar[2]!.esExtra).toBe(true)

    // Al mudarlo, agosto deja de ser mes de 3 cheques y septiembre pasa a serlo.
    const agosto = generarPeriodos(config, { anio: 2026, mes: 8 }, { anulaciones })
    expect(agosto).toHaveLength(2)
    expect(agosto.some((p) => p.esExtra)).toBe(false)

    const sept = generarPeriodos(config, septiembre, { anulaciones })
    expect(sept.map((p) => p.fechaPago)).toEqual(['2026-08-31', '2026-09-14', '2026-09-28'])
    expect(sept.map((p) => p.esExtra)).toEqual([false, false, true])
  })

  it('mudar un cheque no pierde ninguno: el año sigue teniendo los mismos', () => {
    const anulaciones: Anulaciones = new Map([[CHEQUE_DE_FIN_DE_MES, FEBRERO]])
    let sinMudar = 0
    let mudado = 0
    for (let mes = 1; mes <= 12; mes++) {
      sinMudar += generarPeriodos(CONFIG, { anio: 2026, mes }).length
      mudado += generarPeriodos(CONFIG, { anio: 2026, mes }, { anulaciones }).length
    }
    expect(mudado).toBe(sinMudar)
  })
})
