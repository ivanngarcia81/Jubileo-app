import { cliente } from '../cliente'

/**
 * Los pasos 5 y 6 del onboarding, y la marca de que ya terminó.
 *
 * `onboarding_terminado_en` se pone **al final**, no al crear el mes. Es lo que
 * hace que una cuenta a medias vuelva a donde se quedó en vez de caer a la app
 * sin deudas, sin fijos y sin aviso — que se vería vacía y sería culpa nuestra,
 * no del usuario.
 */

function reventar(que: string, error: { message: string } | null): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

/**
 * Cuándo quiere el aviso. `dia_semana` es nulo a propósito cuando el aviso va
 * amarrado al cheque: el arranque de periodo cae el día que cae, y forzarlo a
 * un día fijo de la semana lo desalinearía del dinero.
 */
export async function guardarAviso(
  usuarioId: string,
  horaLocal: string,
  activo: boolean,
): Promise<void> {
  const { error } = await cliente()
    .from('preferencias_aviso')
    .upsert(
      { usuario_id: usuarioId, canal: 'correo', hora_local: horaLocal, activo },
      { onConflict: 'usuario_id,canal' },
    )
  reventar('No se pudo guardar tu aviso', error)
}

/** La zona horaria del navegador. Sin ella el aviso sale a la hora de UTC. */
export async function guardarZonaHoraria(usuarioId: string, zona: string): Promise<void> {
  const { error } = await cliente()
    .from('usuarios')
    .update({ zona_horaria: zona })
    .eq('id', usuarioId)
  reventar('No se pudo guardar tu zona horaria', error)
}

export async function guardarNombre(usuarioId: string, nombre: string): Promise<void> {
  const limpio = nombre.trim()
  if (!limpio) return
  const { error } = await cliente().from('usuarios').update({ nombre: limpio }).eq('id', usuarioId)
  reventar('No se pudo guardar tu nombre', error)
}

export async function terminarOnboarding(usuarioId: string): Promise<void> {
  const { error } = await cliente()
    .from('usuarios')
    .update({ onboarding_terminado_en: new Date().toISOString() })
    .eq('id', usuarioId)
  reventar('No se pudo terminar', error)
}
