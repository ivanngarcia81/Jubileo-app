import type { Centavos } from '../../lib/dinero'
import type { FechaCivil } from '../../lib/fecha'
import { cliente } from '../cliente'

/**
 * Deudas y fondos de reserva.
 *
 * Las pantallas de Deudas y Metas existían desde el contrato visual, pero no
 * había de dónde salieran los datos. Aquí es donde el usuario los mete.
 *
 * La deuda que se está atacando se llama **enfoque**. Es lo mismo que otros
 * productos venden con nombre de marca registrada, y por eso el SPEC prohíbe
 * usar esos nombres: aquí es una columna booleana y una palabra en español.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Deudas
// ---------------------------------------------------------------------------

export interface DeudaNueva {
  hogarId: string
  nombre: string
  saldoCents: Centavos
  pagoMinimoCents: Centavos
  /** Anual, en porcentaje. Nula cuando el usuario no la sabe. */
  tasaInteres: number | null
}

/**
 * Una deuda nueva arranca con `saldo_inicial = saldo`: la barra de la pantalla
 * mide lo que se lleva pagado desde que entró a Jubileo, no desde que se pidió
 * el préstamo. Es lo que el usuario puede ver moverse.
 */
export async function crearDeuda(d: DeudaNueva): Promise<string> {
  const { data, error } = await cliente()
    .from('deudas')
    .insert({
      hogar_id: d.hogarId,
      nombre: d.nombre.trim(),
      saldo_inicial_cents: d.saldoCents,
      saldo_cents: d.saldoCents,
      pago_minimo_cents: d.pagoMinimoCents,
      tasa_interes: d.tasaInteres,
    })
    .select('id')
    .single<{ id: string }>()
  reventar('No se pudo guardar la deuda', error)
  if (!data) throw new Error('No se pudo guardar la deuda')
  return data.id
}

/**
 * Actualiza el saldo. Si sube por encima del inicial —porque el usuario se
 * equivocó al capturarlo, o porque la deuda crecio— también sube el inicial:
 * el `CHECK saldo_no_pasa_del_inicial` lo rechazaría, y quedarse sin poder
 * corregir un número mal tecleado es peor que perder la referencia de la barra.
 */
export async function actualizarSaldo(
  deudaId: string,
  saldoCents: Centavos,
  saldoInicialCents: Centavos,
): Promise<void> {
  const { error } = await cliente()
    .from('deudas')
    .update({
      saldo_cents: saldoCents,
      ...(saldoCents > saldoInicialCents ? { saldo_inicial_cents: saldoCents } : {}),
      ...(saldoCents === 0 ? { pagada_en: new Date().toISOString().slice(0, 10) } : {}),
    })
    .eq('id', deudaId)
  reventar('No se pudo actualizar el saldo', error)
}

/**
 * Pone el enfoque en una deuda y se lo quita a las demás. Son dos escrituras a
 * propósito y en este orden: si la segunda falla, el usuario ve dos deudas
 * marcadas —raro pero visible— en vez de ninguna, que parecería que la app
 * perdió su elección.
 */
export async function ponerEnfoque(hogarId: string, deudaId: string): Promise<void> {
  const db = cliente()
  const { error: e1 } = await db
    .from('deudas')
    .update({ es_enfoque: true })
    .eq('id', deudaId)
  reventar('No se pudo cambiar el enfoque', e1)

  const { error: e2 } = await db
    .from('deudas')
    .update({ es_enfoque: false })
    .eq('hogar_id', hogarId)
    .neq('id', deudaId)
  reventar('No se pudo cambiar el enfoque', e2)
}

export async function borrarDeuda(deudaId: string): Promise<void> {
  const { error } = await cliente().from('deudas').delete().eq('id', deudaId)
  reventar('No se pudo borrar la deuda', error)
}

// ---------------------------------------------------------------------------
// Fondos de reserva
// ---------------------------------------------------------------------------

export interface FondoNuevo {
  hogarId: string
  nombre: string
  metaCents: Centavos
  /** Ya juntado. Casi siempre cero, pero se puede empezar con algo. */
  acumuladoCents: Centavos
  /** Cuándo se quiere tener el dinero. Nula si no hay prisa. */
  fechaObjetivo: FechaCivil | null
}

export async function crearFondo(f: FondoNuevo): Promise<string> {
  if (f.metaCents <= 0) throw new Error('La meta tiene que ser mayor que cero.')
  const { data, error } = await cliente()
    .from('fondos_reserva')
    .insert({
      hogar_id: f.hogarId,
      nombre: f.nombre.trim(),
      meta_cents: f.metaCents,
      acumulado_cents: f.acumuladoCents,
      fecha_objetivo: f.fechaObjetivo,
    })
    .select('id')
    .single<{ id: string }>()
  reventar('No se pudo guardar el fondo', error)
  if (!data) throw new Error('No se pudo guardar el fondo')
  return data.id
}

export async function actualizarAcumulado(
  fondoId: string,
  acumuladoCents: Centavos,
): Promise<void> {
  const { error } = await cliente()
    .from('fondos_reserva')
    .update({ acumulado_cents: acumuladoCents })
    .eq('id', fondoId)
  reventar('No se pudo actualizar el fondo', error)
}

export async function borrarFondo(fondoId: string): Promise<void> {
  const { error } = await cliente().from('fondos_reserva').delete().eq('id', fondoId)
  reventar('No se pudo borrar el fondo', error)
}
