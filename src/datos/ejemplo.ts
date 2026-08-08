import { centavos } from '../lib/dinero'
import { fecha } from '../lib/fecha'
import { type Anulaciones, type ConfigPago, generarPeriodos } from '../lib/periodos'
import type { Presupuesto } from './tipos'

/**
 * Datos de ejemplo — TEMPORAL.
 *
 * Son los mismos números del contrato visual (`design/movil.html` y
 * `design/escritorio.html`) para poder comparar la app contra el mockup lado
 * a lado. Cuando el servidor exista, esto se cambia por la consulta real y
 * las pantallas no se tocan: reciben un `Presupuesto` y ya.
 *
 * Los periodos NO están escritos a mano: salen del motor de `lib/periodos`.
 * El mes muestra cheques del 20 de julio, 3 y 17 de agosto — o sea, un cheque
 * de julio que el usuario movió a agosto porque es el que financia agosto, y
 * el del 31 movido a septiembre. Eso es la regla del mes que financia, y es
 * lo que dibuja el mockup.
 */

const ANULACIONES: Anulaciones = new Map([
  [fecha('2026-07-20'), { anio: 2026, mes: 8 }],
  [fecha('2026-08-31'), { anio: 2026, mes: 9 }],
])

const CONFIG: ConfigPago = {
  frecuencia: 'cada_dos_semanas',
  fechaAncla: fecha('2026-08-03'),
  ingresoEsperadoCents: centavos(124000),
}

const PERIODOS = generarPeriodos(CONFIG, { anio: 2026, mes: 8 }, { anulaciones: ANULACIONES })

