import { useEffect, useState } from 'react'
import { usaServidor } from './fuente'

export type EstadoSesion =
  | { estado: 'cargando' }
  | { estado: 'fuera' }
  | { estado: 'dentro'; usuarioId: string }
  /** Sin servidor configurado: la app corre con los datos de ejemplo. */
  | { estado: 'ejemplo' }

/**
 * Quién está usando la app.
 *
 * Se queda escuchando los cambios de sesión de Supabase: cuando el usuario
 * abre el enlace mágico de su correo, la sesión aparece sola y la pantalla
 * cambia sin que nadie recargue nada.
 */
export function usarSesion(): EstadoSesion {
  const [estado, setEstado] = useState<EstadoSesion>(() =>
    usaServidor() ? { estado: 'cargando' } : { estado: 'ejemplo' },
  )

  useEffect(() => {
    if (!usaServidor()) return
    let vigente = true
    let desuscribir: (() => void) | undefined

    void import('../servidor/cliente').then(async ({ cliente, usuarioConSesion }) => {
      const usuarioId = await usuarioConSesion()
      if (!vigente) return
      setEstado(usuarioId ? { estado: 'dentro', usuarioId } : { estado: 'fuera' })

      const { data } = cliente().auth.onAuthStateChange((_evento, sesion) => {
        if (!vigente) return
        setEstado(sesion?.user ? { estado: 'dentro', usuarioId: sesion.user.id } : { estado: 'fuera' })
      })
      desuscribir = () => data.subscription.unsubscribe()
    })

    return () => {
      vigente = false
      desuscribir?.()
    }
  }, [])

  return estado
}
