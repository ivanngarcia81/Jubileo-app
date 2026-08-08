import { type Centavos, suma, centavos } from '../dinero/index.js'
import type { FechaCivil } from '../fecha/index.js'

/**
 * Qué dice el aviso de arranque de periodo.
 *
 * La sección 9 del SPEC lo llama la función más importante del producto, y fija
 * el orden: cuánto entra y qué día, qué vence dentro del periodo, los montos de
 * los sobres, y cuánto queda libre. Ese orden no es decorativo — es la
 * secuencia en la que alguien decide si puede gastar algo hoy.
 *
 * Puro: sin correo, sin base, sin reloj. Lo que se puede equivocar aquí es la
 * aritmética y el orden, y las dos cosas se prueban sin levantar nada. El envío
 * vive en el cron y no calcula nada.
 */

export interface PagoDelAviso {
  nombre: string
  /** Día del mes en que vence. */
  dia: number
  montoCents: Centavos
  /** La deuda que se está atacando se señala como pago extra. */
  esEnfoque?: boolean
}

export interface SobreDelAviso {
  nombre: string
  montoCents: Centavos
}

export interface DatosDelAviso {
  nombre: string
  fechaPago: FechaCivil
  /** Nulo cuando el ingreso es variable: entonces la pregunta cambia. */
  ingresoCents: Centavos | null
  pagos: readonly PagoDelAviso[]
  sobres: readonly SobreDelAviso[]
  /** Cheque de más: no financia el mes, llega entero. */
  esExtra: boolean
}

export interface Aviso {
  asunto: string
  /** Renglones en el orden del SPEC. El correo y el push los pintan distinto. */
  saludo: string
  entra: string
  pagos: { texto: string; esEnfoque: boolean }[]
  sobres: string[]
  libreCents: Centavos
  cierre: string
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** "martes 4 de agosto". Sin año: el aviso siempre habla de esta semana. */
export function enPalabras(f: FechaCivil): string {
  const [a, m, d] = f.split('-').map(Number) as [number, number, number]
  // `Date.UTC` a propósito: la fecha civil no tiene zona, y el día de la semana
  // sale del calendario, no del reloj de quien corre el cron.
  const dia = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]
  return `${dia} ${d} de ${MESES[m - 1]}`
}

export function formatearDolares(c: Centavos): string {
  const signo = c < 0 ? '-' : ''
  const entero = Math.round(Math.abs(c) / 100)
  return `${signo}$${entero.toLocaleString('en-US')}`
}

/**
 * Cuánto queda libre: lo que entra menos todo lo que ya tiene trabajo. Puede
 * salir negativo, y cuando sale se dice — un aviso que esconde que no alcanza
 * es peor que no mandar aviso.
 */
export function libreDelAviso(d: DatosDelAviso): Centavos {
  const entra = d.ingresoCents ?? centavos(0)
  const comprometido = suma([
    ...d.pagos.map((p) => p.montoCents),
    ...d.sobres.map((s) => s.montoCents),
  ])
  return centavos(entra - comprometido)
}

export function armarAviso(d: DatosDelAviso): Aviso {
  const libre = libreDelAviso(d)

  const entra =
    d.ingresoCents === null
      ? `¿Cuánto entró el ${enPalabras(d.fechaPago)}?`
      : d.esExtra
        ? `Entran ${formatearDolares(d.ingresoCents)} el ${enPalabras(d.fechaPago)}. Este es cheque extra: no lo necesita el mes.`
        : `Entran ${formatearDolares(d.ingresoCents)} el ${enPalabras(d.fechaPago)}.`

  const pagos = [...d.pagos]
    .sort((a, b) => a.dia - b.dia)
    .map((p) => ({
      texto: `${p.nombre} — ${formatearDolares(p.montoCents)}, vence el ${p.dia}${
        p.esEnfoque ? ' (pago extra a tu enfoque)' : ''
      }`,
      esEnfoque: Boolean(p.esEnfoque),
    }))

  const sobres = d.sobres.map((s) => `${s.nombre}: ${formatearDolares(s.montoCents)}`)

  const cierre =
    libre < 0
      ? `Te faltan ${formatearDolares(centavos(-libre))} para cubrir este cheque. Algo tiene que moverse.`
      : libre === 0
        ? 'Todo tu cheque ya tiene trabajo. No queda suelto.'
        : `Te quedan ${formatearDolares(libre)} libres.`

  return {
    asunto: d.esExtra ? 'Tu cheque extra de esta semana' : 'Tu semana en Jubileo',
    saludo: `Hola, ${d.nombre}.`,
    entra,
    pagos,
    sobres,
    libreCents: libre,
    cierre,
  }
}
