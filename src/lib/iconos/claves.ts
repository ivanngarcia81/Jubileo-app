/**
 * Las claves de icono y la sugerencia por nombre.
 *
 * La base guarda **la clave, no el dibujo**: `categorias.icono` dice `'comida'`,
 * y quién dibuja `'comida'` lo decide `componentes/iconos.tsx`. Si guardáramos
 * el SVG, cambiar de set de iconos —o corregir uno que se ve mal en Android—
 * sería una migración de datos en vez de un cambio de una línea, y la base
 * cargaría con marcado que no le toca.
 *
 * Este módulo es puro y sin React a propósito: lo usa el cliente para sugerir
 * y **lo espeja la migración 0007** para sembrar lo que ya existe. No se pueden
 * compartir de verdad —la migración es SQL corriendo dentro de Postgres y no
 * puede importar TypeScript— así que se fijan uno contra otro con pruebas, el
 * mismo trato que `repartir` y `reparto_semanal`.
 */

export type ClaveIcono =
  // Las que salen del grupo cuando la categoría no eligió ninguna.
  | 'mayordomia'
  | 'fijo'
  | 'variable'
  | 'deuda'
  | 'ingreso'
  | 'gasto'
  // Las que se eligen a mano.
  | 'casa'
  | 'comida'
  | 'transporte'
  | 'servicios'
  | 'telefono'
  | 'seguro'
  | 'salud'
  | 'ropa'
  | 'regalo'
  | 'mascota'
  | 'ninos'
  | 'ahorro'
  | 'tarjeta'
  | 'personal'

/**
 * Lo que el usuario puede escoger en la hoja de categoría, en el orden en que
 * se dibuja la rejilla: primero lo que casi todo hogar tiene, al final lo
 * genérico. Dieciséis y no treinta: una rejilla que no se puede recorrer de un
 * vistazo obliga a leerla, y entonces nadie la usa y todo se queda en el
 * primero.
 */
export const CLAVES_DE_CATEGORIA: readonly ClaveIcono[] = [
  'casa',
  'comida',
  'transporte',
  'servicios',
  'telefono',
  'seguro',
  'salud',
  'ropa',
  'ninos',
  'mascota',
  'regalo',
  'ahorro',
  'tarjeta',
  'personal',
  'deuda',
  'mayordomia',
  'gasto',
]

/** Su nombre en español, para el `aria-label` de cada botón de la rejilla. */
export const NOMBRE_DE_CLAVE: Record<ClaveIcono, string> = {
  mayordomia: 'Mayordomía',
  fijo: 'Gasto fijo',
  variable: 'Sobre variable',
  deuda: 'Deuda',
  ingreso: 'Ingreso',
  gasto: 'Genérico',
  casa: 'Casa',
  comida: 'Comida',
  transporte: 'Transporte',
  servicios: 'Servicios',
  telefono: 'Teléfono',
  seguro: 'Seguro',
  salud: 'Salud',
  ropa: 'Ropa',
  regalo: 'Regalos',
  mascota: 'Mascota',
  ninos: 'Niños',
  ahorro: 'Ahorro',
  tarjeta: 'Tarjeta',
  personal: 'Personal',
}

export function esClaveDeCategoria(v: string): v is ClaveIcono {
  return (CLAVES_DE_CATEGORIA as readonly string[]).includes(v)
}

/**
 * Las palabras que sugieren un icono, **en orden**: gana la primera que
 * aparezca en el nombre. El orden no es alfabético ni casual — es lo que hace
 * que "Seguro del carro" salga con el escudo y no con el coche, porque
 * `seguro` se prueba antes que `transporte`.
 *
 * Se compara por trozo y no por palabra completa: la gente escribe
 * "Supermercado", no "súper". Un falso positivo aquí cuesta poco — es una
 * **sugerencia**, y el usuario la cambia en la misma hoja donde la vio.
 */
export const PALABRAS: readonly { clave: ClaveIcono; palabras: readonly string[] }[] = [
  { clave: 'seguro', palabras: ['seguro'] },
  { clave: 'casa', palabras: ['renta', 'casa', 'hipoteca'] },
  // `gas` falta a propósito: la comparación es por trozo, "Gasolina" contiene
  // "gas", y `servicios` se prueba antes que `transporte`. Agregarlo le robaría
  // el icono a la gasolina de todo el mundo. Ver `0009_iconos_mas_palabras.sql`.
  {
    clave: 'servicios',
    palabras: [
      'luz',
      'electricidad',
      'agua',
      'internet',
      'cable',
      'telefono',
      'celular',
      'servicios',
    ],
  },
  { clave: 'comida', palabras: ['comida', 'super', 'despensa'] },
  { clave: 'transporte', palabras: ['gasolina', 'carro', 'auto', 'uber', 'bus'] },
  { clave: 'tarjeta', palabras: ['tarjeta'] },
  // "Gastos personales" y "Personal" son de los nombres más comunes que hay, y
  // caían en el genérico. Va al final porque es la más ancha de todas: si
  // fuera antes, "Seguro personal" saldría con la persona y no con el escudo.
  { clave: 'personal', palabras: ['personal'] },
]

/**
 * Minúsculas y sin acentos. El usuario teclea "Teléfono" o "telefono" según el
 * teclado que traiga, y las dos tienen que caer en el mismo lugar. En SQL lo
 * hace `translate(lower(nombre), 'áéíóúüñ', 'aeiouun')`, que es lo mismo.
 */
export function normalizar(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Qué icono sugerirle a una categoría por su nombre. Nulo cuando no se parece
 * a nada: entonces manda el grupo, que es lo que la app hacía siempre.
 */
export function sugerirIcono(nombre: string): ClaveIcono | null {
  const limpio = normalizar(nombre)
  for (const { clave, palabras } of PALABRAS) {
    if (palabras.some((p) => limpio.includes(p))) return clave
  }
  return null
}
