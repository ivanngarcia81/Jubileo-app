import type { ReactNode } from 'react'
import type { Presupuesto } from '../../datos/tipos'
import type { Ruta } from '../../rutas'
import {
  IconoAjustes,
  IconoDeudas,
  IconoMetas,
  IconoMovimientos,
  IconoReloj,
  IconoSemana,
} from '../iconos'

/**
 * El sidebar de escritorio. Contrato: `design/sidebar.html`.
 *
 * La navegación se muda de la barra de arriba al costado, y la barra queda
 * como cabecera del contenido — el título de la pantalla y la fecha. Con los
 * enlaces arriba, cada destino nuevo competía por el ancho con el saludo y el
 * avatar; al costado caben, y sobra sitio para lo que de verdad hace distinto
 * a Jubileo: **el rail de semanas**, que llega en su propio paso.
 *
 * El renglón "Panel" que dibuja el mockup **no está todavía**: esa pantalla no
 * existe. Entra con su prompt, y ahí se despide Mi semana.
 *
 * El mockup dibuja todo dentro de una ventana de esquinas redondeadas con
 * sombra. Eso es el marco del documento, no el de la app: aquí el sidebar
 * llega al borde izquierdo y al alto de la pantalla. Ver el primer párrafo de
 * `design/DECISIONES.md`.
 */

const DESTINOS: readonly { ruta: Ruta; texto: string; Icono: (p: { tam?: number }) => ReactNode }[] =
  [
    // En escritorio, "Mi semana" es el panel de Resumen: el enrutador mapea
    // `semana → resumen`. Lo que cambia aquí es el nombre, no la pantalla.
    { ruta: 'resumen', texto: 'Mi semana', Icono: IconoReloj },
    { ruta: 'mes', texto: 'El mes', Icono: IconoSemana },
    { ruta: 'deudas', texto: 'Deudas', Icono: IconoDeudas },
    { ruta: 'metas', texto: 'Metas', Icono: IconoMetas },
    { ruta: 'movimientos', texto: 'Movimientos', Icono: IconoMovimientos },
  ]

function Renglon({
  texto,
  activo,
  alTocar,
  children,
}: {
  texto: string
  activo: boolean
  alTocar: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={alTocar}
      aria-current={activo ? 'page' : undefined}
      className={`flex min-h-11 w-full items-center gap-[10px] rounded-[10px] px-[11px] text-left text-cuerpo font-medium ${
        activo
          ? 'bg-brillo-teal [&_svg]:text-teal text-white'
          : 'text-texto-claro-2 hover:bg-carbon-realce'
      }`}
    >
      {children}
      <span className="truncate">{texto}</span>
    </button>
  )
}

/** El rótulo de una zona del sidebar. */
export function RotuloDeZona({ children }: { children: ReactNode }) {
  return (
    <div className="text-texto-claro-3 mt-[18px] mb-[7px] px-[11px] text-rotulo font-bold tracking-[.14em] uppercase">
      {children}
    </div>
  )
}

export function Sidebar({
  presupuesto,
  activa,
  ir,
  children,
}: {
  presupuesto: Presupuesto
  activa: Ruta
  ir: (ruta: Ruta) => void
  /** Las zonas de contexto —el rail de semanas, el enfoque— van en medio. */
  children?: ReactNode
}) {
  return (
    <aside className="bg-carbon flex w-sidebar shrink-0 flex-col gap-[2px] px-3 pt-[18px] pb-[14px] text-white">
      <div className="flex items-center gap-[10px] px-[11px] pt-1 pb-4">
        <div className="bg-teal text-tinta-teal font-serif grid size-[30px] place-items-center rounded-[10px] text-titulo">
          J
        </div>
        <b className="font-serif text-titulo font-normal">Jubileo</b>
      </div>

      <nav aria-label="Navegación principal" className="flex flex-col gap-[2px]">
        {DESTINOS.map(({ ruta, texto, Icono }) => (
          <Renglon key={ruta} texto={texto} activo={ruta === activa} alTocar={() => ir(ruta)}>
            <Icono tam={15} />
          </Renglon>
        ))}
      </nav>

      {children}

      <div className="border-linea-oscura mt-auto flex flex-col gap-[2px] border-t pt-[10px]">
        <Renglon
          texto="Ajustes"
          activo={activa === 'ajustes'}
          alTocar={() => ir('ajustes')}
        >
          <IconoAjustes tam={15} />
        </Renglon>
        <div className="flex items-center gap-[10px] px-[11px] py-2">
          <span className="bg-carbon-2 text-texto-claro-2 grid size-[26px] shrink-0 place-items-center rounded-full text-rotulo font-bold">
            {presupuesto.usuario.iniciales}
          </span>
          <b className="text-texto-claro truncate text-menor font-semibold">
            {presupuesto.usuario.nombre}
          </b>
        </div>
      </div>
    </aside>
  )
}
