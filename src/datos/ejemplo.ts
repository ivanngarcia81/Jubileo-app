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
  // Lo que suman las tres líneas de deuda de abajo. Estaba en $1,650, que no
  // salía de ningún lado: los pagos de la demostración son 150 + 310 + 95.
  aLaDeudaCents: centavos(55500),
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
  // se reparte entre los cheques. `gastadoCents` aquí es del mes; el de
  // `sobres` es del cheque en curso, y por eso es más chico.
  //
  // Los tres traen a propósito un avance distinto —63%, 88% y pasado— para que
  // la demostración enseñe los tres colores de la regla 4 de los tokens.
  variables: [
    { id: 'comida', nombre: 'Comida', icono: 'variable', detalle: '', montoMensualCents: centavos(45000), gastadoCents: centavos(28400) },
    { id: 'gasolina', nombre: 'Gasolina', icono: 'variable', detalle: '', montoMensualCents: centavos(18000), gastadoCents: centavos(15900) },
    { id: 'personal', nombre: 'Personal', icono: 'variable', detalle: '', montoMensualCents: centavos(12000), gastadoCents: centavos(12800) },
  ],

  mayordomia: {
    id: 'diezmo',
    nombre: 'Diezmo y ofrenda',
    icono: 'mayordomia',
    detalle: '10% · en los 2 cheques',
    montoMensualCents: centavos(36800),
    gastadoCents: centavos(36800),
  },

  fijos: [
    {
      id: 'renta',
      nombre: 'Renta',
      icono: 'casa',
      detalle: 'Vence el 3 · Cheque 1',
      montoMensualCents: centavos(90000),
      gastadoCents: centavos(90000),
    },
    {
      id: 'servicios',
      nombre: 'Luz y agua',
      icono: 'servicios',
      detalle: 'Vence el 4 · Cheque 1',
      montoMensualCents: centavos(13000),
      gastadoCents: centavos(8500),
    },
    {
      id: 'seguro',
      nombre: 'Seguro del carro',
      icono: 'seguro',
      detalle: 'Vence el 18 · Cheque 2',
      montoMensualCents: centavos(14200),
      gastadoCents: centavos(0),
    },
  ],

  lineasDeuda: [
    {
      id: 'c-capital-one',
      nombre: 'Capital One',
      icono: 'deuda',
      detalle: 'Vence el 9 · Cheque 2',
      montoMensualCents: centavos(15000),
      gastadoCents: centavos(0),
    },
    {
      id: 'c-estudiantil',
      nombre: 'Préstamo estudiantil',
      icono: 'deuda',
      detalle: 'Vence el 21 · Cheque 2',
      montoMensualCents: centavos(9500),
      gastadoCents: centavos(9500),
    },
    {
      id: 'c-carro',
      nombre: 'Préstamo del carro',
      icono: 'deuda',
      detalle: 'Vence el 15 · Cheque 2',
      montoMensualCents: centavos(31000),
      gastadoCents: centavos(31000),
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

  // Los movimientos del mes, cuadrados con lo gastado de cada línea de arriba:
  // Comida 284.00, Gasolina 159.00, Personal 128.00, Renta 900, Luz 85,
  // Diezmo 368 y los dos pagos de deuda. Si se tocan aquí, se tocan allá.
  //
  // El cheque 1 va del 20 de julio al 2 de agosto y el 2 del 3 al 16.
  movimientos: [
    { id: 'm16', nombre: 'Farmacia del Ahorro', icono: 'gasto', categoria: 'Sin asignar', asignado: false, revisado: false, fecha: fecha('2026-08-08'), montoCents: centavos(1800), tipo: 'gasto', cheque: 2 },
    { id: 'm15', nombre: 'Ropa de trabajo', icono: 'variable', categoria: 'Personal', asignado: true, revisado: true, fecha: fecha('2026-08-08'), montoCents: centavos(4000), tipo: 'gasto', cheque: 2 },
    { id: 'm14', nombre: 'Cine', icono: 'variable', categoria: 'Personal', asignado: true, revisado: true, fecha: fecha('2026-08-08'), montoCents: centavos(4000), tipo: 'gasto', cheque: 2 },
    { id: 'm13', nombre: 'Wawa', icono: 'transporte', categoria: 'Gasolina', asignado: true, revisado: true, fecha: fecha('2026-08-08'), montoCents: centavos(4800), tipo: 'gasto', cheque: 2 },
    { id: 'm12', nombre: 'Préstamo estudiantil', icono: 'deuda', categoria: 'Préstamo estudiantil', asignado: true, revisado: true, fecha: fecha('2026-08-07'), montoCents: centavos(9500), tipo: 'gasto', cheque: 2 },
    { id: 'm11', nombre: 'Shell', icono: 'transporte', categoria: 'Gasolina', asignado: true, revisado: true, fecha: fecha('2026-08-07'), montoCents: centavos(5500), tipo: 'gasto', cheque: 2 },
    { id: 'm10', nombre: 'Supermercado González', icono: 'comida', categoria: 'Comida', asignado: true, revisado: true, fecha: fecha('2026-08-06'), montoCents: centavos(6200), tipo: 'gasto', cheque: 2 },
    { id: 'm9', nombre: 'Préstamo del carro', icono: 'deuda', categoria: 'Préstamo del carro', asignado: true, revisado: true, fecha: fecha('2026-08-05'), montoCents: centavos(31000), tipo: 'gasto', cheque: 2 },
    { id: 'm8', nombre: 'PSE&G', icono: 'servicios', categoria: 'Luz y agua', asignado: true, revisado: true, fecha: fecha('2026-08-04'), montoCents: centavos(8500), tipo: 'gasto', cheque: 2 },
    { id: 'm7', nombre: 'Diezmo', icono: 'mayordomia', categoria: 'Diezmo y ofrenda', asignado: true, revisado: true, fecha: fecha('2026-08-03'), montoCents: centavos(36800), tipo: 'gasto', cheque: 2 },
    { id: 'm6', nombre: 'Renta de agosto', icono: 'casa', categoria: 'Renta', asignado: true, revisado: true, fecha: fecha('2026-08-03'), montoCents: centavos(90000), tipo: 'gasto', cheque: 2 },
    { id: 'm5', nombre: 'Cheque de nómina', icono: 'ingreso', categoria: 'Entró', asignado: true, revisado: true, fecha: fecha('2026-08-03'), montoCents: centavos(124000), tipo: 'ingreso', cheque: 2 },
    { id: 'm4', nombre: 'Costco', icono: 'comida', categoria: 'Comida', asignado: true, revisado: true, fecha: fecha('2026-08-01'), montoCents: centavos(10800), tipo: 'gasto', cheque: 1 },
    { id: 'm3', nombre: 'Café y libros', icono: 'variable', categoria: 'Personal', asignado: true, revisado: true, fecha: fecha('2026-07-28'), montoCents: centavos(4800), tipo: 'gasto', cheque: 1 },
    { id: 'm2', nombre: 'Shell', icono: 'transporte', categoria: 'Gasolina', asignado: true, revisado: true, fecha: fecha('2026-07-25'), montoCents: centavos(5600), tipo: 'gasto', cheque: 1 },
    { id: 'm1', nombre: 'Supermercado González', icono: 'comida', categoria: 'Comida', asignado: true, revisado: true, fecha: fecha('2026-07-22'), montoCents: centavos(11400), tipo: 'gasto', cheque: 1 },
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

