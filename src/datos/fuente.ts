import type { MesObjetivo } from '../lib/periodos'
import { PRESUPUESTO_EJEMPLO } from './ejemplo'
import type { Presupuesto } from './tipos'

/**
 * De dónde salen los datos.
 *
 * Mientras no haya `VITE_SUPABASE_URL` en el `.env`, la app corre con los
 * datos de ejemplo y las pantallas se ven igual. En cuanto la haya, lee del
 * servidor. Es el único interruptor: ningún componente sabe de dónde vienen
 * sus datos.
 *
 * El cliente de Supabase se importa en caliente, solo si hay servidor. Así el
 * bundle de quien todavía no lo tiene configurado no carga con él — y en una
 * PWA que tiene que abrir con mala señal, eso importa.
 */

export const MES_POR_DEFECTO: MesObjetivo = { anio: 2026, mes: 8 }

export function usaServidor(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export async function obtenerPresupuesto(objetivo = MES_POR_DEFECTO): Promise<Presupuesto> {
  if (!usaServidor()) return PRESUPUESTO_EJEMPLO

  const { usuarioConSesion } = await import('../servidor/cliente')
  const { cargarPresupuestoDelMes } = await import('../servidor/repositorios/presupuesto')

  const usuario = await usuarioConSesion()
  if (!usuario) throw new Error('No has iniciado sesión. Entra con tu correo para ver tu mes.')

  const presupuesto = await cargarPresupuestoDelMes(objetivo, usuario)
  if (!presupuesto) {
    throw new Error(
      `Todavía no armas ${objetivo.mes}/${objetivo.anio}. Ábrelo y reparte tus cheques.`,
    )
  }
  return presupuesto
}
