import type { CSSProperties, ReactNode } from 'react'
import { type Centavos, formatear, formatearRedondo } from '../lib/dinero'

/**
 * Piezas compartidas, extraídas del CSS de `design/`. Los colores y las
 * tipografías salen de los tokens; las medidas exactas (13px de radio,
 * 14.5px de texto) salen del mockup, que es el contrato visual.
 */

/** Todo número de dinero lleva cifras de ancho fijo. Regla 1 de los tokens. */
export function Moneda({
  centavos: monto,
  redondo = true,
  className = '',
}: {
  centavos: Centavos
  redondo?: boolean
  className?: string
}) {
  return (
    <span className={`[font-variant-numeric:tabular-nums] tracking-[-.01em] ${className}`}>
      {redondo ? formatearRedondo(monto) : formatear(monto)}
    </span>
  )
}

export function Tarjeta({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-blanco border-linea rounded-[13px] border p-[13px_14px] ${className}`}>
      {children}
    </div>
  )
}

/** Encabezado de sección: etiqueta en mayúsculas y, a la derecha, un dato. */
export function Seccion({ children, dato }: { children: ReactNode; dato?: ReactNode }) {
  return (
    <div className="text-texto-2 mt-5 mb-[9px] flex items-center justify-between text-[10.5px] font-semibold tracking-[.12em] uppercase">
      <span>{children}</span>
      {dato !== undefined && (
        <span className="text-teal-osc text-[11.5px] font-medium tracking-normal normal-case">
          {dato}
        </span>
      )}
    </div>
  )
}

/** Barra de progreso. El color lo decide quien la usa. */
export function Barra({ porcentaje, color }: { porcentaje: number; color: string }) {
  return (
    <div className="bg-gris h-[6px] overflow-hidden rounded-full">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%`, background: color }}
      />
    </div>
  )
}

/**
 * El color de un sobre según lo gastado.
 *
 * Regla 4 de los tokens: el rojo aparece solo cuando el usuario ya se pasó,
 * nunca como advertencia preventiva. Para "cuidado" va el ámbar.
 */
export function colorDeSobre(gastado: Centavos, presupuesto: Centavos): string {
  if (presupuesto <= 0) return 'var(--teal)'
  const parte = gastado / presupuesto
  if (parte >= 1) return 'var(--rojo)'
  if (parte >= 0.8) return 'var(--ambar)'
  return 'var(--teal)'
}

export function porcentaje(parte: Centavos, total: Centavos): number {
  if (total <= 0) return 0
  return Math.round((parte / total) * 100)
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="bg-teal/14 text-teal-osc inline-block rounded-[5px] px-[6px] py-[2px] text-[10px] font-bold tracking-[.05em] uppercase">
      {children}
    </span>
  )
}

/** Control segmentado: Entra · Sale · Sobró, o Semana · Cheque · Mes. */
export function Segmentado({
  opciones,
  activa,
  alElegir,
  className = '',
}: {
  opciones: readonly string[]
  activa: string
  alElegir: (opcion: string) => void
  className?: string
}) {
  return (
    <div className={`bg-gris flex gap-[2px] rounded-full p-[3px] ${className}`}>
      {opciones.map((opcion) => {
        const activo = opcion === activa
        return (
          <button
            key={opcion}
            type="button"
            onClick={() => alElegir(opcion)}
            aria-pressed={activo}
            className={`flex-1 rounded-full px-[13px] py-[6px] text-[11.5px] ${
              activo
                ? 'bg-blanco text-texto font-semibold shadow-[0_1px_3px_rgba(0,0,0,.09)]'
                : 'text-texto-2 font-medium'
            }`}
          >
            {opcion}
          </button>
        )
      })}
    </div>
  )
}

/** Casilla de marcado de los pagos del periodo. */
export function Casilla({
  marcada,
  etiqueta,
  alCambiar,
  ocupada = false,
}: {
  marcada: boolean
  etiqueta: string
  /** Ausente en la demostración: se ve, no se toca. */
  alCambiar?: (() => void) | undefined
  /** Esperando al servidor. */
  ocupada?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      aria-busy={ocupada}
      disabled={!alCambiar || ocupada}
      aria-label={marcada ? `Desmarcar ${etiqueta}` : `Marcar ${etiqueta} como pagado`}
      onClick={alCambiar}
      className={`relative size-[21px] shrink-0 rounded-[6px] border-[1.5px] before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] ${
        ocupada ? 'opacity-50' : ''
      } ${marcada ? 'bg-teal border-teal' : 'border-linea'}`}
    >
      {marcada && (
        <span className="absolute top-[3px] left-[6px] h-[10px] w-[6px] rotate-[40deg] border-r-2 border-b-2 border-white" />
      )}
    </button>
  )
}

