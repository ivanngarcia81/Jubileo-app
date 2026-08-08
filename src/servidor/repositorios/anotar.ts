import type { Centavos } from '../../lib/dinero'
import type { FechaCivil } from '../../lib/fecha'
import { cliente } from '../cliente'

/**
 * Anotar: registrar lo que de verdad pasó con el dinero.
 *
 * Todo movimiento cuelga de un cheque, no del mes. Es lo que hace que un gasto
 * de hoy baje el dinero de *esta semana* y no un número lejano de fin de mes —
 * la diferencia entre presupuestar cheque a cheque y llevar la contabilidad.
 *
 * La categoría siempre viene del usuario. La regla de `CLAUDE.md` no admite
 * excepciones cómodas: nunca se auto-categoriza sin confirmación, ni siquiera
 * cuando parece obvio. Por eso aquí no hay ningún parámetro opcional que la
 * app pueda adivinar.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

export interface Gasto {
  hogarId: string
  usuarioId: string
  periodoId: string
  categoriaId: string
  fecha: FechaCivil
  montoCents: Centavos
  descripcion?: string | undefined
}

/**
 * Anota un gasto ya categorizado. Devuelve su llave, que es lo que permite
 * deshacerlo después.
 */
export async function anotarGasto(g: Gasto): Promise<string> {
  const { data, error } = await cliente()
    .from('transacciones')
    .insert({
      hogar_id: g.hogarId,
      usuario_id: g.usuarioId,
      periodo_id: g.periodoId,
      categoria_id: g.categoriaId,
      fecha: g.fecha,
      monto_cents: g.montoCents,
      tipo: 'gasto',
      descripcion: g.descripcion?.trim() || null,
      origen: 'manual',
      estado: 'asignada',
      // Lo escribió el usuario: ya lo vio. La columna nace en falso para que
      // lo que llegue del banco entre sin revisar; aquí se dice que sí.
      revisada: true,
    })
    .select('id')
    .single<{ id: string }>()
  reventar('No se pudo anotar el gasto', error)
  if (!data) throw new Error('No se pudo anotar el gasto')
  return data.id
}

/**
 * Deshace un movimiento. Marcar un pago anota un gasto; desmarcarlo lo borra,
 * y no deja rastro a propósito: una casilla que se desmarca es alguien
 * corrigiendo un dedazo, no un hecho que valga la pena guardar.
 */
export async function borrarMovimiento(id: string): Promise<void> {
  const { error } = await cliente().from('transacciones').delete().eq('id', id)
  reventar('No se pudo deshacer', error)
}

/**
 * Marca movimientos como revisados. En bloque porque así se usa: la barra de
 * pendientes ofrece "marcar los 3", y hacerlo de uno en uno son tres viajes al
 * servidor y tres oportunidades de quedar a medias.
 */
export async function marcarRevisados(ids: readonly string[], revisada = true): Promise<void> {
  if (ids.length === 0) return
  const { error } = await cliente()
    .from('transacciones')
    .update({ revisada })
    .in('id', ids as string[])
  reventar('No se pudo marcar como revisado', error)
}
