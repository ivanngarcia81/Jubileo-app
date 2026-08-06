import type { DeudaSimulada } from '../lib/deudas'
import type { Centavos } from '../lib/dinero'
import type { FechaCivil } from '../lib/fecha'
import type { Periodo } from '../lib/periodos'

/** Un pago con fecha de vencimiento dentro del periodo. */
export interface Pago {
  id: string
  nombre: string
  /** Día del mes en que vence. */
  diaVencimiento: number
  montoCents: Centavos
  pagado: boolean
  /** La deuda que se está atacando se señala como pago extra. */
  esEnfoque?: boolean
}

/** Categoría variable: el usuario gasta contra un monto apartado. */
export interface Sobre {
  id: string
  nombre: string
  gastadoCents: Centavos
  presupuestoCents: Centavos
}

export interface Fondo {
  id: string
  nombre: string
  metaCents: Centavos
  acumuladoCents: Centavos
  /** Mes en que se quiere tener el dinero, en texto: "Diciembre". */
  mesObjetivo: string
  mesesQueFaltan: number
  porChequeCents: Centavos
}

export interface LineaMes {
  id: string
  nombre: string
  icono: string
  detalle: string
  montoMensualCents: Centavos
}

export interface Movimiento {
  id: string
  nombre: string
  icono: string
  categoria: string
  fecha: FechaCivil
  montoCents: Centavos
  tipo: 'gasto' | 'ingreso'
}

export interface ResumenMesPasado {
  etiqueta: string
  entraCents: Centavos
  saleCents: Centavos
  sobroCents: Centavos
}

export interface Presupuesto {
  usuario: {
    nombre: string
    iniciales: string
    nivel: 'gratis' | 'premium'
    frecuencia: string
  }
  mes: { anio: number; mes: number; etiqueta: string }
  periodos: Periodo[]
  /** Índice del periodo en curso dentro de `periodos`. */
  periodoActivo: number
  ingresoPorChequeCents: Centavos
  /** Lo que queda libre en cada periodo, en el mismo orden que `periodos`. */
  libreporPeriodoCents: Centavos[]

  entraCents: Centavos
  saleCents: Centavos
  sinRepartirCents: Centavos
  aLaDeudaCents: Centavos
  variacionEntra: string
  variacionSale: string

  pagos: Pago[]
  sobres: Sobre[]
  mayordomia: LineaMes
  fijos: LineaMes[]
  fondos: Fondo[]
  deudas: (DeudaSimulada & {
    pagoActualCents: Centavos
    esEnfoque: boolean
    /** Con cuánto empezó. La barra mide lo que ya lleva pagado. */
    saldoInicialCents: Centavos
  })[]
  movimientos: Movimiento[]
  mesesPasados: ResumenMesPasado[]

  /** Desde cuándo se cuenta la fecha de libertad. */
  inicioDeudas: FechaCivil
  /**
   * Nota del bloque "Vale la pena revisar". Opcional: no sale de la base
   * todavía, y una tarjeta que no se puede llenar no se dibuja.
   */
  observacion?: { titulo: string; cuerpo: string }
  /** Solo cuando el usuario comparte su presupuesto con un coach. */
  coach?: { iniciales: string; titulo: string; detalle: string }
}
