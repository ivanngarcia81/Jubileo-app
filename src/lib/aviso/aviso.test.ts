import { describe, expect, it } from 'vitest'
import { centavos } from '../dinero'
import { fecha } from '../fecha'
import { armarAviso, enPalabras, formatearDolares, libreDelAviso } from './contenido'
import { avisoEnHtml, avisoEnTexto } from './correo'
import type { DatosDelAviso } from './contenido'

/**
 * El aviso de arranque es, según el SPEC, la función más importante del
 * producto. Lo que se puede equivocar aquí es la aritmética y el orden.
 */

function datos(cambios: Partial<DatosDelAviso> = {}): DatosDelAviso {
  return {
    nombre: 'Iván',
    fechaPago: fecha('2026-08-04'),
    ingresoCents: centavos(171000),
    pagos: [
      { nombre: 'Renta', dia: 1, montoCents: centavos(90000) },
      { nombre: 'Capital One', dia: 9, montoCents: centavos(15000), esEnfoque: true },
      { nombre: 'Servicios', dia: 5, montoCents: centavos(13000) },
    ],
    sobres: [
      { nombre: 'Comida', montoCents: centavos(15000) },
      { nombre: 'Gasolina', montoCents: centavos(6000) },
    ],
    esExtra: false,
    ...cambios,
  }
}

describe('la fecha en palabras', () => {
  it('dice el día de la semana correcto', () => {
    expect(enPalabras(fecha('2026-08-04'))).toBe('martes 4 de agosto')
    expect(enPalabras(fecha('2026-01-01'))).toBe('jueves 1 de enero')
    expect(enPalabras(fecha('2026-12-31'))).toBe('jueves 31 de diciembre')
  })

  it('no se corre un día según la zona horaria de quien corre el cron', () => {
    // Las pruebas corren en UTC+14. Con `new Date('2026-08-04')` interpretado
    // como local, el primero de mes se vuelve el último del mes anterior.
    expect(enPalabras(fecha('2026-03-01'))).toBe('domingo 1 de marzo')
    expect(enPalabras(fecha('2026-09-01'))).toBe('martes 1 de septiembre')
  })
})

describe('lo que queda libre', () => {
  it('es lo que entra menos los pagos y los sobres', () => {
    // 1710 − (900 + 150 + 130) − (150 + 60) = 320
    expect(libreDelAviso(datos())).toBe(32000)
  })

  it('se dice cuando no alcanza, en vez de esconderlo', () => {
    const a = armarAviso(datos({ ingresoCents: centavos(100000) }))
    expect(a.libreCents).toBe(-39000)
    expect(a.cierre).toContain('Te faltan $390')
    expect(a.cierre).toContain('Algo tiene que moverse')
  })

  it('cuando cuadra exacto, lo dice como logro y no como cero', () => {
    const a = armarAviso(datos({ ingresoCents: centavos(139000) }))
    expect(a.libreCents).toBe(0)
    expect(a.cierre).toBe('Todo tu cheque ya tiene trabajo. No queda suelto.')
  })

  it('con ingreso variable todavía no hay nada que restar', () => {
    expect(libreDelAviso(datos({ ingresoCents: null }))).toBe(-139000)
  })
})

describe('el aviso armado', () => {
  it('sigue el orden del SPEC: entra, vence, sobres, libre', () => {
    const a = armarAviso(datos())
    expect(a.entra).toBe('Entran $1,710 el martes 4 de agosto.')
    expect(a.pagos.map((p) => p.texto)).toEqual([
      'Renta — $900, vence el 1',
      'Servicios — $130, vence el 5',
      'Capital One — $150, vence el 9 (pago extra a tu enfoque)',
    ])
    expect(a.sobres).toEqual(['Comida: $150', 'Gasolina: $60'])
    expect(a.cierre).toBe('Te quedan $320 libres.')
  })

  it('los pagos van por día de vencimiento, no como vinieron', () => {
    // Llegan 1, 9, 5 y salen 1, 5, 9: el aviso se lee en orden de urgencia.
    expect(armarAviso(datos()).pagos.map((p) => p.texto.match(/el (\d+)/)![1])).toEqual([
      '1',
      '5',
      '9',
    ])
  })

  it('señala la deuda de enfoque como pago extra', () => {
    const a = armarAviso(datos())
    expect(a.pagos.filter((p) => p.esEnfoque)).toHaveLength(1)
    expect(a.pagos.find((p) => p.esEnfoque)!.texto).toContain('pago extra a tu enfoque')
  })

  it('con ingreso variable pregunta en vez de afirmar', () => {
    const a = armarAviso(datos({ ingresoCents: null }))
    expect(a.entra).toBe('¿Cuánto entró el martes 4 de agosto?')
  })

  it('el cheque extra se anuncia como lo que es', () => {
    const a = armarAviso(datos({ esExtra: true }))
    expect(a.asunto).toBe('Tu cheque extra de esta semana')
    expect(a.entra).toContain('no lo necesita el mes')
  })

  it('una semana sin nada que vencer no inventa renglones', () => {
    const a = armarAviso(datos({ pagos: [], sobres: [] }))
    expect(a.pagos).toEqual([])
    expect(a.sobres).toEqual([])
    expect(a.cierre).toBe('Te quedan $1,710 libres.')
  })
})

describe('el formato del dinero', () => {
  it('redondea al dólar y separa los miles', () => {
    expect(formatearDolares(centavos(171000))).toBe('$1,710')
    expect(formatearDolares(centavos(50))).toBe('$1')
    expect(formatearDolares(centavos(0))).toBe('$0')
    expect(formatearDolares(centavos(123456789))).toBe('$1,234,568')
  })

  it('el signo va antes del peso, no después', () => {
    expect(formatearDolares(centavos(-39000))).toBe('-$390')
  })
})

describe('el correo', () => {
  const a = armarAviso(datos())
  const html = avisoEnHtml(a, 'https://jubileo-app.vercel.app')

  it('trae todo lo del aviso, sin perder renglones', () => {
    expect(html).toContain('Entran $1,710 el martes 4 de agosto')
    expect(html).toContain('Renta')
    expect(html).toContain('Comida: $150')
    expect(html).toContain('Te quedan $320 libres')
  })

  it('escapa lo que teclea el usuario, que es su nombre de categoría', () => {
    const conMalicia = armarAviso(
      datos({ sobres: [{ nombre: '<script>alert(1)</script>', montoCents: centavos(100) }] }),
    )
    const salida = avisoEnHtml(conMalicia, 'https://x.com')
    expect(salida).not.toContain('<script>')
    expect(salida).toContain('&lt;script&gt;')
  })

  it('la versión en texto dice lo mismo, para quien bloquea el HTML', () => {
    const texto = avisoEnTexto(a, 'https://jubileo-app.vercel.app')
    expect(texto).toContain('Entran $1,710')
    expect(texto).toContain('· Renta — $900, vence el 1')
    expect(texto).toContain('TE QUEDA: $320')
    expect(texto).toContain('https://jubileo-app.vercel.app')
    expect(texto).not.toContain('<')
  })

  it('cuando no alcanza, la cifra se pinta en ámbar y no en turquesa', () => {
    const corto = avisoEnHtml(armarAviso(datos({ ingresoCents: centavos(100000) })), 'https://x.com')
    expect(corto).toContain('#E8A33D')
    expect(corto).toContain('-$390')
  })

  it('no arrastra hojas de estilo ni imágenes: los clientes de correo las cortan', () => {
    expect(html).not.toContain('<link')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('display:flex')
  })
})
