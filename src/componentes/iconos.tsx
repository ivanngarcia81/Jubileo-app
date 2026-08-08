import {
  ArrowRight,
  ArrowUpDown,
  BatteryMedium,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Signal,
  Star,
  Target,
  TrendingDown,
  UserRound,
} from 'lucide-react'

/**
 * Los iconos de la app. El único archivo que importa de `lucide-react`.
 *
 * Antes eran glifos Unicode copiados del mockup: `◆ ▣ ↓ ◍ ◔ ⌕ ✎ ⋯ ★ ⇅ ◌ ◷`.
 * En un mockup pasan, porque el mockup se mira en una computadora. En
 * producción cada sistema los dibuja con una fuente de respaldo distinta, con
 * peso y métrica propios, y en Windows y en varios Android algunos caen a un
 * cuadro vacío. Aun cuando salen, salen desalineados del texto de al lado
 * porque no comparten métrica con Inter.
 *
 * Todos pasan por aquí para que cambiar de set —o pasar a SVG propios— sea un
 * archivo y no una búsqueda por todo `src/`.
 */

export interface PropsIcono {
  /** En píxeles. 20 es el tamaño de la app; 16 para los que van dentro de texto. */
  tam?: number
  className?: string
}

/**
 * `strokeWidth` 1.5 y no el 2 de fábrica: al lado de Inter, que es de trazo
 * fino, el 2 se ve como un icono de otra app.
 */
const base = ({ tam = 20, className = '' }: PropsIcono) => ({
  size: tam,
  strokeWidth: 1.5,
  className,
  'aria-hidden': true as const,
})

// ---------- Navegación ----------
export const IconoSemana = (p: PropsIcono) => <CalendarDays {...base(p)} />
export const IconoMes = (p: PropsIcono) => <LayoutGrid {...base(p)} />
export const IconoDeudas = (p: PropsIcono) => <TrendingDown {...base(p)} />
export const IconoMetas = (p: PropsIcono) => <Target {...base(p)} />

// ---------- Acciones de cabecera ----------
export const IconoRegresar = (p: PropsIcono) => <ChevronLeft {...base(p)} />
export const IconoAviso = (p: PropsIcono) => <Bell {...base(p)} />
export const IconoAjustes = (p: PropsIcono) => <Settings {...base(p)} />
export const IconoEditar = (p: PropsIcono) => <Pencil {...base(p)} />
export const IconoMas = (p: PropsIcono) => <MoreHorizontal {...base(p)} />
export const IconoBuscar = (p: PropsIcono) => <Search {...base(p)} />

// ---------- Dentro de las tarjetas ----------
export const IconoMovimientos = (p: PropsIcono) => <ArrowUpDown {...base(p)} />
export const IconoCoach = (p: PropsIcono) => <UserRound {...base(p)} />
export const IconoEnfoque = (p: PropsIcono) => <Star {...base(p)} />
export const IconoReloj = (p: PropsIcono) => <Clock {...base(p)} />
export const IconoPalomita = (p: PropsIcono) => <Check {...base(p)} />
export const IconoAnotar = (p: PropsIcono) => <Plus {...base(p)} />
export const IconoFlecha = (p: PropsIcono) => <ArrowRight {...base(p)} />

// ---------- El teléfono de mentiras del aviso ----------
export const IconoSenal = (p: PropsIcono) => <Signal {...base(p)} />
export const IconoBateria = (p: PropsIcono) => <BatteryMedium {...base(p)} />
