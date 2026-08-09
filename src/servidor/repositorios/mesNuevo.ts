import { centavos } from '../../lib/dinero'
import { type LineaDelMes, loQueSeArrastra } from '../../lib/mes/arrastre'
import type { MesObjetivo } from '../../lib/periodos'
import { cliente } from '../cliente'
import type { FilaCategoria, FilaLinea, FilaMes, FilaUsuario } from '../esquema'
import { miHogar } from './arranque'
import { sembrarMes } from './mes'
import { sembrarPlanSemanal } from './semanas'

/**
 * Abrir el mes que sigue.
 *
 * Es lo que faltaba para que la app sirviera más de un mes. Sin esto, el 1 de
 * septiembre un usuario con historia caía en la pantalla de "arma tu primer
 * mes" —le volvían a preguntar cómo le pagan, como si fuera nuevo— y el mes
 * nacía sin una sola línea, porque las de arranque solo se crean cuando el
 * hogar todavía no tiene categorías. Todos sus sobres en cero, cada mes.
 *
 * Aquí no se decide nada de dinero: qué se arrastra y cuánto suma lo dice
 * `lib/mes/arrastre`, que es puro y tiene sus pruebas. Esto trae filas, se las
 * pasa, y guarda lo que devuelve.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

export interface MesPorAbrir {
  /** El mes del que se arrastra, para poder nombrarlo en la pantalla. */
  anterior: { anio: number; mes: number }
  /** Cuántos sobres traen monto, y cuánto suman al mes. */
  cuantasLineas: number
  totalMensualCents: number
  /** Nombres de los sobres que tenían monto y ya no están activos. */
  seQuedaronFuera: string[]
}

/** Las filas del mes más reciente **anterior** al que se quiere abrir. */
async function elAnterior(objetivo: MesObjetivo) {
  const db = cliente()
  // `anio*12+mes` ordena los meses de verdad: diciembre de 2026 va antes que
  // enero de 2027, que comparando mes por su cuenta quedaría al revés.
  const { data, error } = await db
    .from('meses')
    .select('id, hogar_id, anio, mes, estado, cerrado_en')
    .or(`anio.lt.${objetivo.anio},and(anio.eq.${objetivo.anio},mes.lt.${objetivo.mes})`)
    .order('anio', { ascending: false })
    .order('mes', { ascending: false })
    .limit(1)
    .maybeSingle<FilaMes>()
  reventar('No se pudo buscar tu mes anterior', error)
  return data
}

async function arrastreDe(mesAnteriorId: string) {
  const db = cliente()
  const [lineas, categorias] = await Promise.all([
    db
      .from('lineas_presupuesto')
      .select('id, mes_id, categoria_id, monto_mensual_cents')
      .eq('mes_id', mesAnteriorId)
      .returns<FilaLinea[]>(),
    db
      .from('categorias')
      .select('id, hogar_id, nombre, grupo, orden, activa, es_fija, dia_vencimiento, deuda_id, icono')
      .returns<FilaCategoria[]>(),
  ])
  reventar('No se pudieron leer las líneas del mes anterior', lineas.error)
  reventar('No se pudieron leer tus categorías', categorias.error)

  const activas = new Set((categorias.data ?? []).filter((c) => c.activa).map((c) => c.id))
  const nombres = new Map((categorias.data ?? []).map((c) => [c.id, c.nombre]))
  const previas: LineaDelMes[] = (lineas.data ?? []).map((l) => ({
    categoriaId: l.categoria_id,
    montoMensualCents: centavos(l.monto_mensual_cents),
  }))

  return { ...loQueSeArrastra(previas, activas), nombres }
}

/**
 * Qué va a pasar si se abre el mes, sin abrirlo. Nulo cuando no hay mes
 * anterior — o sea, cuando el usuario de verdad es nuevo y le toca el
 * onboarding y no esto.
 */
export async function loQueTraeElMesNuevo(objetivo: MesObjetivo): Promise<MesPorAbrir | null> {
  const anterior = await elAnterior(objetivo)
  if (!anterior) return null

  const { lineas, totalMensualCents, seQuedaronFuera, nombres } = await arrastreDe(anterior.id)

  return {
    anterior: { anio: anterior.anio, mes: anterior.mes },
    cuantasLineas: lineas.length,
    totalMensualCents,
    seQuedaronFuera: seQuedaronFuera.map((id) => nombres.get(id) ?? 'un sobre'),
  }
}

/**
 * Crea el mes con sus cheques y le arrastra los montos del anterior.
 *
 * Los cheques salen de `sembrarMes`, que se los pide al motor de periodos con
 * la configuración de pago que el usuario ya tiene guardada: no hay nada que
 * volver a preguntarle.
 */
export async function abrirElMes(usuarioId: string, objetivo: MesObjetivo): Promise<void> {
  const db = cliente()

  const { data: usuario, error: errorUsuario } = await db
    .from('usuarios')
    .select(
      'id, correo, nombre, zona_horaria, nivel, nivel_vence_en, frecuencia_pago, fecha_ancla, dias_pago, ingreso_esperado_cents, onboarding_terminado_en',
    )
    .eq('id', usuarioId)
    .single<FilaUsuario>()
  reventar('No se pudo leer tu perfil', errorUsuario)
  if (!usuario) throw new Error('No se pudo leer tu perfil')

  const hogarId = await miHogar(usuarioId)
  const anterior = await elAnterior(objetivo)

  const mesId = await sembrarMes(hogarId, objetivo, [usuario])

  if (anterior) {
    const { lineas } = await arrastreDe(anterior.id)
    if (lineas.length > 0) {
      const { error } = await db.from('lineas_presupuesto').upsert(
        lineas.map((l) => ({
          mes_id: mesId,
          categoria_id: l.categoriaId,
          monto_mensual_cents: l.montoMensualCents,
        })),
        { onConflict: 'mes_id,categoria_id' },
      )
      reventar('No se pudieron arrastrar tus montos', error)
    }
  }

  // Y se siembra el plan semanal de lo repartible, para que el mes nazca
  // cuadrado en el eje nuevo en vez de con la invariante rota esperando a que
  // alguien la note.
  await sembrarPlanSemanal(mesId, objetivo)
}
