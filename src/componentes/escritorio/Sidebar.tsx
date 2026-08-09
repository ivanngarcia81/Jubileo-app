import type { ReactNode } from 'react'
import type { Presupuesto } from '../../datos/tipos'
import { formatearRedondo } from '../../lib/dinero'
import { diaDe } from '../../lib/fecha'
import type { Destino, Ruta } from '../../rutas'
import { DESTINOS_ESCRITORIO, ROTULO } from '../rotulos'
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
 * El renglón que el mockup llama "Panel" ya está, y se llama **Dashboard**:
 * es el primero de la lista y la pantalla de inicio de la app. "Mi semana"
 * se despidió con él — sus funciones se mudaron a las tarjetas del Dashboard
 * y al detalle de la semana en Presupuesto mensual.
 *
 * El mockup dibuja todo dentro de una ventana de esquinas redondeadas con
 * sombra. Eso es el marco del documento, no el de la app: aquí el sidebar
 * llega al borde izquierdo y al alto de la pantalla. Ver el primer párrafo de
 * `design/DECISIONES.md`.
 */

const ICONO: Record<(typeof DESTINOS_ESCRITORIO)[number], (p: { tam?: number }) => ReactNode> = {
  resumen: IconoReloj,
  mes: IconoSemana,
  deudas: IconoDeudas,
  metas: IconoMetas,
  movimientos: IconoMovimientos,
}

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
function RotuloDeZona({ children }: { children: ReactNode }) {
  return (
    <div className="text-texto-claro-3 mt-[18px] mb-[7px] px-[11px] text-rotulo font-bold tracking-[.14em] uppercase">
      {children}
    </div>
  )
}

/**
 * El rail del mes por semanas.
 *
 * Donde la referencia lista **cuentas** —su contexto permanente, porque su
 * producto son cuentas conectadas— Jubileo pone el suyo: **las semanas del
 * mes**. Es lo que hace distinto a este producto, y estar siempre a la vista
 * es justo lo que lo vuelve un marco mental y no una pantalla que se visita.
 *
 * El número es **lo que te toca esa semana** —lo fijo que vence en sus días más
 * lo variable que le asignaste—, el mismo que enseña El mes › Semanas. No es lo
 * que te queda: en una semana que ya pasó, "lo que te queda" no quiere decir
 * nada, y el rail tiene que decir lo mismo en las cinco.
 *
 * La quinta solo aparece cuando el mes la tiene, y se rotula con sus días
 * ("29 – 31 · 3 días") porque mide distinto que las otras cuatro.
 */
