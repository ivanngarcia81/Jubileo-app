import { describe, expect, it } from 'vitest'
import { fecha } from '../lib/fecha'
import { etiquetaDeDia } from './textos'

describe('el encabezado de un día de movimientos', () => {
  const hoy = fecha('2026-08-08')

  it('dice hoy y ayer, con el día de la semana', () => {
    expect(etiquetaDeDia(fecha('2026-08-08'), hoy)).toBe('Hoy · sábado 8')
    expect(etiquetaDeDia(fecha('2026-08-07'), hoy)).toBe('Ayer · viernes 7')
  })

  it('los demás días del mes van con mayúscula y sin mes', () => {
    expect(etiquetaDeDia(fecha('2026-08-06'), hoy)).toBe('Jueves 6')
  })

  it('un día de otro mes dice de qué mes es', () => {
    // El cheque que financia agosto puede caer el 20 de julio: en la lista de
    // agosto aparecen días de julio, y un "Lunes 20" suelto no dice de cuándo.
    expect(etiquetaDeDia(fecha('2026-07-20'), hoy)).toBe('Lunes 20 de julio')
  })

  it('el mismo día de otro año tampoco se confunde', () => {
    expect(etiquetaDeDia(fecha('2025-08-08'), hoy)).toBe('Viernes 8 de agosto')
  })

  it('ayer cruzando el mes sigue siendo ayer', () => {
    expect(etiquetaDeDia(fecha('2026-07-31'), fecha('2026-08-01'))).toBe('Ayer · viernes 31 de julio')
  })
})
