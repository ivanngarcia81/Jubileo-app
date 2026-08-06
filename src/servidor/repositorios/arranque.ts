import { type Centavos, centavos } from '../../lib/dinero'
import { type FechaCivil } from '../../lib/fecha'
import type { FrecuenciaPago, MesObjetivo } from '../../lib/periodos'
import { cliente } from '../cliente'
import type { FilaUsuario } from '../esquema'
import { repartirElMes, sembrarMes } from './mes'

/**
 * El arranque: de una cuenta recién creada a un mes con cheques.
 *
 * Es el mínimo del onboarding de la sección 7 — cómo te pagan y cuánto entra —
 * lo suficiente para que el motor de periodos tenga con qué generar el
 * calendario. Los seis pasos completos vienen después.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

export interface ComoMePagan {
  frecuencia: FrecuenciaPago
  fechaAncla: FechaCivil
  /** Solo en `dos_veces_al_mes`. */
  diasPago?: readonly number[]
  /** Nulo cuando el ingreso es variable: nunca se presupuesta lo que no entró. */
  ingresoEsperadoCents: Centavos | null
}

/**
 * Categorías con las que arranca un hogar nuevo.
 *
 * Van en cero a propósito. Son estructura, no decisiones: el usuario pone los
 * montos. La app no presupuesta por él.
 */
const CATEGORIAS_DE_ARRANQUE = [
  { nombre: 'Diezmo y ofrenda', grupo: 'mayordomia', orden: 0, es_fija: false, dia_vencimiento: null },
  { nombre: 'Renta', grupo: 'fijo', orden: 1, es_fija: true, dia_vencimiento: 1 },
  { nombre: 'Servicios', grupo: 'fijo', orden: 2, es_fija: true, dia_vencimiento: 5 },
  { nombre: 'Comida', grupo: 'variable', orden: 3, es_fija: false, dia_vencimiento: null },
  { nombre: 'Gasolina', grupo: 'variable', orden: 4, es_fija: false, dia_vencimiento: null },
  { nombre: 'Personal', grupo: 'variable', orden: 5, es_fija: false, dia_vencimiento: null },
] as const

export async function miHogar(usuarioId: string): Promise<string> {
  const { data, error } = await cliente()
    .from('miembros_hogar')
    .select('hogar_id')
    .eq('usuario_id', usuarioId)
    .maybeSingle<{ hogar_id: string }>()
  reventar('No se pudo encontrar tu hogar', error)
  if (!data) {
    throw new Error(
      'Tu cuenta se creó pero no tiene hogar. Avísanos: es un problema nuestro, no tuyo.',
    )
  }
  return data.hogar_id
}

/**
 * Guarda cómo le pagan al usuario, crea el mes con sus cheques y le deja unas
 * categorías en cero para que tenga dónde empezar a repartir.
 */
export async function armarPrimerMes(
  usuarioId: string,
  objetivo: MesObjetivo,
  como: ComoMePagan,
): Promise<void> {
  const db = cliente()

  const { data: usuario, error: errorPerfil } = await db
    .from('usuarios')
    .update({
      frecuencia_pago: como.frecuencia,
      fecha_ancla: como.fechaAncla,
      dias_pago: como.frecuencia === 'dos_veces_al_mes' ? (como.diasPago ?? [1, 15]) : null,
      ingreso_esperado_cents: como.ingresoEsperadoCents,
      onboarding_terminado_en: new Date().toISOString(),
    })
    .eq('id', usuarioId)
    .select(
      'id, correo, nombre, zona_horaria, nivel, nivel_vence_en, frecuencia_pago, fecha_ancla, dias_pago, ingreso_esperado_cents, onboarding_terminado_en',
    )
    .single<FilaUsuario>()
  reventar('No se pudo guardar cómo te pagan', errorPerfil)
  if (!usuario) throw new Error('No se pudo guardar cómo te pagan')

  const hogarId = await miHogar(usuarioId)

  // El calendario lo genera `lib/periodos`; aquí solo se guarda.
  const mesId = await sembrarMes(hogarId, objetivo, [usuario])

  // Categorías de arranque, solo si el hogar todavía no tiene ninguna.
  const { count, error: errorConteo } = await db
    .from('categorias')
    .select('id', { count: 'exact', head: true })
  reventar('No se pudieron leer tus categorías', errorConteo)

  if ((count ?? 0) === 0) {
    const { data: creadas, error } = await db
      .from('categorias')
      .insert(CATEGORIAS_DE_ARRANQUE.map((c) => ({ ...c, hogar_id: hogarId })))
      .select('id')
      .returns<{ id: string }[]>()
    reventar('No se pudieron crear tus categorías', error)

    const { error: errorLineas } = await db.from('lineas_presupuesto').insert(
      (creadas ?? []).map((c) => ({
        mes_id: mesId,
        categoria_id: c.id,
        monto_mensual_cents: centavos(0),
      })),
    )
    reventar('No se pudieron crear las líneas del mes', errorLineas)
  }

  // Deja el mes cuadrado desde el primer momento: con las líneas en cero, la
  // invariante se cumple y el mes ya se podría cerrar.
  await repartirElMes(mesId)
}
