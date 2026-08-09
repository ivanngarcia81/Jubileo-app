import { useEffect, useState } from 'react'

/**
 * Enrutador mínimo por fragmento de URL.
 *
 * Ocho destinos fijos, sin rutas anidadas: una dependencia de enrutado completa
 * no se gana su lugar todavía. El fragmento mantiene la dirección compartible y
 * el botón de atrás funcionando, que es lo que hace falta en una app instalada
 * en la pantalla de inicio.
 *
 * Un solo parámetro, `semana`, y por eso: tocar S3 en el rail del sidebar tiene
 * que abrir El mes **con esa semana desplegada**. Pasarlo por un estado
 * compartido en memoria sería otro canal que mantener, y perdería lo único que
 * el fragmento da gratis — que la dirección se pueda compartir y que el botón
 * de atrás te regrese a donde estabas.
 */

export const RUTAS = ['semana', 'mes', 'deudas', 'metas', 'movimientos', 'resumen', 'ajustes', 'aviso'] as const

export type Ruta = (typeof RUTAS)[number]

/** A dónde vas, y con qué. */
export interface Destino {
  ruta: Ruta
  /** La semana del mes que se quiere abierta, 1 a 5. */
  semana?: number
}

const RUTA_INICIAL: Ruta = 'semana'

function leerDestino(): Destino {
  // Lo que venga después de `?` no se tira, se lee: Stripe regresa al usuario a
  // `#/ajustes?pago=listo`, y sin recortar la ruta esta no existiría y caería
  // al inicio — o sea, pagarías y aterrizarías en la pantalla equivocada.
  const [camino = '', consulta = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  const ruta = (RUTAS as readonly string[]).includes(camino) ? (camino as Ruta) : RUTA_INICIAL
  const n = Number(new URLSearchParams(consulta).get('semana'))
  // Una semana fuera de rango se ignora en vez de reventar: el fragmento lo
  // teclea cualquiera.
  return Number.isInteger(n) && n >= 1 && n <= 5 ? { ruta, semana: n } : { ruta }
}

export function useRuta(): [Destino, (destino: Ruta | Destino) => void] {
  const [destino, setDestino] = useState<Destino>(leerDestino)

  useEffect(() => {
    const alCambiar = () => setDestino(leerDestino())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  const ir = (aDonde: Ruta | Destino) => {
    const d: Destino = typeof aDonde === 'string' ? { ruta: aDonde } : aDonde
    window.location.hash = d.semana ? `#/${d.ruta}?semana=${d.semana}` : `#/${d.ruta}`
    setDestino(d)
  }

  return [destino, ir]
}

/**
 * En el teléfono, el panel de escritorio no existe: su lugar lo toma Mi semana.
 *
 * Ajustes sí existe en el teléfono, aunque no esté en la píldora de navegación
 * —que son cuatro destinos y así lo dibuja `design/movil.html`—: se llega
 * tocando el avatar. Mandarlo a Mi semana dejaba a quien usa la app en el
 * teléfono sin manera de cambiar cómo le pagan. Movimientos es igual: no está
 * en la píldora, se llega desde Mi semana.
 */
export function rutaMovil(ruta: Ruta): Ruta {
  return ruta === 'resumen' ? 'semana' : ruta
}

/** En la computadora, Mi semana vive dentro del panel de Resumen. */
export function rutaEscritorio(ruta: Ruta): Ruta {
  return ruta === 'semana' ? 'resumen' : ruta
}
