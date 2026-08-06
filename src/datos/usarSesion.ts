import { useEffect, useState } from 'react'
import { usaServidor } from './fuente'

export type EstadoSesion =
  | { estado: 'cargando' }
  | { estado: 'fuera' }
  | { estado: 'dentro'; usuarioId: string }
  /** La configuración existe pero está mal puesta. */
  | { estado: 'mal_configurado'; motivo: string }
  /** Sin servidor: la app corre con los datos de ejemplo. */
  | { estado: 'ejemplo' }

/**
 * Quién está usando la app.
 *
 * Se **suscribe antes de preguntar**. Al abrir el enlace del correo, Supabase
 * canjea el código de la dirección por una sesión de forma asíncrona; si se
 * preguntara primero y se escuchara después, ese canje puede terminar justo en
 * el hueco entre las dos cosas y el aviso se pierde. El usuario se queda viendo
 * la pantalla de entrar con la sesión ya creada.
 */
export function usarSesion(): EstadoSesion {
  const [estado, setEstado] = useState<EstadoSesion>(() =>
    usaServidor() ? { estado: 'cargando' } : { estado: 'ejemplo' },
  )

  useEffect(() => {
    if (!usaServidor()) return
    let vigente = true
    let desuscribir: (() => void) | undefined

    void import('../servidor/cliente')
      .then(async ({ cliente, usuarioConSesion, problemaDeConfiguracion }) => {
        const problema = problemaDeConfiguracion()
        if (problema) {
          if (vigente) setEstado({ estado: 'mal_configurado', motivo: problema })
          return
        }

        // Primero el oído, después la pregunta.
        const { data } = cliente().auth.onAuthStateChange((_evento, sesion) => {
          if (!vigente) return
          setEstado(
            sesion?.user ? { estado: 'dentro', usuarioId: sesion.user.id } : { estado: 'fuera' },
          )
        })
        desuscribir = () => data.subscription.unsubscribe()

        const usuarioId = await usuarioConSesion()
        if (!vigente) return
        setEstado(usuarioId ? { estado: 'dentro', usuarioId } : { estado: 'fuera' })
      })
      .catch((e: unknown) => {
        if (vigente) {
          setEstado({
            estado: 'mal_configurado',
            motivo: e instanceof Error ? e.message : String(e),
          })
        }
      })

    return () => {
      vigente = false
      desuscribir?.()
    }
  }, [])

  return estado
}
