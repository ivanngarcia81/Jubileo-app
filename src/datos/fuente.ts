import type { MesObjetivo } from '../lib/periodos'
import { PRESUPUESTO_EJEMPLO } from './ejemplo'
import type { Presupuesto } from './tipos'

/**
 * De dónde salen los datos.
 *
 * Sin `VITE_SUPABASE_URL` en el entorno, la app corre con los datos de ejemplo
 * y las pantallas se ven igual. Con ella, lee del servidor. Es el único
 * interruptor: ningún componente sabe de dónde vienen sus datos.
 *
 * El cliente de Supabase se importa en caliente, solo si hay servidor. Así el
 * bundle de quien todavía no lo tiene configurado no carga con él — y en una
 * PWA que tiene que abrir con mala señal, eso importa.
 */

/**
 * ¿Hay algo de servidor configurado? Ojo: dice si *se intentó* configurar, no
 * si quedó bien. Lo segundo lo revisa `revisarConfiguracion`, y así una llave
 * mal pegada se ve como un error con instrucciones en vez de caer de vuelta a
 * los datos de ejemplo como si nada.
 */
export function usaServidor(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  )
}

/**
 * El mes en el que está parado el usuario, en su propio calendario. Es lo
 * único de la app que pregunta la hora, y por eso vive aquí y no en
 * `lib/fecha`, que es puro a propósito.
 */
export function mesActual(): MesObjetivo {
  const hoy = new Date()
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 }
}

/** El mes que muestra la demostración con datos de ejemplo. */
export const MES_DEL_EJEMPLO: MesObjetivo = { anio: 2026, mes: 8 }

/**
 * Devuelve el mes, o `null` si el usuario todavía no lo ha armado — que no es
 * un error, es el estado normal de una cuenta nueva.
 */
export async function obtenerPresupuesto(
  objetivo: MesObjetivo,
  usuarioId: string | null,
): Promise<Presupuesto | null> {
  if (!usaServidor()) return PRESUPUESTO_EJEMPLO
  if (!usuarioId) throw new Error('No has iniciado sesión.')

  const { cargarPresupuestoDelMes } = await import('../servidor/repositorios/presupuesto')
  return cargarPresupuestoDelMes(objetivo, usuarioId)
}
