import type { Centavos } from '../../lib/dinero'
import { cliente } from '../cliente'

/**
 * Anotar lo que de verdad entró en un cheque, **sin cerrar la semana**.
 *
 * La columna `ingreso_real_cents` existe desde el principio, pero hasta hoy la
 * escribía un solo lugar: `cerrarSemana`. O sea que la única manera de decirle
 * a la app "me pagaron $1,180 y no $1,240" era cerrar la semana entera —
 * contestar las tres preguntas del cierre y darla por terminada.
 *
 * Eso está al revés. El cheque llega el martes y la semana se cierra el
 * domingo; en esos cinco días la app enseña, en el héroe y en el aviso, un
 * número que el usuario ya sabe que no es. Y peor: para corregirlo tenía que
 * cerrar una semana que todavía está usando.
 *
 * **No toca `estado`.** Cerrar es otro acto, con sus propias preguntas, y
 * juntarlos haría que anotar un cheque cerrara de paso lo que sigue abierto.
 */
export async function anotarIngresoDelCheque(
  periodoId: string,
  montoCents: Centavos,
): Promise<void> {
  const { error } = await cliente()
    .from('periodos')
    .update({ ingreso_real_cents: montoCents })
    .eq('id', periodoId)
  if (error) throw new Error(`No se pudo anotar el cheque: ${error.message}`)
}
