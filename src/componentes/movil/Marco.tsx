import type { ReactNode } from 'react'
import {
  IconoDeudas,
  IconoMes,
  IconoMetas,
  IconoSemana,
  type PropsIcono,
} from '../iconos'
import type { Ruta } from '../../rutas'
import { DESTINOS_MOVIL, ROTULO } from '../rotulos'

/**
 * El marco de teléfono: cabecera clara, cuerpo con desplazamiento y la
 * navegación flotante en píldora oscura.
 *
 * El mockup dibuja un teléfono con marco negro porque es un documento de
 * presentación. En la app el teléfono es la pantalla completa, así que el
 * bisel no existe: lo demás sale tal cual de `design/movil.html`.
 */

export function Cabecera({
  avatar,
  titulo,
  subtitulo,
  accion,
  etiquetaAccion,
  alTocarAccion,
  alTocarAvatar,
}: {
  avatar: ReactNode
  titulo: string
  subtitulo: string
  /**
   * El botón redondo de la derecha. **Solo se dibuja si hace algo.**
   *
   * Vivía como un `<div>` con un icono adentro, copiado de la composición del
   * mockup, en seis pantallas: un lápiz en El mes, un "+" en Deudas y en
   * Metas, una campana en el inicio, y dos que repetían el icono de la
   * pantalla en la que ya estabas. Ninguno respondía.
   *
   * Un círculo del tamaño de un pulgar, con borde y sombra, en la esquina
   * donde toda app pone su acción, **es un botón** aunque el código diga
   * `div`. Y los dos "+" eran peores que inútiles: prometían crear una deuda
   * o un fondo cuando esa acción ya vivía más abajo, en su lista.
   */
  accion?: ReactNode
  etiquetaAccion?: string
  alTocarAccion?: () => void
  alTocarAvatar?: () => void
}) {
  return (
    <header className="mx-auto flex w-full max-w-movil items-center gap-[11px] px-[18px] pt-2">
      <button
        type="button"
        onClick={alTocarAvatar}
        disabled={!alTocarAvatar}
        className="bg-carbon text-teal font-serif relative grid size-9 shrink-0 place-items-center rounded-chip text-cuerpo enabled:before:absolute enabled:before:top-1/2 enabled:before:left-1/2 enabled:before:size-11 enabled:before:-translate-x-1/2 enabled:before:-translate-y-1/2 enabled:before:content-['']"
      >
        {avatar}
      </button>
      <div className="min-w-0 flex-1">
        <div className="font-serif truncate text-titulo leading-[1.1]">{titulo}</div>
        <div className="text-texto-2 mt-[2px] text-rotulo font-semibold tracking-[.1em] uppercase">
          {subtitulo}
        </div>
      </div>
      {accion !== undefined && alTocarAccion !== undefined && (
        <button
          type="button"
          onClick={alTocarAccion}
          aria-label={etiquetaAccion}
          className="bg-blanco border-linea text-texto-2 relative grid size-[34px] shrink-0 place-items-center rounded-chip border text-menor before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']"
        >
          {accion}
        </button>
      )}
    </header>
  )
}

/**
 * Los cuatro de la píldora: Inicio · Presupuesto · Deudas · Metas.
 *
 * El orden y los nombres salen de `componentes/rotulos.ts`, que es el único
 * sitio donde se decide cómo se llama cada destino. Aquí solo vive el dibujo.
 */
const ICONO: Record<(typeof DESTINOS_MOVIL)[number], (p: PropsIcono) => ReactNode> = {
  resumen: IconoSemana,
  mes: IconoMes,
  deudas: IconoDeudas,
  metas: IconoMetas,
}

export function NavFlotante({ activa, ir }: { activa: Ruta; ir: (ruta: Ruta) => void }) {
  return (
    <nav
      aria-label="Navegación principal"
      // En un iPhone instalado en la pantalla de inicio, la página llega hasta
      // el borde: sin el área segura la píldora queda debajo de la barra del
      // sistema y los botones dejan de responder.
      className="bg-carbon fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 gap-[5px] rounded-chip p-[6px] shadow-[0_12px_28px_rgba(0,0,0,.38)]"
    >
      {DESTINOS_MOVIL.map((ruta) => {
        const Icono = ICONO[ruta]
        const nombre = ROTULO[ruta].pildora ?? ROTULO[ruta].pantalla
        const activo = ruta === activa
        return (
          <button
            key={ruta}
            type="button"
            onClick={() => ir(ruta)}
            aria-current={activo ? 'page' : undefined}
            aria-label={nombre}
            className={`grid size-[48px] place-items-center rounded-chip ${
              activo ? 'bg-teal text-tinta-teal' : 'text-texto-claro-3'
            }`}
          >
            <Icono tam={19} />
          </button>
        )
      })}
    </nav>
  )
}

export function Marco({
  cabecera,
  children,
  activa,
  ir,
  accionRapida,
}: {
  cabecera: ReactNode
  children: ReactNode
  activa: Ruta
  ir: (ruta: Ruta) => void
  /** El botón flotante y su hoja. Va en el marco porque se ve en toda pantalla. */
  accionRapida?: ReactNode
}) {
  return (
    <div className="bg-gris text-texto font-sans flex min-h-dvh flex-col">
      {cabecera}
      {/* El mockup dibuja 352px porque está enseñando un iPhone. Sin tope, en
          un iPad o en media ventana de laptop las tarjetas pensadas para esa
          columna se estiran a mil píxeles y el texto de 14.5px queda flotando.
          Se deja crecer un poco más que el mockup y ahí se detiene. */}
      {/* 150 y no 110: desde que el botón flotante ocupa la banda de arriba de
          la píldora, con 110 la última tarjeta de cada pantalla quedaba tapada
          para siempre. El botón puede flotar sobre lo que se está desplazando
          —para eso flota—, pero no sobre el final de la lista. */}
      <main className="mx-auto w-full max-w-movil flex-1 px-4 pt-[14px] pb-[calc(150px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <NavFlotante activa={activa} ir={ir} />
      {accionRapida}
    </div>
  )
}
