/**
 * La escala de las barras del selector de mes.
 *
 * Hasta hoy las alturas eran seis números copiados del mockup —`[28, 44, 39,
 * 52, 48, 86]`— y no tenían nada que ver con el dinero de nadie. La franja se
 * veía llena en las capturas y salía vacía en la app de verdad.
 *
 * Es presentación, pero es presentación de dinero: una barra que miente sobre
 * cuál mes fue el bueno es peor que no dibujar ninguna. Por eso vive aquí,
 * pura y con pruebas, y no dentro del componente.
 */

/**
 * Lo más chico que se dibuja sin desaparecer. Un mes de $40 junto a uno de
 * $6,000 daría menos de un píxel, y el usuario leería "ese mes no hubo nada"
 * cuando lo que hubo fue poco. Cero sí es cero: esa barra no se dibuja.
 */
const MINIMO_VISIBLE = 6

/**
 * Alturas en porcentaje, escaladas contra el mes más grande.
 *
 * Se compara por **magnitud**: en la vista de "sobró" un mes puede quedar en
 * negativo —te pasaste— y esa barra tiene que verse igual de alta que un
 * sobrante del mismo tamaño. Lo que la barra dice es *cuánto*, no *de qué
 * lado*; el color y el número lo dicen.
 */
export function alturas(valores: readonly number[]): number[] {
  const mayor = Math.max(...valores.map((v) => Math.abs(v)), 0)
  if (mayor === 0) return valores.map(() => 0)

  return valores.map((v) => {
    const magnitud = Math.abs(v)
    if (magnitud === 0) return 0
    return Math.max(MINIMO_VISIBLE, Math.round((magnitud / mayor) * 100))
  })
}

/**
 * Hasta dónde puede mirar hacia atrás.
 *
 * La sección 10 del SPEC es concreta: el nivel gratis llega al **mes actual y
 * el anterior**; premium, a todos. Los meses que no alcanza igual se dibujan —
 * enseñar que hubo historia y que hace falta premium para entrar es honesto;
 * esconderla haría creer que no existe.
 */
export function alcanzables<T>(
  meses: readonly T[],
  esElActual: (m: T) => boolean,
  todos: boolean,
): boolean[] {
  if (todos) return meses.map(() => true)
  const actual = meses.findIndex(esElActual)
  // Sin mes actual en la lista no hay desde dónde contar: se abre el último
  // par, que es lo que el nivel gratis promete de todos modos.
  const desde = actual === -1 ? meses.length - 2 : actual - 1
  return meses.map((_, i) => i >= desde)
}
