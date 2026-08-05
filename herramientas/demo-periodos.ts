/**
 * Imprime el calendario de periodos de un año. Sirve para revisar a simple
 * vista lo que las pruebas revisan a detalle — sobre todo los meses de 3
 * cheques y las quintas semanas.
 *
 *   npm run periodos:demo -- --frecuencia cada_dos_semanas --ancla 2026-01-05 --anio 2026
 */
import { fecha } from '../src/lib/fecha'
import { generarPeriodos } from '../src/lib/periodos'
import type { ConfigPago, FrecuenciaPago } from '../src/lib/periodos'

const FRECUENCIAS: readonly FrecuenciaPago[] = [
  'semanal',
  'cada_dos_semanas',
  'dos_veces_al_mes',
  'mensual',
  'variable',
]

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function leerArgumento(nombre: string, porDefecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  return i === -1 ? porDefecto : (process.argv[i + 1] ?? porDefecto)
}

const frecuencia = leerArgumento('frecuencia', 'cada_dos_semanas') as FrecuenciaPago
if (!FRECUENCIAS.includes(frecuencia)) {
  console.error(`Frecuencia desconocida: ${frecuencia}`)
  console.error(`Usa una de: ${FRECUENCIAS.join(', ')}`)
  process.exit(1)
}

const anio = Number(leerArgumento('anio', '2026'))
const diasPago = leerArgumento('dias-pago', '1,15')
  .split(',')
  .map((d) => Number(d.trim()))

const config: ConfigPago = {
  frecuencia,
  fechaAncla: fecha(leerArgumento('ancla', '2026-01-05')),
  ...(frecuencia === 'dos_veces_al_mes' ? { diasPago } : {}),
}

console.log(`\n${frecuencia} · ancla ${config.fechaAncla} · ${anio}\n`)

let totalCheques = 0
const mesesDeTres: string[] = []

for (let mes = 1; mes <= 12; mes++) {
  const periodos = generarPeriodos(config, { anio, mes })
  totalCheques += periodos.length

  const detalle = periodos
    .map((p) => `${p.fechaPago}→${p.fechaFin}${p.esExtra ? ' EXTRA' : ''}`)
    .join('  ')

  const marca = periodos.length >= 3 && periodos.some((p) => p.esExtra) ? ' ←' : '  '
  if (marca === ' ←') mesesDeTres.push(MESES[mes - 1]!)

  console.log(`${MESES[mes - 1]!.padEnd(11)} ${String(periodos.length)}${marca} ${detalle}`)
}

console.log(`\n${totalCheques} cheques en el año`)
if (mesesDeTres.length > 0) {
  console.log(`Meses con cheque extra: ${mesesDeTres.join(', ')}`)
}
console.log()
