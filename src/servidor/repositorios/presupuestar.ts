import type { Centavos } from '../../lib/dinero'
import { cliente } from '../cliente'
import { guardarPlanSemanal, repartirLineaEnSemanas } from './semanas'

/**
 * Repartir el mes: poner cuánto va a cada categoría.
 *
 * Es el acto que convierte un calendario en un presupuesto. Aquí se guarda el
 * **monto mensual**, y en lo repartible se siembra además su plan semanal
 * proporcional a los días de cada semana — cómo se parte no se decide en esta
 * capa: se le pregunta a `repartirLineaEnSemanas`, que le pregunta a
 * `lib/dinero`. Guardar y sembrar van juntos a propósito: una línea repartible
 * con monto y sin semanas deja el mes descuadrado, y el mes no se cierra
 * descuadrado. Lo fijo y las deudas no llevan plan: vencen cuando vencen.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

const REPARTIBLES = ['mayordomia', 'variable', 'fondo']

/**
 * Cuánto va a esta categoría en el mes. En lo repartible el plan semanal se
 * vuelve a sembrar proporcional: cambiar el monto mensual redefine el plan, y
 * los ajustes finos por semana se hacen después, en la vista de semanas.
 */
export async function ponerMontoMensual(
  mesId: string,
  categoriaId: string,
  montoCents: Centavos,
): Promise<void> {
  const db = cliente()

  const { data: linea, error } = await db
    .from('lineas_presupuesto')
    .upsert(
      { mes_id: mesId, categoria_id: categoriaId, monto_mensual_cents: montoCents },
      { onConflict: 'mes_id,categoria_id' },
    )
    .select('id')
    .single<{ id: string }>()
  reventar('No se pudo guardar el monto', error)
  if (!linea) throw new Error('No se pudo guardar el monto')

  const [categoria, mes] = await Promise.all([
    db.from('categorias').select('grupo').eq('id', categoriaId).single<{ grupo: string }>(),
    db.from('meses').select('anio, mes').eq('id', mesId).single<{ anio: number; mes: number }>(),
  ])
  reventar('No se pudo leer la categoría', categoria.error)
  reventar('No se pudo leer el mes', mes.error)
  if (!REPARTIBLES.includes(categoria.data?.grupo ?? '') || !mes.data) return

  await guardarPlanSemanal(
    mesId,
    linea.id,
    repartirLineaEnSemanas(montoCents, mes.data.anio, mes.data.mes),
  )
}
