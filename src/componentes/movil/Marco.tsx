import type { ReactNode } from 'react'
import type { Ruta } from '../../rutas'

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
  conAviso = false,
  alTocarAvatar,
}: {
  avatar: ReactNode
  titulo: string
  subtitulo: string
  accion: ReactNode
  conAviso?: boolean
  alTocarAvatar?: () => void
}) {
  return (
    <header className="flex items-center gap-[11px] px-[18px] pt-2">
      <button
        type="button"
        onClick={alTocarAvatar}
        disabled={!alTocarAvatar}
        className="bg-carbon text-teal font-serif relative grid size-9 shrink-0 place-items-center rounded-full text-[15px] enabled:before:absolute enabled:before:top-1/2 enabled:before:left-1/2 enabled:before:size-11 enabled:before:-translate-x-1/2 enabled:before:-translate-y-1/2 enabled:before:content-['']"
      >
        {avatar}
      </button>
      <div className="min-w-0 flex-1">
        <div className="font-serif truncate text-[20px] leading-[1.1]">{titulo}</div>
        <div className="text-texto-2 mt-[2px] text-[10.5px] font-semibold tracking-[.1em] uppercase">
          {subtitulo}
        </div>
      </div>
      <div className="bg-blanco border-linea text-texto-2 relative grid size-[34px] shrink-0 place-items-center rounded-full border text-[13px]">
        {accion}
        {conAviso && <span className="bg-teal absolute top-2 right-[9px] size-[6px] rounded-full" />}
      </div>
    </header>
  )
}

const DESTINOS: readonly { ruta: Ruta; icono: string; nombre: string }[] = [
  { ruta: 'semana', icono: '◆', nombre: 'Semana' },
  { ruta: 'mes', icono: '▣', nombre: 'Mes' },
  { ruta: 'deudas', icono: '↓', nombre: 'Deudas' },
  { ruta: 'metas', icono: '◍', nombre: 'Metas' },
]

export function NavFlotante({ activa, ir }: { activa: Ruta; ir: (ruta: Ruta) => void }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="bg-carbon fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-[5px] rounded-full p-[6px] shadow-[0_12px_28px_rgba(0,0,0,.38)]"
    >
      {DESTINOS.map(({ ruta, icono, nombre }) => {
        const activo = ruta === activa
        return (
          <button
            key={ruta}
            type="button"
            onClick={() => ir(ruta)}
            aria-current={activo ? 'page' : undefined}
            aria-label={nombre}
            className={`grid size-[48px] place-items-center rounded-full text-[16px] ${
              activo ? 'bg-teal text-[#06322A]' : 'text-[#787E7D]'
            }`}
          >
            {icono}
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
}: {
  cabecera: ReactNode
  children: ReactNode
  activa: Ruta
  ir: (ruta: Ruta) => void
}) {
  return (
    <div className="bg-gris text-texto font-sans flex min-h-dvh flex-col">
      {cabecera}
      <main className="flex-1 px-4 pt-[14px] pb-[110px]">{children}</main>
      <NavFlotante activa={activa} ir={ir} />
    </div>
  )
}