function RailDeSemanas({
  presupuesto,
  alTocarSemana,
}: {
  presupuesto: Presupuesto
  alTocarSemana: (numero: number) => void
}) {
  if (presupuesto.semanas.length === 0) return null
  return (
    <>
      <RotuloDeZona>{presupuesto.mes.etiqueta.split(' ')[0]} por semanas</RotuloDeZona>
      {presupuesto.semanas.map((s, i) => {
        const actual = i === presupuesto.semanaActiva
        const pasada = i < presupuesto.semanaActiva
        const desde = diaDe(s.fechaInicio)
        const hasta = diaDe(s.fechaFin)
        return (
          <button
            key={s.numero}
            type="button"
            onClick={() => alTocarSemana(s.numero)}
            aria-current={actual ? 'true' : undefined}
            aria-label={`Semana ${s.numero}, del ${desde} al ${hasta}${
              s.apretada ? ', apretada' : ''
            }`}
            // El mínimo tocable solo con dedo: el corte `panel` empieza en
            // 880px, así que un iPad horizontal recibe este marco sin ratón. En
            // una laptop estirarlo a 44 dejaría el rail más alto que el mes.
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-[9px] rounded-[9px] px-[11px] py-[7px] text-left text-menor pointer-coarse:min-h-11 ${
              actual ? 'bg-brillo-teal' : 'hover:bg-carbon-realce'
            } ${pasada ? 'opacity-[.42]' : ''}`}
          >
            <span
              className={`grid size-[21px] shrink-0 place-items-center rounded-[6px] text-rotulo font-bold ${
                actual ? 'bg-teal text-tinta-teal' : 'bg-carbon-2 text-texto-claro-3'
              }`}
            >
              S{s.numero}
            </span>
            <span className="text-texto-claro-2 flex min-w-0 items-center gap-[6px] truncate">
              {desde} – {hasta}
              {/* Solo en la última, y solo cuando existe: mide distinto. */}
              {i === presupuesto.semanas.length - 1 && s.dias < 7 && (
                <span className="text-texto-claro-3"> · {s.dias} días</span>
              )}
              {/* El punto ámbar: se vence más de lo que hay. */}
              {s.apretada && <span className="bg-ambar size-[6px] shrink-0 rounded-full" />}
            </span>
            <span
              className={`font-semibold [font-variant-numeric:tabular-nums] ${
                s.apretada ? 'text-ambar' : 'text-white'
              }`}
            >
              {formatearRedondo(s.totalCents)}
            </span>
          </button>
        )
      })}
      <p className="text-texto-claro-3 mt-[7px] px-[11px] text-rotulo leading-[1.5]">
        El número es lo que te toca esa semana. El punto ámbar: se vence más de lo que hay —
        tócala para ver qué mover.
      </p>
    </>
  )
}

/**
 * La deuda que se está atacando, siempre a la vista.
 *
 * Sin deudas no aparece: un grupo vacío que dice "sin enfoque" le recuerda cada
 * día a alguien que ya salió de deudas que un día tuvo. La barra mide lo
 * **pagado** desde que empezó, no lo que falta — es el único número de esta app
 * que sube cuando las cosas van bien.
 */
function Enfoque({ presupuesto, alTocar }: { presupuesto: Presupuesto; alTocar: () => void }) {
  const deuda = presupuesto.deudas.find((d) => d.esEnfoque) ?? presupuesto.deudas[0]
  if (!deuda) return null
  const pagado = Math.max(0, deuda.saldoInicialCents - deuda.saldoCents)
  const avance = deuda.saldoInicialCents > 0 ? (pagado / deuda.saldoInicialCents) * 100 : 0
  return (
    <>
      <RotuloDeZona>Tu enfoque</RotuloDeZona>
      <button
        type="button"
        onClick={alTocar}
        aria-label={`Ver ${deuda.nombre} en Deudas`}
        className="hover:bg-carbon-realce flex flex-col gap-[7px] rounded-[10px] px-[11px] py-[9px] text-left pointer-coarse:min-h-11"
      >
        <span className="flex items-baseline justify-between gap-2 text-menor">
          <b className="text-texto-claro truncate font-semibold">{deuda.nombre}</b>
          <span className="text-texto-claro-3 shrink-0 text-rotulo [font-variant-numeric:tabular-nums]">
            {formatearRedondo(deuda.saldoCents)}
          </span>
        </span>
        <span className="bg-carbon-2 block h-1 overflow-hidden rounded-full">
          <i
            className="bg-teal block h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, avance))}%` }}
          />
        </span>
      </button>
    </>
  )
}

export function Sidebar({
  presupuesto,
  activa,
  ir,
}: {
  presupuesto: Presupuesto
  activa: Ruta
  ir: (destino: Ruta | Destino) => void
}) {
  return (
    <aside className="bg-carbon sticky top-0 flex h-dvh w-sidebar shrink-0 flex-col px-3 pt-[18px] pb-[14px] text-white">
      <div className="flex items-center gap-[10px] px-[11px] pt-1 pb-4">
        <div className="bg-teal text-tinta-teal font-serif grid size-[30px] place-items-center rounded-[10px] text-titulo">
          J
        </div>
        <b className="font-serif text-titulo font-normal">Jubileo</b>
      </div>

      <nav aria-label="Navegación principal" className="flex shrink-0 flex-col gap-[2px]">
        {DESTINOS_ESCRITORIO.map((ruta) => {
          const Icono = ICONO[ruta]
          return (
            <Renglon
              key={ruta}
              texto={ROTULO[ruta].pantalla}
              activo={ruta === activa}
              alTocar={() => ir(ruta)}
            >
              <Icono tam={15} />
            </Renglon>
          )
        })}
      </nav>

      {/*
        El contexto permanente: dónde estás en el mes, y qué deuda atacas.

        Solo esta zona se desplaza. Cuando el sidebar entero lo hacía, un mes de
        cinco semanas más el enfoque empujaban la navegación fuera de la vista
        en cuanto alguien bajaba un poco — y quedarse sin manera de salir de la
        pantalla no es un desplazamiento, es una trampa.
      */}
      <div className="flex min-h-0 flex-1 flex-col gap-[2px] overflow-y-auto">
        <RailDeSemanas
          presupuesto={presupuesto}
          alTocarSemana={(semana) => ir({ ruta: 'mes', semana })}
        />
        <Enfoque presupuesto={presupuesto} alTocar={() => ir('deudas')} />
      </div>

      <div className="border-linea-oscura mt-auto flex shrink-0 flex-col gap-[2px] border-t pt-[10px]">
        <Renglon
          texto={ROTULO.ajustes.pantalla}
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
