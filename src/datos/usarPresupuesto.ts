import { useCallback, useEffect, useState } from 'react'
import type { MesObjetivo } from '../lib/periodos'
import { obtenerPresupuesto } from './fuente'
import type { Presupuesto } from './tipos'

export type EstadoPresupuesto =
  | { estado: 'cargando' }
  | { estado: 'listo'; presupuesto: Presupuesto; refrescando: boolean }
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
    obtenerPresupuesto(objetivo, usuarioId)
      .then((presupuesto) => {
        if (!vigente) return
        setEstado(
          presupuesto ? { estado: 'listo', presupuesto, refrescando: false } : { estado: 'sin_mes' },
        )
      })
      .catch((e: unknown) => {
        if (!vigente) return
        setEstado({ estado: 'error', mensaje: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      vigente = false
    }
  }, [objetivo.anio, objetivo.mes, usuarioId, intento])

  return { ...estado, recargar }
}
