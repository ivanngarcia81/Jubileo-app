import { type Centavos, centavos, suma } from '../dinero'
import { type FechaCivil, sumarMeses } from '../fecha'

/**
 * La fecha de libertad: cuándo sale el usuario de deudas.
 *
 * Método: se paga la deuda más pequeña primero. El pago mensual total no baja
 * cuando una deuda se termina — lo que se pagaba ahí se suma a la siguiente.
 * Eso es lo que hace que la fecha se adelante sola, y es lo que el deslizador
 * de "¿y si mandas un pago extra?" deja ver en vivo.
 *
 * Módulo puro: sin base de datos, sin reloj. La fecha de partida entra como
 * argumento.
 */

export interface DeudaSimulada {
  id: string
  nombre: string
  saldoCents: Centavos
  pagoMinimoCents: Centavos
  /** Anual, en por ciento. `0` si no cobra interés. */
  tasaInteres: number
}

export interface PasoPago {
  deudaId: string
  nombre: string
  /** Meses desde el arranque hasta que esta deuda queda pagada. */
  mes: number
  fechaPagada: FechaCivil
}

export interface Simulacion {
  /** Nulo si con ese pago la deuda nunca se termina. */
  mesesHastaLibertad: number | null
  fechaLibertad: FechaCivil | null
  /** La deuda que se está atacando: la de menor saldo. */
  enfoqueId: string | null
  pagoMensualCents: Centavos
  totalInteresCents: Centavos
  orden: PasoPago[]
}

/** Tope de seguridad: 50 años. Más allá, la deuda no se termina. */
const MAX_MESES = 600

export function deudaDeEnfoque(deudas: readonly DeudaSimulada[]): DeudaSimulada | null {
  const pendientes = deudas.filter((d) => d.saldoCents > 0)
  if (pendientes.length === 0) return null
  return [...pendientes].sort((a, b) => a.saldoCents - b.saldoCents)[0]!
}

export function simular(
  deudas: readonly DeudaSimulada[],
  extraMensualCents: Centavos,
  desde: FechaCivil,
): Simulacion {
  const pendientes = deudas.filter((d) => d.saldoCents > 0)
  const pagoMensual = centavos(suma(pendientes.map((d) => d.pagoMinimoCents)) + extraMensualCents)

  const vacia: Simulacion = {
    mesesHastaLibertad: 0,
    fechaLibertad: desde,
    enfoqueId: null,
    pagoMensualCents: pagoMensual,
    totalInteresCents: centavos(0),
    orden: [],
  }
  if (pendientes.length === 0) return vacia

  // Trabajamos sobre una copia: el simulador no toca lo que le pasan.
  const saldos = new Map(pendientes.map((d) => [d.id, d.saldoCents as number]))
  const orden: PasoPago[] = []
  let interesTotal = 0

  for (let mes = 1; mes <= MAX_MESES; mes++) {
    // 1. Corre el interés del mes sobre lo que queda.
    for (const deuda of pendientes) {
      const saldo = saldos.get(deuda.id)!
      if (saldo <= 0 || deuda.tasaInteres <= 0) continue
      const interes = Math.round((saldo * deuda.tasaInteres) / 100 / 12)
      saldos.set(deuda.id, saldo + interes)
      interesTotal += interes
    }

    // 2. El pago del mes se reparte: primero los mínimos de lo que sigue vivo,
    //    y todo lo que sobra va a la deuda más pequeña.
    // Dentro del mes trabajamos con un entero suelto: se va gastando en pagos
    // y solo vuelve a ser `Centavos` cuando sale del simulador.
    let disponible: number = pagoMensual
    const vivas = pendientes
      .filter((d) => saldos.get(d.id)! > 0)
      .sort((a, b) => saldos.get(a.id)! - saldos.get(b.id)!)

    for (const deuda of vivas) {
      if (disponible <= 0) break
      const pago = Math.min(deuda.pagoMinimoCents, saldos.get(deuda.id)!, disponible)
      saldos.set(deuda.id, saldos.get(deuda.id)! - pago)
      disponible -= pago
    }
    for (const deuda of vivas) {
      if (disponible <= 0) break
      const pago = Math.min(saldos.get(deuda.id)!, disponible)
      saldos.set(deuda.id, saldos.get(deuda.id)! - pago)
      disponible -= pago
    }

    // 3. ¿Alguna quedó pagada este mes?
    for (const deuda of vivas) {
      if (saldos.get(deuda.id)! <= 0 && !orden.some((p) => p.deudaId === deuda.id)) {
        orden.push({
          deudaId: deuda.id,
          nombre: deuda.nombre,
          mes,
          fechaPagada: sumarMeses(desde, mes),
        })
      }
    }

    if (pendientes.every((d) => saldos.get(d.id)! <= 0)) {
      return {
        mesesHastaLibertad: mes,
        fechaLibertad: sumarMeses(desde, mes),
        enfoqueId: deudaDeEnfoque(pendientes)?.id ?? null,
        pagoMensualCents: pagoMensual,
        totalInteresCents: centavos(interesTotal),
        orden,
      }
    }
  }

  // Con ese pago el interés le gana al abono: la deuda no se termina.
  return {
    mesesHastaLibertad: null,
    fechaLibertad: null,
    enfoqueId: deudaDeEnfoque(pendientes)?.id ?? null,
    pagoMensualCents: pagoMensual,
    totalInteresCents: centavos(interesTotal),
    orden,
  }
}

/** Cuántos meses se adelanta la fecha de libertad con un pago extra. */
export function mesesQueSeAdelanta(
  deudas: readonly DeudaSimulada[],
  extraMensualCents: Centavos,
  desde: FechaCivil,
): number | null {
  const sinExtra = simular(deudas, centavos(0), desde).mesesHastaLibertad
  const conExtra = simular(deudas, extraMensualCents, desde).mesesHastaLibertad
  if (sinExtra === null || conExtra === null) return null
  return sinExtra - conExtra
}
