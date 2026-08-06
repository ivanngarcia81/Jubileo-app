import { cliente } from '../cliente'
import { repartirElMes } from './mes'

/**
 * Crear, renombrar y quitar categorías.
 *
 * Las seis con las que arranca un hogar son un punto de partida, no la vida de
 * nadie: aquí es donde el presupuesto se vuelve el del usuario.
 */

function reventar(que: string, error: { message: string; code?: string } | null): void {
  if (!error) return
  // 23505 es la violación de unicidad. `unique (hogar_id, nombre)` existe para
  // que no haya dos "Comida" en el mismo hogar, y decirlo así es más útil que
  // repetir el mensaje de Postgres.
  if (error.code === '23505') {
    throw new Error('Ya tienes una categoría con ese nombre.')
  }
  throw new Error(`${que}: ${error.message}`)
}

export type Grupo = 'mayordomia' | 'fijo' | 'variable' | 'fondo'

export interface CategoriaNueva {
  hogarId: string
  nombre: string
  grupo: Grupo
  /** Obligatorio en las fijas: sin él el aviso semanal pierde la mitad de su valor. */
  diaVencimiento?: number | undefined
  orden: number
}

export async function crearCategoria(c: CategoriaNueva): Promise<string> {
  const esFija = c.grupo === 'fijo'
  if (esFija && !c.diaVencimiento) {
    throw new Error('Una categoría fija necesita su día de vencimiento.')
  }
  const { data, error } = await cliente()
    .from('categorias')
    .insert({
      hogar_id: c.hogarId,
      nombre: c.nombre.trim(),
      grupo: c.grupo,
      orden: c.orden,
      es_fija: esFija,
      dia_vencimiento: esFija ? c.diaVencimiento : null,
    })
    .select('id')
    .single<{ id: string }>()
  reventar('No se pudo crear la categoría', error)
  if (!data) throw new Error('No se pudo crear la categoría')
  return data.id
}

export async function renombrarCategoria(id: string, nombre: string): Promise<void> {
  const limpio = nombre.trim()
  if (!limpio) throw new Error('El nombre no puede quedar vacío.')
  const { error } = await cliente().from('categorias').update({ nombre: limpio }).eq('id', id)
  reventar('No se pudo renombrar', error)
}

/**
 * Quita una categoría del mes.
 *
 * No se borra: se desactiva. Los movimientos que ya se anotaron contra ella
 * siguen apuntándole, y borrarla los dejaría huérfanos — el historial de lo que
 * de verdad pasó no se reescribe.
 *
 * Pero **sí se borra su línea del mes**, y eso no es un detalle: la línea es lo
 * que suma en "sale", y una categoría invisible cuyo dinero se sigue contando
 * descuadra el mes sin que se vea por qué. Las asignaciones se van solas, en
 * cascada tras la línea.
 */
export async function quitarDelMes(categoriaId: string, mesId: string): Promise<void> {
  const db = cliente()

  const { error: errorLinea } = await db
    .from('lineas_presupuesto')
    .delete()
    .eq('mes_id', mesId)
    .eq('categoria_id', categoriaId)
  reventar('No se pudo quitar del mes', errorLinea)

  const { error } = await db.from('categorias').update({ activa: false }).eq('id', categoriaId)
  reventar('No se pudo quitar la categoría', error)

  await repartirElMes(mesId)
}
