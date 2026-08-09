import { CLAVES_DE_CATEGORIA, type ClaveIcono, NOMBRE_DE_CLAVE } from '../../lib/iconos'
import { IconoDeClave } from '../iconos'

/**
 * Escoger el icono de una categoría.
 *
 * Dieciséis y en una rejilla, no una lista larga con nombres: el usuario está
 * buscando un dibujo, y buscar un dibujo se hace de un vistazo. Una lista de
 * treinta obliga a leer, y entonces nadie la recorre y todo se queda en el
 * primero.
 *
 * Lo que se guarda es **la clave**, no el dibujo — ver `lib/iconos/claves.ts`.
 */
export function RejillaDeIconos({
  elegido,
  alElegir,
  desactivada = false,
}: {
  elegido: ClaveIcono | null
  alElegir: (clave: ClaveIcono) => void
  desactivada?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Icono de la categoría"
      className="mt-2 grid grid-cols-8 gap-[6px]"
    >
      {CLAVES_DE_CATEGORIA.map((clave) => {
        const activo = clave === elegido
        return (
          <button
            key={clave}
            type="button"
            role="radio"
            aria-checked={activo}
            aria-label={NOMBRE_DE_CLAVE[clave]}
            disabled={desactivada}
            onClick={() => alElegir(clave)}
            // El borde de 2px lo dibujan los dos estados, elegido y no: si solo
            // lo trajera el elegido, la rejilla entera se movería un píxel al
            // escoger.
            className={`grid aspect-square place-items-center rounded-btn border-2 disabled:opacity-50 ${
              activo
                ? 'border-teal bg-brillo-teal text-teal-osc'
                : 'border-linea text-texto-2'
            }`}
          >
            <IconoDeClave clave={clave} tam={17} />
          </button>
        )
      })}
    </div>
  )
}

/** El rótulo de la sección, igual en las dos hojas que la usan. */
export function RotuloDeIconos({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-texto-2 mt-4 mb-1 text-menor font-bold tracking-[.06em] uppercase">
      {children}
    </div>
  )
}
