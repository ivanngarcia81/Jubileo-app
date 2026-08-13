import type { ReactNode } from 'react'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpDown,
  Baby,
  Car,
  CircleDollarSign,
  CreditCard,
  Gift,
  HandCoins,
  HeartPulse,
  Home,
  PawPrint,
  Phone,
  PiggyBank,
  ShieldCheck,
  Shirt,
  UtensilsCrossed,
  Wallet,
  Zap,
  BatteryMedium,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Settings,
  Signal,
  Star,
  Target,
  X,
  TrendingDown,
  UserRound,
} from 'lucide-react'
import type { ClaveIcono } from '../lib/iconos'

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
/** La flecha de un grupo que se abre. Apunta a la derecha; abierta, gira 90°. */
export const IconoAbrir = (p: PropsIcono) => <ChevronRight {...base(p)} />
export const IconoAviso = (p: PropsIcono) => <Bell {...base(p)} />
export const IconoAjustes = (p: PropsIcono) => <Settings {...base(p)} />
export const IconoEditar = (p: PropsIcono) => <Pencil {...base(p)} />
export const IconoMas = (p: PropsIcono) => <MoreHorizontal {...base(p)} />

// ---------- Dentro de las tarjetas ----------
export const IconoDinero = (p: PropsIcono) => <CircleDollarSign {...base(p)} />
export const IconoMovimientos = (p: PropsIcono) => <ArrowUpDown {...base(p)} />
export const IconoCoach = (p: PropsIcono) => <UserRound {...base(p)} />
export const IconoEnfoque = (p: PropsIcono) => <Star {...base(p)} />
export const IconoReloj = (p: PropsIcono) => <Clock {...base(p)} />
export const IconoPalomita = (p: PropsIcono) => <Check {...base(p)} />
export const IconoAnotar = (p: PropsIcono) => <Plus {...base(p)} />
export const IconoCerrar = (p: PropsIcono) => <X {...base(p)} />
/** Un gasto: el recibo. Va en la hoja de acción rápida, no en las categorías. */
export const IconoGasto = (p: PropsIcono) => <Receipt {...base(p)} />
/** Dinero que llega. La misma flecha que ya usa la clave `ingreso`. */
export const IconoEntra = (p: PropsIcono) => <ArrowDownLeft {...base(p)} />
export const IconoFlecha = (p: PropsIcono) => <ArrowRight {...base(p)} />

// ---------- El teléfono de mentiras del aviso ----------
export const IconoSenal = (p: PropsIcono) => <Signal {...base(p)} />
export const IconoBateria = (p: PropsIcono) => <BatteryMedium {...base(p)} />

// ---------- Los iconos que vienen de los datos ----------
//
// Antes el campo `icono` guardaba el carácter: `✦ ◇ ⌂ ⚡ ⛨ ☰ ↓ ·`. Son los
// peores casos posibles —`⛨` y `☰` faltan en varias fuentes de sistema, `⌂` en
// casi todas las de Android— y son los que más se repiten: uno por cada línea
// del presupuesto y uno por cada movimiento. Donde había cuatro glifos se
// arreglaron; donde hay treinta seguían.
//
// Ahora el campo guarda una **clave**. Cambiar de set de iconos era un UPDATE
// en la base; ahora es este archivo.

/**
 * El tipo vive en `lib/iconos` y no aquí: la clave es un dato —va en la base,
 * la sugiere una función pura, la valida un CHECK— y este archivo solo dice
 * qué dibujo le toca. Se re-exporta porque media app ya la importa de aquí.
 */
export type { ClaveIcono }

const POR_CLAVE: Record<ClaveIcono, (p: PropsIcono) => ReactNode> = {
  // Las que salen del grupo cuando la categoría no eligió ninguna.
  // Una mano dando monedas. Antes eran destellos, y unos destellos en 2026
  // quieren decir "inteligencia artificial" en cualquier interfaz del mundo —
  // no diezmo. `Church` habría sido lo obvio y se descartó: mayordomía es lo
  // que se da, no dónde; una iglesia dibujada le pone denominación a una app
  // que no la tiene.
  mayordomia: (p) => <HandCoins {...base(p)} />,
  fijo: (p) => <CircleDollarSign {...base(p)} />,
  // La cartera: lo que se gasta y cambia de mes a mes. Antes era un rombo, que
  // no quiere decir nada — y como es el icono que le toca a toda categoría que
  // no eligió el suyo, era el que más se veía.
  variable: (p) => <Wallet {...base(p)} />,
  deuda: (p) => <TrendingDown {...base(p)} />,
  ingreso: (p) => <ArrowDownLeft {...base(p)} />,
  gasto: (p) => <CircleDollarSign {...base(p)} />,
  // Las que se eligen a mano, en el orden de la rejilla.
  casa: (p) => <Home {...base(p)} />,
  comida: (p) => <UtensilsCrossed {...base(p)} />,
  transporte: (p) => <Car {...base(p)} />,
  servicios: (p) => <Zap {...base(p)} />,
  telefono: (p) => <Phone {...base(p)} />,
  seguro: (p) => <ShieldCheck {...base(p)} />,
  salud: (p) => <HeartPulse {...base(p)} />,
  ropa: (p) => <Shirt {...base(p)} />,
  ninos: (p) => <Baby {...base(p)} />,
  mascota: (p) => <PawPrint {...base(p)} />,
  regalo: (p) => <Gift {...base(p)} />,
  ahorro: (p) => <PiggyBank {...base(p)} />,
  tarjeta: (p) => <CreditCard {...base(p)} />,
  personal: (p) => <UserRound {...base(p)} />,
}

/** El icono de una clave. Una clave desconocida cae al genérico, no revienta. */
export function IconoDeClave({ clave, ...resto }: { clave: ClaveIcono } & PropsIcono) {
  return (POR_CLAVE[clave] ?? POR_CLAVE.gasto)(resto)
}
