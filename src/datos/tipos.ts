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
  /**
   * El movimiento que lo dio por pagado, para poder deshacerlo. Marcar y
   * desmarcar no son lo mismo: marcar anota un gasto, desmarcar lo borra.
   */
  transaccionId: string | null
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
  /**
   * La llave del mes en el servidor. Nula con los datos de ejemplo, y es
   * justo lo que hace que la demostración no se pueda editar: sin mes real no
   * hay dónde guardar.
   */
  mesId: string | null
  /** El hogar de quien tiene la sesión. Nulo con los datos de ejemplo. */
  hogarId: string | null
  mes: { anio: number; mes: number; etiqueta: string }
  periodos: Periodo[]
  /** Índice del periodo en curso dentro de `periodos`. */
  periodoActivo: number
  /**
   * La llave del cheque en curso. Todo lo que se anota cuelga de él: es lo que
   * hace que un gasto de hoy baje el dinero de esta semana y no el del mes.
   */
  periodoActivoId: string | null
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
  /**
   * Los sobres variables vistos como líneas del mes. `sobres` es lo mismo pero
   * del cheque en curso: aquí va el monto mensual, que es lo que se reparte.
   */
  variables: LineaMes[]
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
