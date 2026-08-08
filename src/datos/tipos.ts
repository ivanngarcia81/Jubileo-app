import type { ClaveIcono } from '../componentes/iconos'
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

/**
 * Categoría variable vista desde la semana en curso: lo gastado en la semana
 * contra su presupuesto semanal — lo asignado a la semana más el arrastre de
 * las anteriores.
 */
export interface Sobre {
  id: string
  nombre: string
  gastadoCents: Centavos
  presupuestoCents: Centavos
}

/** Una semana del mes con sus números. El eje donde se presupuesta. */
export interface SemanaDelPresupuesto {
  numero: number
  fechaInicio: FechaCivil
  fechaFin: FechaCivil
  dias: number
  /** Lo fijo (y deudas) que vence en sus días. */
  fijosCents: Centavos
  /** Lo variable asignado a la semana. */
  variableCents: Centavos
  totalCents: Centavos
  /** Todo lo gastado dentro de la semana. */
  gastadoCents: Centavos
  /** Hasta aquí se vence más de lo que ha llegado. Informa, no bloquea. */
  apretada: boolean
}

/** Una fila del plan semanal de una línea repartible. */
export interface AsignacionDeSemana {
  lineaId: string
  semana: number
  montoCents: Centavos
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
  icono: ClaveIcono
  detalle: string
  /** Día del mes en que vence. Nulo en lo variable y la mayordomía. */
  diaVencimiento: number | null
  montoMensualCents: Centavos
  /**
   * Lo gastado contra esta línea en el mes entero. `Sobre.gastadoCents` es lo
   * mismo pero del cheque en curso: son dos preguntas distintas y hay que poder
   * contestar las dos sin confundirlas.
   */
  gastadoCents: Centavos
}

export interface Movimiento {
  id: string
  nombre: string
  icono: ClaveIcono
  categoria: string
  /** Para poder enseñar cómo va ese sobre sin amarrarlo por nombre. */
  categoriaId: string | null
  /** Falso cuando todavía no tiene sobre: el usuario tiene que decidirlo. */
  asignado: boolean
  /** El usuario ya lo vio. Lo que anota a mano nace revisado; lo del banco no. */
  revisado: boolean
  fecha: FechaCivil
  montoCents: Centavos
  tipo: 'gasto' | 'ingreso'
  /**
   * Con qué cheque se pagó. Es el marco del producto —cheque a cheque— y la
   * única manera de saber si un gasto de ayer bajó el dinero de esta semana o
   * el de la pasada.
   */
  cheque: number | null
}

export interface ResumenMesPasado {
  /** Para poder abrirlo al tocarlo: sin esto la barra es un adorno. */
  anio: number
  mes: number
  etiqueta: string
  entraCents: Centavos
  saleCents: Centavos
  sobroCents: Centavos
  /** Si el nivel del usuario le deja abrirlo. Gratis: el actual y el anterior. */
  alcanzable: boolean
}

export interface Presupuesto {
  usuario: {
    nombre: string
    iniciales: string
    nivel: 'gratis' | 'premium'
    /** Cuándo se acaba lo pagado, ya en texto. Nulo si no hay fecha. */
    nivelVenceEn: string | null
    frecuencia: string
    /** Falso mientras falten pasos del onboarding de la sección 7. */
    onboardingTerminado: boolean
    /**
     * Cuándo quiere el aviso, en su reloj. Ausente mientras no lo haya
     * contestado: el cron manda a las 8:00 por omisión, y la pantalla tiene
     * que poder decir la diferencia entre "elegí las 8" y "no he elegido".
     */
    aviso?: { horaLocal: string; activo: boolean }
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
  /** El mes ya se cerró: no se vuelve a cerrar, y el siguiente hereda sus montos. */
  mesCerrado: boolean
  periodos: Periodo[]
  /** Las semanas del mes con sus números: el eje del presupuesto. */
  semanas: SemanaDelPresupuesto[]
  /** Índice de la semana en curso dentro de `semanas`. */
  semanaActiva: number
  /** El plan semanal de lo repartible, para la vista que lo edita. */
  planSemanal: AsignacionDeSemana[]
  /** Índice del periodo en curso dentro de `periodos`. El cheque es el lente. */
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
  /**
   * Las deudas vistas como líneas del mes: lo que se les paga en agosto, no lo
   * que se debe. `deudas` es el saldo y la simulación; esto es el renglón del
   * presupuesto, y sin él El mes enseñaba cuatro grupos cuyos montos no sumaban
   * lo que decía "Sale este mes".
   */
  lineasDeuda: LineaMes[]
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