/* ---------------------------------------------------------------------------
 * El sistema de listas — ver `design/listas.html`
 * ---------------------------------------------------------------------------
 *
 * La tarjeta dejó de ser el **renglón** y pasó a ser la **sección**. Antes cada
 * línea del presupuesto era su propia `<Tarjeta>`, con su borde, su relleno y
 * su sombra: nada quedaba alineado entre renglones, cada barra tenía su propio
 * ancho, y en una pantalla cabían seis líneas donde caben dieciséis. Ahora hay
 * un panel blanco por sección y adentro filas en grid separadas por una línea
 * de 1px.
 *
 * Las columnas se declaran **una sola vez, en la sección**, y las filas las
 * heredan por la variable `--cols`. Esa es toda la mecánica de la alineación:
 * si cada fila pudiera declarar las suyas, se irían separando de a poquito y
 * volveríamos al principio. Por eso `Fila` no recibe columnas.
 *
 * El teléfono y el escritorio no caben en las mismas columnas —el mockup es un
 * documento de 1420px y la app arranca en 320— así que la sección acepta dos
 * juegos: el de teléfono y, desde el corte `panel`, el del mockup.
 */

function estiloDeColumnas(columnas: string, columnasPanel: string | undefined) {
  return {
    '--cols': columnas,
    '--cols-panel': columnasPanel ?? columnas,
  } as CSSProperties
}

/** El alto mínimo de una fila. 44px es el objetivo táctil de un dedo. */
const FILA = 'grid min-h-11 items-center gap-x-3 px-[14px] panel:gap-x-[14px] panel:px-[18px]'

export function ListaSeccion({
  titulo,
  icono,
  dato,
  columnas,
  columnasPanel,
  encabezados,
  children,
  className = '',
}: {
  /** El título del panel. Sin él, el panel va pelón: solo las filas. */
  titulo?: string
  icono?: ReactNode
  /** El dato de la derecha del encabezado: un conteo, un total. */
  dato?: ReactNode
  /** `grid-template-columns` en el teléfono. */
  columnas: string
  /** Y desde 880px, cuando cambia. */
  columnasPanel?: string
  /** Rótulos de columna. El primero a la izquierda, los demás a la derecha. */
  encabezados?: readonly (string | null)[]
  children: ReactNode
  className?: string
}) {
  return (
    <section
      style={estiloDeColumnas(columnas, columnasPanel)}
      className={`bg-blanco border-linea overflow-hidden rounded-[15px] border ${className}`}
    >
      {titulo !== undefined && (
        <div className="flex items-center gap-[11px] px-[14px] pt-[15px] pb-[13px] panel:px-[18px]">
          {icono !== undefined && (
            <div className="bg-carbon text-teal grid size-7 shrink-0 place-items-center rounded-[9px]">
              {icono}
            </div>
          )}
          <h3 className="font-serif min-w-0 flex-1 truncate text-[17px] font-normal">{titulo}</h3>
          {dato !== undefined && <div className="text-texto-2 text-[12px]">{dato}</div>}
        </div>
      )}
      {encabezados !== undefined && (
        <div
          className={`${FILA} border-linea text-texto-2 min-h-0 border-b pb-2 text-[10px] font-semibold tracking-[.12em] uppercase grid-cols-[var(--cols)] panel:grid-cols-[var(--cols-panel)]`}
        >
          {encabezados.map((rotulo, i) => (
            // El primer rótulo que existe va a la izquierda —es el de la
            // columna del nombre, aunque antes venga una casilla sin rótulo— y
            // los demás a la derecha, encima de sus cifras.
            <span
              key={i}
              className={i === encabezados.findIndex((r) => r !== null) ? '' : 'text-right'}
            >
              {rotulo}
            </span>
          ))}
        </div>
      )}
      {children}
    </section>
  )
}

/**
 * Una fila de la lista. Hereda las columnas de su `ListaSeccion`.
 *
 * Con `etiqueta` la fila entera es el botón —como en el mockup, donde no hay
 * controles sueltos dentro del renglón— y esa etiqueta es su nombre accesible:
 * un botón sin nombre no existe para quien navega con lector. Con etiqueta pero
 * sin `alTocar` sale desactivada, que es como se ve la demostración: se mira,
 * no se toca.
 */
export function Fila({
  children,
  alTocar,
  etiqueta,
  abierta,
  className = '',
}: {
  children: ReactNode
  alTocar?: (() => void) | undefined
  etiqueta?: string
  /** Solo en las filas que abren y cierran un grupo. */
  abierta?: boolean
  className?: string
}) {
  const comun = `${FILA} border-linea w-full border-b text-left last:border-b-0 grid-cols-[var(--cols)] panel:grid-cols-[var(--cols-panel)] ${className}`
  if (etiqueta === undefined) return <div className={comun}>{children}</div>
  return (
    <button
      type="button"
      onClick={alTocar}
      disabled={!alTocar}
      aria-label={etiqueta}
      aria-expanded={abierta}
      className={`${comun} enabled:hover:bg-[#FAFBFA] disabled:opacity-60`}
    >
      {children}
    </button>
  )
}

/** La última fila de una lista: la que la hace crecer. */
export function FilaAgregar({
  texto,
  alTocar,
}: {
  texto: string
  alTocar?: (() => void) | undefined
}) {
  return (
    <Fila {...(alTocar ? { alTocar } : {})} etiqueta={texto}>
      <div className="text-texto-2 flex min-w-0 items-center gap-2 py-2 text-[13px]">
        <span className="text-teal-osc shrink-0 text-[17px] leading-none">+</span>
        <span className="truncate">{texto}</span>
      </div>
    </Fila>
  )
}

