import { useEffect, useState } from 'react'

/**
 * Qué árbol se dibuja: el del teléfono o el del escritorio.
 *
 * Antes los dos existían siempre y se escondía uno con `panel:hidden`. Esconder
 * con CSS no es no dibujar: cada lista se armaba dos veces, y en el documento
 * había **dos** `<nav aria-label="Navegación principal">` y dos `<main>`. Para
 * quien navega con lector de pantalla eso no es un detalle de rendimiento — es
 * una app con dos de cada cosa, la mitad invisible.
 *
 * El corte se lee de la hoja de estilos y no se escribe aquí: `--breakpoint-panel`
 * vive en `src/estilos/tema.css` porque una media query no puede leer `var()`.
 * Si se copiara el 880 a este archivo habría dos fuentes de verdad, y el día que
 * alguien mueva el corte en CSS este quedaría atrás sin que nadie lo note.
 */

/** Solo si la hoja de estilos todavía no llegó. Nunca debería usarse. */
const POR_OMISION = 880

export function corteDePanel(): number {
  if (typeof window === 'undefined') return POR_OMISION
  const declarado = getComputedStyle(document.documentElement).getPropertyValue(
    '--breakpoint-panel',
  )
  const px = Number.parseFloat(declarado)
  return Number.isFinite(px) && px > 0 ? px : POR_OMISION
}

export function useEsEscritorio(): boolean {
  // La consulta se arma en el primer render, cuando el CSS ya está aplicado:
  // así el árbol correcto sale de una vez y no hay parpadeo de teléfono a
  // escritorio en cada carga.
  const [consulta] = useState(() =>
    typeof window === 'undefined'
      ? null
      : window.matchMedia(`(min-width: ${corteDePanel()}px)`),
  )
  const [esEscritorio, setEsEscritorio] = useState(() => consulta?.matches ?? false)

  useEffect(() => {
    if (!consulta) return
    const alCambiar = () => setEsEscritorio(consulta.matches)
    // Por si el ancho cambió entre el primer render y este efecto: girar el
    // teléfono es justo eso.
    alCambiar()
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [consulta])

  return esEscritorio
}
