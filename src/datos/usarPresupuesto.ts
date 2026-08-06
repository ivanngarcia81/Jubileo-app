import { useEffect, useState } from 'react'
import { MES_POR_DEFECTO, obtenerPresupuesto, usaServidor } from './fuente'
import { PRESUPUESTO_EJEMPLO } from './ejemplo'
import type { Presupuesto } from './tipos'
import type { MesObjetivo } from '../lib/periodos'

export type EstadoPresupuesto =
  | { estado: 'cargando' }
  | { estado: 'listo'; presupuesto: Presupuesto }
  | { estado: 'error'; mensaje: string }

/**
 * Trae el mes, del servidor o del ejemplo. Sin servidor configurado resuelve
 * de inmediato y sin parpadeo: no hay razón para enseñar un cargando cuando
 * los datos ya están en memoria.
 */
export function usarPresupuesto(objetivo: MesObjetivo = MES_POR_DEFECTO): EstadoPresupuesto {
  const [estado, setEstado] = useState<EstadoPresupuesto>(() =>
    usaServidor() ? { estado: 'cargando' } : { estado: 'listo', presupuesto: PRESUPUESTO_EJEMPLO },
  )

  useEffect(() => {
    if (!usaServidor()) return
    let vigente = true
    setEstado({ estado: 'cargando' })
    obtenerPresupuesto(objetivo)
      .then((presupuesto) => vigente && setEstado({ estado: 'listo', presupuesto }))
      .catch((e: unknown) =>
        vigente
          ? setEstado({ estado: 'error', mensaje: e instanceof Error ? e.message : String(e) })
          : undefined,
      )
    return () => {
      vigente = false
    }
  }, [objetivo.anio, objetivo.mes])

  return estado
}
