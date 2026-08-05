import { describe, expect, it } from 'vitest'
import { centavos } from '../dinero'
import { fecha } from '../fecha'
import { type DeudaSimulada, deudaDeEnfoque, mesesQueSeAdelanta, simular } from './index'

const AGOSTO = fecha('2026-08-01')

const DEUDAS: DeudaSimulada[] = [
  {
    id: 'capital-one',
    nombre: 'Capital One',
    saldoCents: centavos(124000),
    pagoMinimoCents: centavos(3500),
    tasaInteres: 24.9,
  },
  {
    id: 'carro',
    nombre: 'Préstamo del carro',
    saldoCents: centavos(890000),
    pagoMinimoCents: centavos(31000),
    tasaInteres: 7.5,
  },
  {
    id: 'estudiantil',
    nombre: 'Préstamo estudiantil',
    saldoCents: centavos(826000),
    pagoMinimoCents: centavos(9500),
    tasaInteres: 5.5,
  },
]

describe('la fecha de libertad', () => {
  it('la de enfoque es la de menor saldo', () => {
    expect(deudaDeEnfoque(DEUDAS)?.id).toBe('capital-one')
  })

  it('el pago extra va completo a la de enfoque, y la termina primero', () => {
    const { orden } = simular(DEUDAS, centavos(11500), AGOSTO)
    expect(orden[0]!.deudaId).toBe('capital-one')
  })

  it('con puros mínimos, la más chica puede no ser la primera en caer', () => {
    // Capital One debe $1,240 al 24.9%: su interés mensual es de unos $25.70
    // y su mínimo es de $35. Abona nueve dólares al mes. El préstamo del
    // carro se termina antes aunque deba siete veces más.
    //
    // Esto no es un defecto del cálculo: es exactamente el argumento del
    // deslizador de "¿y si mandas un pago extra?".
    const { orden } = simular(DEUDAS, centavos(0), AGOSTO)
    expect(orden[0]!.deudaId).toBe('carro')
    expect(orden.find((p) => p.deudaId === 'capital-one')!.mes).toBeGreaterThan(orden[0]!.mes)
  })

  it('sale de deudas en una fecha concreta', () => {
    const r = simular(DEUDAS, centavos(0), AGOSTO)
    expect(r.mesesHastaLibertad).not.toBeNull()
    expect(r.fechaLibertad).not.toBeNull()
    expect(r.orden).toHaveLength(3)
    // Todas quedan pagadas, y la última coincide con la fecha de libertad.
    expect(r.orden.at(-1)!.fechaPagada).toBe(r.fechaLibertad)
  })

  it('el pago mensual no baja cuando una deuda se termina', () => {
    // El pago total es la suma de los mínimos más el extra, y se mantiene.
    const r = simular(DEUDAS, centavos(15000), AGOSTO)
    expect(r.pagoMensualCents).toBe(3500 + 31000 + 9500 + 15000)
  })

  it('un pago extra adelanta la fecha', () => {
    const sin = simular(DEUDAS, centavos(0), AGOSTO).mesesHastaLibertad!
    const con = simular(DEUDAS, centavos(15000), AGOSTO).mesesHastaLibertad!
    expect(con).toBeLessThan(sin)
    expect(mesesQueSeAdelanta(DEUDAS, centavos(15000), AGOSTO)).toBe(sin - con)
  })

  it('mientras más extra, más se adelanta — nunca al revés', () => {
    let anterior = Infinity
    for (const extra of [0, 5000, 10000, 20000, 50000, 100000]) {
      const meses = simular(DEUDAS, centavos(extra), AGOSTO).mesesHastaLibertad!
      expect(meses).toBeLessThanOrEqual(anterior)
      anterior = meses
    }
  })

  it('cobra interés: pagar solo los mínimos cuesta más que pagar de golpe', () => {
    const conInteres = simular(DEUDAS, centavos(0), AGOSTO)
    expect(conInteres.totalInteresCents).toBeGreaterThan(0)

    const sinInteres = simular(
      DEUDAS.map((d) => ({ ...d, tasaInteres: 0 })),
      centavos(0),
      AGOSTO,
    )
    expect(sinInteres.totalInteresCents).toBe(0)
    expect(sinInteres.mesesHastaLibertad!).toBeLessThan(conInteres.mesesHastaLibertad!)
  })

  it('avisa cuando el pago no alcanza ni para el interés', () => {
    const impagable: DeudaSimulada[] = [
      {
        id: 'tarjeta',
        nombre: 'Tarjeta',
        saldoCents: centavos(1_000_000),
        pagoMinimoCents: centavos(100),
        tasaInteres: 29.9,
      },
    ]
    const r = simular(impagable, centavos(0), AGOSTO)
    expect(r.mesesHastaLibertad).toBeNull()
    expect(r.fechaLibertad).toBeNull()
  })

  it('sin deudas, la libertad es hoy', () => {
    const r = simular([], centavos(0), AGOSTO)
    expect(r.mesesHastaLibertad).toBe(0)
    expect(r.fechaLibertad).toBe(AGOSTO)
    expect(deudaDeEnfoque([])).toBeNull()
  })

  it('no toca las deudas que le pasan', () => {
    const copia = structuredClone(DEUDAS)
    simular(DEUDAS, centavos(50000), AGOSTO)
    expect(DEUDAS).toEqual(copia)
  })

  it('ignora las que ya están pagadas', () => {
    const conPagada = [...DEUDAS, { ...DEUDAS[0]!, id: 'vieja', saldoCents: centavos(0) }]
    expect(simular(conPagada, centavos(0), AGOSTO).orden.map((p) => p.deudaId)).not.toContain(
      'vieja',
    )
  })
})
