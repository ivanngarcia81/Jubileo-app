import { useCallback, useEffect, useState } from 'react'
import type { MesObjetivo } from '../lib/periodos'
import { guardar, leer } from './cache'
import { obtenerPresupuesto } from './fuente'
import type { Presupuesto } from './tipos'

export type EstadoPresupuesto =
  | { estado: 'cargando' }
  | {
      estado: 'listo'
      presupuesto: Presupuesto
      refrescando: boolean
      /** Se está viendo la copia local porque el servidor no contestó. */
      desdeLaCopia: boolean
    }
  /** La cuenta existe pero el mes todavía no se ha armado. */
  | { estado: 'sin_mes' }
  | { estado: 'error'; mensaje: string }

/**
 * Trae el mes del servidor, o del ejemplo si no hay servidor configurado.
 *
 * Al recargar **se queda con lo que ya tenía** mientras llega lo nuevo. Solo la
 * primera vez muestra "cargando". Es la diferencia entre guardar algo y ver la
 * cifra actualizarse, o guardar algo y ver la pantalla entera parpadear a una
 * de espera — que además desmonta lo que esté encima: en el onboarding eso
 * mandaba al usuario de vuelta al paso 1 cada vez que agregaba un gasto.
 *
 * Y antes de preguntarle al servidor enseña la copia local, si la hay. En un
 * teléfono con mala señal la diferencia es abrir la app y ver tu semana, o
 * quedarte mirando "Un momento…" hasta que la red conteste o se rinda. Si el
 * servidor falla y hay copia, se sigue viendo la copia y se dice que lo es.
 */
export function usarPresupuesto(
  objetivo: MesObjetivo,
  usuarioId: string | null,
): EstadoPresupuesto & { recargar: () => void } {
  const [estado, setEstado] = useState<EstadoPresupuesto>({ estado: 'cargando' })
  const [intento, setIntento] = useState(0)

  const recargar = useCallback(() => setIntento((n) => n + 1), [])

  useEffect(() => {
    let vigente = true
    setEstado((anterior) =>
      anterior.estado === 'listo'
        ? { ...anterior, refrescando: true }
        : { estado: 'cargando' },
    )
    // La copia primero, para no dejar la pantalla en blanco esperando la red.
    // No pisa nada: si el servidor ya contestó, este `setEstado` no hace nada.
    if (usuarioId) {
      void leer(usuarioId, objetivo).then((copia) => {
        if (!vigente || !copia) return
        setEstado((anterior) =>
          anterior.estado === 'listo'
            ? anterior
            : { estado: 'listo', presupuesto: copia, refrescando: true, desdeLaCopia: true },
        )
      })
    }

    obtenerPresupuesto(objetivo, usuarioId)
      .then((presupuesto) => {
        if (!vigente) return
        if (presupuesto && usuarioId) void guardar(usuarioId, objetivo, presupuesto)
        setEstado(
          presupuesto
            ? { estado: 'listo', presupuesto, refrescando: false, desdeLaCopia: false }
            : { estado: 'sin_mes' },
        )
      })
      .catch((e: unknown) => {
        if (!vigente) return
        // Con copia en la mano, un servidor caído no deja al usuario sin app:
        // se queda viendo lo último que se supo, dicho como lo que es.
        setEstado((anterior) =>
          anterior.estado === 'listo'
            ? { ...anterior, refrescando: false, desdeLaCopia: true }
            : { estado: 'error', mensaje: e instanceof Error ? e.message : String(e) },
        )
      })
    return () => {
      vigente = false
    }
  }, [objetivo.anio, objetivo.mes, usuarioId, intento])

  return { ...estado, recargar }
}
