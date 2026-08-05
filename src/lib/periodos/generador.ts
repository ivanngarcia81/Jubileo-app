import type { Centavos } from '../dinero'
import {
  diaDe,
  diaDelMesRecortado,
  diasEntre,
  type FechaCivil,
  primerDiaDelMes,
  sumarDias,
  ultimoDiaDelMes,
} from '../fecha'
import { perteneceAlMes } from './pertenencia'
import type { ConfigPago, MesObjetivo, OpcionesGenerador, Periodo } from './tipos'

/**
 * El único lugar del código donde se genera el calendario de periodos.
 *
 * Entrada: la frecuencia de pago, la fecha ancla, los días de pago y el mes
 * a generar. Salida: los periodos de ese mes, con inicio, fin y fecha de pago.
 * Función pura: sin base de datos, sin red, sin reloj.
 */
export function generarPeriodos(
  config: ConfigPago,
  objetivo: MesObjetivo,
  opciones: OpcionesGenerador = {},
): Periodo[] {
  validarObjetivo(objetivo)

  switch (config.frecuencia) {
    case 'mensual':
      return numerar(periodosMensual(config, objetivo), config)
    case 'dos_veces_al_mes':
      return numerar(periodosDosVecesAlMes(config, objetivo), config)
    case 'semanal':
      return numerar(periodosPorPaso(config, objetivo, 7, opciones), config)
    case 'variable':
      return numerar(periodosPorPaso(config, objetivo, 7, opciones), config)
    case 'cada_dos_semanas':
      return numerar(periodosPorPaso(config, objetivo, 14, opciones), config)
  }
}

/** ¿Este mes trae un cheque de más? La app lo detecta sola y lo dice. */
export function esMesDeTresCheques(periodos: readonly Periodo[]): boolean {
  return periodos.some((p) => p.esExtra)
}

// ---------------------------------------------------------------------------

type PeriodoCrudo = Omit<Periodo, 'numero' | 'ingresoEsperadoCents'>

function validarObjetivo({ anio, mes }: MesObjetivo): void {
  if (!Number.isInteger(anio) || anio < 1970 || anio > 2200) {
    throw new RangeError(`Año fuera de rango: ${anio}`)
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new RangeError(`Mes fuera de rango: ${mes}`)
  }
}

/**
 * El ingreso esperado se cuelga al final, en un solo lugar. En modo
 * `variable` siempre queda nulo: el usuario captura lo que entró al arrancar
 * el periodo y ahí se reparte.
 */
function numerar(crudos: readonly PeriodoCrudo[], config: ConfigPago): Periodo[] {
  const esperado: Centavos | null =
    config.frecuencia === 'variable' ? null : (config.ingresoEsperadoCents ?? null)

  return crudos.map((p, i) => ({
    ...p,
    numero: i + 1,
    ingresoEsperadoCents: esperado,
  }))
}

/** `mensual` — un solo periodo, que es el mes. */
function periodosMensual(config: ConfigPago, { anio, mes }: MesObjetivo): PeriodoCrudo[] {
  return [
    {
      fechaInicio: primerDiaDelMes(anio, mes),
      fechaFin: ultimoDiaDelMes(anio, mes),
      fechaPago: diaDelMesRecortado(anio, mes, diaDe(config.fechaAncla)),
      esExtra: false,
    },
  ]
}

/**
 * `dos_veces_al_mes` — 24 al año, siempre 2 por mes, en los días configurados.
 * Los periodos caen limpios dentro del mes y lo cubren completo: el primero
 * arranca el día 1 aunque el cheque llegue después.
 */
function periodosDosVecesAlMes(config: ConfigPago, { anio, mes }: MesObjetivo): PeriodoCrudo[] {
  const dias = config.diasPago
  if (!dias || dias.length !== 2) {
    throw new RangeError('`dos_veces_al_mes` necesita exactamente dos días de pago, ej. [1, 15]')
  }

  // El 31 se recorta al último día del mes, y así "me pagan el último"
  // funciona igual en febrero. Si dos días configurados caen en el mismo
  // recorte (ej. [30, 31] en febrero) queda un solo cheque ese mes.
  const pagos = [...new Set(dias.map((d) => diaDelMesRecortado(anio, mes, d)))].sort()

  const ultimo = ultimoDiaDelMes(anio, mes)
  return pagos.map((fechaPago, i) => {
    const siguiente = pagos[i + 1]
    return {
      fechaInicio: i === 0 ? primerDiaDelMes(anio, mes) : fechaPago,
      fechaFin: siguiente ? sumarDias(siguiente, -1) : ultimo,
      fechaPago,
      esExtra: false,
    }
  })
}

/**
 * `semanal`, `variable` (paso 7) y `cada_dos_semanas` (paso 14) — cheques
 * cada N días desde la fecha ancla. Los periodos cruzan el límite del mes.
 *
 * Cuántos caen en el mes no se asume nunca: se cuentan. En `semanal` pueden
 * ser 4 o 5 — la quinta semana es justo donde el usuario truena. En
 * `cada_dos_semanas` pueden ser 2 o 3, y el tercero se marca `esExtra`.
 */
function periodosPorPaso(
  config: ConfigPago,
  objetivo: MesObjetivo,
  paso: number,
  opciones: OpcionesGenerador,
): PeriodoCrudo[] {
  const { anio, mes } = objetivo
  // Margen de un paso extra a cada lado: un cheque del mes vecino puede
  // haber sido mudado a este mes con el control explícito.
  const desde = sumarDias(primerDiaDelMes(anio, mes), -paso * 2)
  const hasta = sumarDias(ultimoDiaDelMes(anio, mes), paso * 2)

  const pagos: FechaCivil[] = []
  const saltos = Math.floor(diasEntre(config.fechaAncla, desde) / paso)
  let f = sumarDias(config.fechaAncla, saltos * paso)
  while (f < desde) f = sumarDias(f, paso)
  while (f <= hasta) {
    if (perteneceAlMes(f, objetivo, opciones.anulaciones)) pagos.push(f)
    f = sumarDias(f, paso)
  }

  const esQuincenal = paso === 14
  return pagos.map((fechaPago, i) => ({
    fechaInicio: fechaPago,
    fechaFin: sumarDias(fechaPago, paso - 1),
    fechaPago,
    // El tercer cheque de un mes de 3, y solo en `cada_dos_semanas`: la
    // quinta semana del modo semanal es una semana normal, no un extra.
    esExtra: esQuincenal && pagos.length === 3 && i === 2,
  }))
}
