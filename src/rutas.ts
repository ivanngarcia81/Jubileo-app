import { useEffect, useState } from 'react'

/**
 * Enrutador mínimo por fragmento de URL.
 *
 * Cinco destinos fijos, sin parámetros ni rutas anidadas: una dependencia de
 * enrutado completa no se gana su lugar todavía. El fragmento mantiene la
 * dirección compartible y el botón de atrás funcionando, que es lo que hace
 * falta en una app instalada en la pantalla de inicio.
 */

export const RUTAS = ['semana', 'mes', 'deudas', 'metas', 'resumen', 'ajustes', 'aviso'] as const

export type Ruta = (typeof RUTAS)[number]

const RUTA_INICIAL: Ruta = 'semana'

function leerRuta(): Ruta {
  const fragmento = window.location.hash.replace(/^#\/?/, '')
  return (RUTAS as readonly string[]).includes(fragmento) ? (fragmento as Ruta) : RUTA_INICIAL
}

export function useRuta(): [Ruta, (ruta: Ruta) => void] {
  const [ruta, setRuta] = useState<Ruta>(leerRuta)

  useEffect(() => {
    const alCambiar = () => setRuta(leerRuta())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  const ir = (destino: Ruta) => {
    window.location.hash = `#/${destino}`
    setRuta(destino)
  }

  return [ruta, ir]
}

/** En el teléfono, el panel de escritorio no existe: su lugar lo toma Mi semana. */
export function rutaMovil(ruta: Ruta): Ruta {
  return ruta === 'resumen' || ruta === 'ajustes' ? 'semana' : ruta
}

/** En la computadora, Mi semana vive dentro del panel de Resumen. */
export function rutaEscritorio(ruta: Ruta): Ruta {
  return ruta === 'semana' ? 'resumen' : ruta
}
