import { describe, expect, it } from 'vitest'
import { centavos } from '../dinero'
import { ritmoDelPlan } from './ritmo'

const ritmo = (planeado: number, gastado: number, dia: number, dias = 7) =>
  ritmoDelPlan(centavos(planeado), centavos(gastado), dia, dias)

describe('el ritmo del plan', () => {
  it('el primer día espera un séptimo', () => {
    // $700 en siete días: el lunes tocarían $100.
    expect(ritmo(70000, 0, 1).esperadoCents).toBe(10000)
  })

  it('a media semana espera la mitad', () => {
    expect(ritmo(70000, 0, 4).esperadoCents).toBe(40000)
  })

  it('el último día espera el planeado entero, al centavo', () => {
    // La razón de repartir y sumar en vez de multiplicar y redondear: con
    // 100003 entre 7, cualquier redondeo por día dejaría el último día
    // esperando 100002 o 100004.
    expect(ritmo(100003, 0, 7).esperadoCents).toBe(100003)
    expect(ritmo(100003, 0, 3, 3).esperadoCents).toBe(100003)
  })

  it('dice por cuánto vas por encima', () => {
    // Martes con $180 de $300: tocarían $85.72, así que vas $94.28 arriba.
    const r = ritmo(30000, 18000, 2)
    expect(r.esperadoCents).toBe(8572)
    expect(r.diferenciaCents).toBe(9428)
  })

  it('y por cuánto vas por debajo', () => {
    const r = ritmo(70000, 20000, 5)
    expect(r.esperadoCents).toBe(50000)
    expect(r.diferenciaCents).toBe(-30000)
  })

  it('la quinta semana mide sus días, no siete', () => {
    // 29, 30 y 31 de agosto: tres días. El segundo espera dos tercios.
    const r = ritmo(30000, 0, 2, 3)
    expect(r.esperadoCents).toBe(20000)
  })

  it('el día cero no espera nada: todo lo gastado va por encima', () => {
    const r = ritmo(30000, 5000, 0)
    expect(r.esperadoCents).toBe(0)
    expect(r.diferenciaCents).toBe(5000)
  })

  it('un día fuera de rango se recorta en vez de reventar', () => {
    expect(ritmo(70000, 0, 99).esperadoCents).toBe(70000)
    expect(ritmo(70000, 0, -3).esperadoCents).toBe(0)
  })

  it('sin plan no hay ritmo del que salirse', () => {
    // Un sobre recién creado, todavía en cero. Sin esto, dividir entre cero
    // pintaría de rojo una semana en la que no se ha decidido nada.
    const r = ritmo(0, 4000, 3)
    expect(r.esperadoCents).toBe(0)
    expect(r.diferenciaCents).toBe(4000)
  })

  it('una semana de cero días no existe, y no truena', () => {
    expect(ritmoDelPlan(centavos(70000), centavos(0), 1, 0).esperadoCents).toBe(0)
  })
})
