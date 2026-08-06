import type { Centavos } from '../../lib/dinero'
import { cliente } from '../cliente'
import { repartirElMes } from './mes'

/**
 * Repartir el mes: poner cuánto va a cada categoría.
 *
 * Es el acto que convierte un calendario de cheques en un presupuesto. Aquí
 * solo se guarda el **monto mensual**; cómo se parte entre los cheques no se
 * decide en esta capa — de eso se encarga `repartirElMes`, que le pregunta a
 * `lib/dinero`. Guardar y repartir van juntos a propósito: una línea con monto
 * y sin asignaciones deja el mes descuadrado, y el mes no se cierra
 * descuadrado.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

/**
 * Cuánto va a esta categoría en el mes. Vuelve a repartir todo el mes, no solo
 * la línea que cambió: los cheques extra y el redondeo del reparto dependen del
 * conjunto, así que repartir de a una dejaría centavos perdidos.
 */
export async function ponerMontoMensual(
  mesId: string,
  categoriaId: string,
  montoCents: Centavos,
): Promise<void> {
  const { error } = await cliente()
    .from('lineas_presupuesto')
    .upsert(
      { mes_id: mesId, categoria_id: categoriaId, monto_mensual_cents: montoCents },
      { onConflict: 'mes_id,categoria_id' },
    )
  reventar('No se pudo guardar el monto', error)
  await repartirElMes(mesId)
}