export const PRESUPUESTO_EJEMPLO: Presupuesto = {
  usuario: {
    nombre: 'Iván',
    iniciales: 'IV',
    nivel: 'premium',
    nivelVenceEn: null,
    onboardingTerminado: true,
    aviso: { horaLocal: '08:00', activo: true },
    frecuencia: 'Cada dos semanas',
  },

  // Sin mes en el servidor: la demostración se ve pero no se edita.
  mesId: null,
  hogarId: null,
  mes: { anio: 2026, mes: 8, etiqueta: 'Agosto 2026' },
  mesCerrado: false,
  periodos: PERIODOS,
  periodoActivo: 1,
  periodoActivoId: null,
  ingresoPorChequeCents: centavos(124000),
  libreporPeriodoCents: [centavos(0), centavos(6500), centavos(120000)],

  entraCents: centavos(368000),
  saleCents: centavos(368000),
  sinRepartirCents: centavos(0),
  aLaDeudaCents: centavos(165000),
  variacionEntra: '+$1,200',
  variacionSale: '+4%',

  pagos: [
    {
      id: 'renta',
      nombre: 'Renta',
      diaVencimiento: 3,
      montoCents: centavos(90000),
      pagado: true,
      transaccionId: null,
    },
    {
      id: 'luz',
      nombre: 'Luz — PSE&G',
      diaVencimiento: 4,
      montoCents: centavos(8500),
      pagado: true,
      transaccionId: null,
    },
    {
      id: 'capital-one',
      nombre: 'Capital One',
      diaVencimiento: 9,
      montoCents: centavos(15000),
      pagado: false,
      transaccionId: null,
      esEnfoque: true,
    },
    {
      id: 'remesa',
      nombre: 'Remesa a la familia',
      diaVencimiento: 10,
      montoCents: centavos(20000),
      pagado: false,
      transaccionId: null,
    },
  ],

  sobres: [
    {
      id: 'comida',
      nombre: 'Comida',
      gastadoCents: centavos(6200),
      presupuestoCents: centavos(15000),
    },
    {
      id: 'gasolina',
      nombre: 'Gasolina',
      gastadoCents: centavos(4800),
      presupuestoCents: centavos(6000),
    },
    {
      id: 'personal',
      nombre: 'Personal',
      gastadoCents: centavos(4000),
      presupuestoCents: centavos(4000),
    },
  ],

  // Los mismos sobres de arriba, pero con su monto del mes entero: es lo que
  // se reparte entre los cheques.
  variables: [
    { id: 'comida', nombre: 'Comida', icono: '◇', detalle: '', montoMensualCents: centavos(45000) },
    { id: 'gasolina', nombre: 'Gasolina', icono: '◇', detalle: '', montoMensualCents: centavos(18000) },
    { id: 'personal', nombre: 'Personal', icono: '◇', detalle: '', montoMensualCents: centavos(12000) },
  ],

  mayordomia: {
    id: 'diezmo',
    nombre: 'Diezmo y ofrenda',
    icono: '✦',
    detalle: '10% · en los 2 cheques',
    montoMensualCents: centavos(36800),
  },

  fijos: [
    {
      id: 'renta',
      nombre: 'Renta',
      icono: '⌂',
      detalle: 'Vence el 3 · Cheque 1',
      montoMensualCents: centavos(90000),
    },
    {
      id: 'servicios',
      nombre: 'Luz y agua',
      icono: '⚡',
      detalle: 'Vence el 4 · Cheque 1',
      montoMensualCents: centavos(13000),
    },
    {
      id: 'seguro',
      nombre: 'Seguro del carro',
      icono: '⛨',
      detalle: 'Vence el 18 · Cheque 2',
      montoMensualCents: centavos(14200),
    },
  ],

  fondos: [
    {
      id: 'viaje',
      nombre: 'Viaje al país',
      metaCents: centavos(160000),
      acumuladoCents: centavos(84000),
      mesObjetivo: 'Diciembre',
      mesesQueFaltan: 4,
      porChequeCents: centavos(19000),
    },
    {
      id: 'llantas',
      nombre: 'Llantas',
      metaCents: centavos(60000),
      acumuladoCents: centavos(21000),
      mesObjetivo: 'Octubre',
      mesesQueFaltan: 2,
      porChequeCents: centavos(9800),
    },
    {
      id: 'navidad',
      nombre: 'Navidad',
      metaCents: centavos(80000),
      acumuladoCents: centavos(14400),
      mesObjetivo: 'Diciembre',
      mesesQueFaltan: 4,
      porChequeCents: centavos(9500),
    },
  ],

  deudas: [
    {
      id: 'capital-one',
      nombre: 'Capital One',
      saldoInicialCents: centavos(387500),
      saldoCents: centavos(124000),
      pagoMinimoCents: centavos(3500),
      pagoActualCents: centavos(15000),
      tasaInteres: 24.9,
      esEnfoque: true,
    },
    {
      id: 'carro',
      nombre: 'Préstamo del carro',
      saldoInicialCents: centavos(1450000),
      saldoCents: centavos(890000),
      pagoMinimoCents: centavos(31000),
      pagoActualCents: centavos(31000),
      tasaInteres: 7.5,
      esEnfoque: false,
    },
    {
      id: 'estudiantil',
      nombre: 'Préstamo estudiantil',
      saldoInicialCents: centavos(980000),
      saldoCents: centavos(826000),
      pagoMinimoCents: centavos(9500),
      pagoActualCents: centavos(9500),
      tasaInteres: 5.5,
      esEnfoque: false,
    },
  ],

  movimientos: [
    {
      id: 'm1',
      nombre: 'Cheque de nómina',
      icono: '↓',
      categoria: 'Ingreso',
      fecha: fecha('2026-08-03'),
      montoCents: centavos(124000),
      tipo: 'ingreso',
    },
    {
      id: 'm2',
      nombre: 'Renta',
      icono: '⌂',
      categoria: 'Vivienda',
      fecha: fecha('2026-08-03'),
      montoCents: centavos(90000),
      tipo: 'gasto',
    },
    {
      id: 'm3',
      nombre: 'Diezmo',
      icono: '✦',
      categoria: 'Mayordomía',
      fecha: fecha('2026-08-03'),
      montoCents: centavos(12400),
      tipo: 'gasto',
    },
    {
      id: 'm4',
      nombre: 'PSE&G',
      icono: '⚡',
      categoria: 'Servicios',
      fecha: fecha('2026-08-04'),
      montoCents: centavos(8500),
      tipo: 'gasto',
    },
    {
      id: 'm5',
      nombre: 'Supermercado',
      icono: '☰',
      categoria: 'Comida',
      fecha: fecha('2026-08-04'),
      montoCents: centavos(6200),
      tipo: 'gasto',
    },
  ],

  mesesPasados: [
    { anio: 2026, mes: 3, etiqueta: 'Mar', entraCents: centavos(612000), saleCents: centavos(598000), sobroCents: centavos(14000), alcanzable: true },
    { anio: 2026, mes: 4, etiqueta: 'Abr', entraCents: centavos(684000), saleCents: centavos(661000), sobroCents: centavos(23000), alcanzable: true },
    { anio: 2026, mes: 5, etiqueta: 'May', entraCents: centavos(646000), saleCents: centavos(646000), sobroCents: centavos(0), alcanzable: true },
    { anio: 2026, mes: 6, etiqueta: 'Jun', entraCents: centavos(684000), saleCents: centavos(657000), sobroCents: centavos(27000), alcanzable: true },
    { anio: 2026, mes: 7, etiqueta: 'Jul', entraCents: centavos(684000), saleCents: centavos(659000), sobroCents: centavos(25000), alcanzable: true },
    { anio: 2026, mes: 8, etiqueta: 'Ago', entraCents: centavos(684000), saleCents: centavos(684000), sobroCents: centavos(0), alcanzable: true },
  ],

  inicioDeudas: fecha('2026-08-01'),

  observacion: {
    titulo: 'Mandas $200 al mes en remesas',
    cuerpo:
      'mientras pagas 24.9% de interés en Capital One. Vale la pena verlo con calma.',
  },

  coach: {
    iniciales: 'JF',
    titulo: 'Iván revisó tu mes',
    detalle: 'Dejó 2 notas · hace 3 días',
  },
}