/** La celda del nombre: icono opcional, el nombre que se corta, y su detalle. */
export function CeldaNombre({
  icono,
  children,
  detalle,
  className = '',
}: {
  icono?: ReactNode
  children: ReactNode
  detalle?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex min-w-0 items-center gap-[9px] py-[7px] ${className}`}>
      {icono !== undefined && (
        <div className="bg-gris border-linea text-texto-2 grid size-6 shrink-0 place-items-center rounded-[7px] border">
          {icono}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-medium">{children}</div>
        {detalle !== undefined && (
          <div className="text-texto-2 mt-[1px] truncate text-[11px]">{detalle}</div>
        )}
      </div>
    </div>
  )
}

/** Una cifra a la derecha. `apagada` es para el dato de referencia, no el principal. */
export function CeldaCifra({
  children,
  apagada = false,
  className = '',
}: {
  children: ReactNode
  apagada?: boolean
  className?: string
}) {
  return (
    <div
      className={`text-right whitespace-nowrap [font-variant-numeric:tabular-nums] ${
        apagada ? 'text-texto-2 text-[13px]' : 'text-[13.5px] font-semibold'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Un fondo de reserva: nombre y fecha objetivo, la barra en su carril, y lo
 * que lleva juntado de lo que necesita. Va dentro de una `ListaSeccion` de tres
 * columnas.
 */
export function FilaFondo({
  nombre,
  acumuladoCents,
  metaCents,
  cuando,
  alTocar,
  etiqueta,
}: {
  nombre: string
  acumuladoCents: Centavos
  metaCents: Centavos
  cuando: ReactNode
  alTocar?: (() => void) | undefined
  etiqueta?: string
}) {
  const avance = porcentaje(acumuladoCents, metaCents)
  return (
    <Fila {...(alTocar ? { alTocar, etiqueta } : {})}>
      <CeldaNombre detalle={cuando}>{nombre}</CeldaNombre>
      <Barra porcentaje={avance} color="var(--teal)" />
      <CeldaCifra>
        <Moneda centavos={acumuladoCents} />
        <div className="text-texto-2 text-[11px] font-normal">
          de <Moneda centavos={metaCents} />
        </div>
      </CeldaCifra>
    </Fila>
  )
}

/**
 * El marco de una hoja que sube desde abajo.
 *
 * Todas las decisiones que tocan dinero se toman en una de estas, y todas
 * comparten lo mismo: fondo oscuro que cierra al tocarlo, esquinas redondeadas
 * arriba, y espacio para la barra del teléfono. Tenerlo en un solo lugar evita
 * que se vayan separando de a poquito, que es como los diseños se rompen.
 */
export function Hoja({
  etiqueta,
  alCerrar,
  children,
}: {
  etiqueta: string
  alCerrar: () => void
  children: ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/45"
      onClick={alCerrar}
      role="presentation"
    >
      <div
        className="bg-blanco max-h-[92dvh] w-full overflow-y-auto rounded-t-[20px] px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={etiqueta}
      >
        {children}
      </div>
    </div>
  )
}

/** Campo de dinero: el signo fijo y el número en serif, como las cifras héroe. */
export function CampoDinero({
  valor,
  alCambiar,
  etiqueta,
  autoFoco = false,
  desactivado = false,
}: {
  valor: string
  alCambiar: (v: string) => void
  etiqueta: string
  autoFoco?: boolean
  desactivado?: boolean
}) {
  return (
    <div className="border-linea mt-2 flex items-center gap-2 rounded-[13px] border px-4">
      <span className="text-texto-2 font-serif text-[26px]">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={valor}
        autoFocus={autoFoco}
        disabled={desactivado}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder="0.00"
        aria-label={etiqueta}
        className="text-texto font-serif min-h-14 w-full bg-transparent text-[30px] [font-variant-numeric:tabular-nums] placeholder:text-[#C3C7C4] focus:outline-none"
      />
    </div>
  )
}

/** Los dos botones del pie de una hoja. */
export function PieDeHoja({
  alCancelar,
  alConfirmar,
  confirmar,
  cancelar = 'Cancelar',
  listo,
  ocupado = false,
}: {
  alCancelar: () => void
  alConfirmar: () => void
  confirmar: string
  cancelar?: string
  listo: boolean
  ocupado?: boolean
}) {
  return (
    <div className="mt-5 flex gap-3">
      <button
        type="button"
        onClick={alCancelar}
        disabled={ocupado}
        className="border-linea text-texto-2 min-h-11 flex-1 rounded-[11px] border text-[14px] font-semibold"
      >
        {cancelar}
      </button>
      <button
        type="button"
        onClick={alConfirmar}
        disabled={!listo || ocupado}
        className="bg-teal min-h-11 flex-[1.6] rounded-[11px] text-[14px] font-bold text-[#043432] disabled:opacity-50"
      >
        {ocupado ? 'Guardando…' : confirmar}
      </button>
    </div>
  )
}
