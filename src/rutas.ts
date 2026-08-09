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

export const RUTAS = ['mes', 'deudas', 'metas', 'movimientos', 'resumen', 'ajustes', 'aviso'] as const

export type Ruta = (typeof RUTAS)[number]

/**
 * Direcciones que ya no existen, y a dónde van ahora.
 *
 * `semana` fue la pantalla de inicio hasta que el Dashboard tomó su lugar.
 * Caer al inicio por descarte habría bastado para que la app no se rompiera,
 * pero no para quien tenga `#/semana` guardado en marcadores o clavado en la
 * pantalla de inicio del teléfono: esa persona merece llegar, no aterrizar
 * porque sí. La redirección es explícita para que se note que es una promesa
 * y no una casualidad del enrutador.
 */
const MUDANZAS: Readonly<Record<string, Ruta>> = { semana: 'resumen' }

/** A dónde vas, y con qué. */
export interface Destino {
  ruta: Ruta
  /** La semana del mes que se quiere abierta, 1 a 5. */
  semana?: number
}

const RUTA_INICIAL: Ruta = 'resumen'

function leerDestino(): Destino {
  // Lo que venga después de `?` no se tira, se lee: Stripe regresa al usuario a
  // `#/ajustes?pago=listo`, y sin recortar la ruta esta no existiría y caería
  // al inicio — o sea, pagarías y aterrizarías en la pantalla equivocada.
  const [camino = '', consulta = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  const ruta = (RUTAS as readonly string[]).includes(camino)
    ? (camino as Ruta)
    : (MUDANZAS[camino] ?? RUTA_INICIAL)
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
 * El Dashboard es la misma ruta en los dos marcos, así que ya no hay nada que
 * traducir. Estas dos existían porque el teléfono no tenía panel y la
 * computadora no tenía Mi semana; con el Dashboard compartido, la ruta que
 * pide el usuario es la que se dibuja en los dos lados.
 *
 * Se quedan como identidad en vez de borrarse de golpe: todavía las llaman
 * `App.tsx` y las comprobaciones de navegador, y quitar la indirección es un
 * cambio aparte del que muda la pantalla de inicio.
 *
 * Ajustes y Movimientos existen en el teléfono aunque no estén en la píldora
 * —que son cuatro destinos y así lo dibuja `design/movil.html`—: a Ajustes se
 * llega tocando el avatar, y a Movimientos desde el Dashboard.
 */
export function rutaMovil(ruta: Ruta): Ruta {
  return ruta
}

export function rutaEscritorio(ruta: Ruta): Ruta {
  return ruta
}
