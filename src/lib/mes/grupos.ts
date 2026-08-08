/**
 * Qué grupos de El mes están abiertos.
 *
 * Se guarda en `localStorage` porque es una preferencia de cómo se mira, no un
 * dato del presupuesto: no tiene por qué viajar al servidor ni ensuciar el mes.
 * La lectura vive aquí y no dentro del componente para poder probar lo que de
 * verdad se rompe — lo guardado de una versión vieja, lo guardado a mano, y el
 * caso que se equivoca solo: **cerrar todos los grupos no es lo mismo que no
 * haber elegido nada**, y una lectura descuidada los vuelve a abrir todos.
 */

export const GRUPOS = ['mayordomia', 'fijo', 'variable', 'deuda'] as const

export type ClaveGrupo = (typeof GRUPOS)[number]

/** Al entrar por primera vez: lo que se reparte a mano, abierto; deudas, no. */
export const ABIERTOS_POR_OMISION: readonly ClaveGrupo[] = ['mayordomia', 'fijo', 'variable']

const esClave = (x: unknown): x is ClaveGrupo =>
  typeof x === 'string' && (GRUPOS as readonly string[]).includes(x)

/**
 * Lo guardado, o los de omisión si no hay nada que entender. Una lista vacía
 * sí se respeta: es el usuario que cerró todo.
 */
export function leerAbiertos(guardado: string | null): ClaveGrupo[] {
  if (guardado === null) return [...ABIERTOS_POR_OMISION]
  let leido: unknown
  try {
    leido = JSON.parse(guardado)
  } catch {
    return [...ABIERTOS_POR_OMISION]
  }
  if (!Array.isArray(leido)) return [...ABIERTOS_POR_OMISION]
  // Las claves que ya no existen se caen solas; las que quedan se conservan.
  return leido.filter(esClave)
}

export function escribirAbiertos(abiertos: readonly ClaveGrupo[]): string {
  return JSON.stringify(GRUPOS.filter((g) => abiertos.includes(g)))
}

export function alternar(
  abiertos: readonly ClaveGrupo[],
  clave: ClaveGrupo,
): ClaveGrupo[] {
  return abiertos.includes(clave)
    ? abiertos.filter((g) => g !== clave)
    : [...abiertos, clave]
}
