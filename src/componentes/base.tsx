import type { ReactNode } from 'react'
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

/** Cuadrito con el icono de la categoría. */
export function Icono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-gris border-linea text-texto-2 grid size-[26px] shrink-0 place-items-center rounded-[8px] border text-[12px] ${className}`}
    >
      {children}
    </div>
  )
}

/** Una fila de tarjeta: icono o casilla, nombre y detalle, y el monto. */
export function Fila({
  izquierda,
  titulo,
  detalle,
  derecha,
}: {
  izquierda?: ReactNode
  titulo: ReactNode
  detalle?: ReactNode
  derecha: ReactNode
}) {
  return (
    <div className="flex items-center gap-[11px]">
      {izquierda}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-medium">{titulo}</div>
        {detalle !== undefined && (
          <div className="text-texto-2 mt-[2px] text-[11.5px]">{detalle}</div>
        )}
      </div>
      <div className="text-[15px] font-semibold whitespace-nowrap">{derecha}</div>
    </div>
  )
}

/** Un fondo de reserva con su barra y su fecha objetivo. */
export function FilaFondo({
  nombre,
  acumuladoCents,
  metaCents,
  cuando,
  cifras = false,
}: {
  nombre: string
  acumuladoCents: Centavos
  metaCents: Centavos
  cuando: ReactNode
  cifras?: boolean
}) {
  const avance = porcentaje(acumuladoCents, metaCents)
  return (
    <div className="border-linea border-b py-[11px] last:border-b-0 last:pb-0">
      <div className="mb-[2px] flex items-baseline justify-between">
        <div className="text-[13.5px] font-semibold">{nombre}</div>
        <div className="text-texto-2 text-[11px]">{avance}%</div>
      </div>
      <div className="text-texto-2 mb-[7px] text-[11px]">{cuando}</div>
      <Barra porcentaje={avance} color="var(--teal)" />
      {cifras && (
        <div className="mt-[6px] flex justify-between text-[11.5px]">
          <b className="font-semibold">
            <Moneda centavos={acumuladoCents} />
          </b>
          <span className="text-texto-2">
            de <Moneda centavos={metaCents} />
          </span>
        </div>
      )}
    </div>
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
