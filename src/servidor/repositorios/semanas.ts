import { type Centavos, centavos, repartir, suma } from '../../lib/dinero'
import { semanasDelMes } from '../../lib/semanas'
import { cliente } from '../cliente'

/**
 * El plan semanal de lo repartible: escribir `asignaciones_semana`.
 *
 * La invariante nueva vive aquí: la suma de las semanas de una línea
 * repartible tiene que dar su monto mensual, y el servidor la vuelve a
 * comprobar al cerrar. Lo fijo y las deudas no tienen plan semanal — vencen
 * cuando vencen, y el disparador del esquema rechaza sus filas.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

export interface SemanaDelPlan {
  /** 1 a 5, del calendario del mes. */
  semana: number
  montoCents: Centavos
}

/**
 * Reparte el monto mensual entre las semanas del mes, proporcional a los días
 * de cada una. Espejo de `reparto_semanal` en SQL: mismos pesos, mismo mayor
 * residuo, mismos centavos — los dos están fijados uno contra el otro en las
 * pruebas de `lib/dinero` y en `supabase/pruebas/06-semanas.sql`.
 */
export function repartirLineaEnSemanas(
  total: Centavos,
  anio: number,
  mes: number,
): SemanaDelPlan[] {
  const semanas = semanasDelMes(anio, mes)
  return repartir(total, semanas.map((s) => s.dias)).map((montoCents, i) => ({
    semana: i + 1,
    montoCents,
  }))
}

/**
 * Guarda el plan semanal de una línea. Primero el monto mensual y después las
 * semanas, **en ese orden**: el puente de 0006 re-siembra un plan proporcional
 * cada vez que el monto cambia, y escribir las semanas al final deja ganando
 * el plan que el usuario decidió. El orden funciona igual con puente y sin él.
 */
export async function guardarPlanSemanal(
  mesId: string,
  lineaId: string,
  plan: readonly SemanaDelPlan[],
): Promise<void> {
  const db = cliente()

  const total = centavos(suma(plan.map((p) => p.montoCents)))
  const { error: errorLinea } = await db
    .from('lineas_presupuesto')
    .update({ monto_mensual_cents: total })
    .eq('id', lineaId)
    .eq('mes_id', mesId)
  reventar('No se pudo guardar el monto', errorLinea)

  const { error: errorBorrar } = await db
    .from('asignaciones_semana')
    .delete()
    .eq('mes_id', mesId)
    .eq('linea_presupuesto_id', lineaId)
  reventar('No se pudo rehacer el plan semanal', errorBorrar)

  // Las semanas en cero no se guardan: la suma da igual y la tabla no carga
  // filas que no dicen nada.
  const filas = plan
    .filter((p) => p.montoCents !== 0)
    .map((p) => ({
      mes_id: mesId,
      linea_presupuesto_id: lineaId,
      semana: p.semana,
      monto_cents: p.montoCents,
    }))
  if (filas.length === 0) return

  const { error } = await db.from('asignaciones_semana').insert(filas)
  reventar('No se pudo guardar el plan semanal', error)
}

/**
 * Pone cuánto va de un sobre en una semana. Es la edición fina de la vista de
 * semanas: el monto mensual de la línea pasa a ser la suma de sus semanas —
 * presupuestar por semana ES decidir el mes, no repartir un mes ya decidido.
 */
export async function ponerMontoDeSemana(
  mesId: string,
  categoriaId: string,
  semana: number,
  montoCents: Centavos,
): Promise<void> {
  const db = cliente()

  // La línea puede no existir todavía: un sobre en cero no tiene fila.
  const { data: existente, error: errorLeer } = await db
    .from('lineas_presupuesto')
    .select('id')
    .eq('mes_id', mesId)
    .eq('categoria_id', categoriaId)
    .maybeSingle<{ id: string }>()
  reventar('No se pudo leer la línea', errorLeer)

  let lineaId = existente?.id ?? null
  if (lineaId === null) {
    const { data: creada, error: errorCrear } = await db
      .from('lineas_presupuesto')
      .insert({ mes_id: mesId, categoria_id: categoriaId, monto_mensual_cents: 0 })
      .select('id')
      .single<{ id: string }>()
    reventar('No se pudo crear la línea', errorCrear)
    if (!creada) throw new Error('No se pudo crear la línea')
    lineaId = creada.id
  }

  const { data: filas, error: errorPlan } = await db
    .from('asignaciones_semana')
    .select('semana, monto_cents')
    .eq('mes_id', mesId)
    .eq('linea_presupuesto_id', lineaId)
    .returns<{ semana: number; monto_cents: number }[]>()
  reventar('No se pudo leer el plan semanal', errorPlan)

  const plan: SemanaDelPlan[] = (filas ?? [])
    .filter((f) => f.semana !== semana)
    .map((f) => ({ semana: f.semana, montoCents: centavos(f.monto_cents) }))
    .concat([{ semana, montoCents }])

  await guardarPlanSemanal(mesId, lineaId, plan)
}

/**
 * Siembra el plan proporcional de **todas** las líneas repartibles del mes.
 * Es lo que deja un mes recién abierto cuadrado en el eje semanal sin esperar
 * al puente del esquema — que existe para los clientes viejos y un día se va.
 */
export async function sembrarPlanSemanal(
  mesId: string,
  objetivo: { anio: number; mes: number },
): Promise<void> {
  const db = cliente()

  const [lineas, categorias] = await Promise.all([
    db
      .from('lineas_presupuesto')
      .select('id, categoria_id, monto_mensual_cents')
      .eq('mes_id', mesId)
      .returns<{ id: string; categoria_id: string; monto_mensual_cents: number }[]>(),
    db.from('categorias').select('id, grupo').returns<{ id: string; grupo: string }[]>(),
  ])
  reventar('No se pudieron leer las líneas', lineas.error)
  reventar('No se pudieron leer las categorías', categorias.error)

  const grupoDe = new Map((categorias.data ?? []).map((c) => [c.id, c.grupo]))
  const repartibles = (lineas.data ?? []).filter((l) =>
    ['mayordomia', 'variable', 'fondo'].includes(grupoDe.get(l.categoria_id) ?? ''),
  )
  if (repartibles.length === 0) return

  const { error: errorBorrar } = await db
    .from('asignaciones_semana')
    .delete()
    .eq('mes_id', mesId)
    .in('linea_presupuesto_id', repartibles.map((l) => l.id))
  reventar('No se pudo rehacer el plan semanal', errorBorrar)

  const filas = repartibles.flatMap((l) =>
    repartirLineaEnSemanas(centavos(l.monto_mensual_cents), objetivo.anio, objetivo.mes)
      .filter((p) => p.montoCents !== 0)
      .map((p) => ({
        mes_id: mesId,
        linea_presupuesto_id: l.id,
        semana: p.semana,
        monto_cents: p.montoCents,
      })),
  )
  if (filas.length === 0) return

  const { error } = await db.from('asignaciones_semana').insert(filas)
  reventar('No se pudo sembrar el plan semanal', error)
}
