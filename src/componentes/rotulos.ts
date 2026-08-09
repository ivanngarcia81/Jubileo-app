import type { Ruta } from '../rutas'

/**
 * Cómo se llama cada destino, en un solo lugar.
 *
 * Antes cada nombre vivía escrito a mano en tres sitios —el renglón del
 * sidebar, el título de la cabecera de escritorio y la píldora del teléfono—
 * y los tres podían decir cosas distintas sin que nadie se enterara. De hecho
 * lo hacían: la ruta `resumen` era "Mi semana" en el sidebar y "Mi semana" en
 * la cabecera, pero en el teléfono ni siquiera existía.
 *
 * Dos nombres por destino y no uno, a propósito:
 *
 * - `pantalla` es cómo se llama la pantalla. Cabe un nombre largo.
 * - `pildora` es lo que entra en la píldora del teléfono, que son cuatro
 *   botones en el ancho de un pulgar. Solo lo llevan los cuatro que salen
 *   ahí.
 *
 * Que "Dashboard" se llame "Inicio" en la píldora no es una inconsistencia:
 * es la misma pantalla dicha en el espacio que hay. Lo que sí sería una
 * inconsistencia es que el usuario lea dos palabras distintas para dos cosas
 * que cree distintas, y eso lo evita tener una sola tabla.
 */
export interface Rotulo {
  pantalla: string
  pildora?: string
}

export const ROTULO: Record<Ruta, Rotulo> = {
  resumen: { pantalla: 'Dashboard', pildora: 'Inicio' },
  mes: { pantalla: 'Presupuesto mensual', pildora: 'Presupuesto' },
  deudas: { pantalla: 'Deudas', pildora: 'Deudas' },
  metas: { pantalla: 'Metas', pildora: 'Metas' },
  movimientos: { pantalla: 'Movimientos' },
  ajustes: { pantalla: 'Ajustes' },
  aviso: { pantalla: 'Aviso' },
}

/** Los cuatro de la píldora del teléfono, en su orden. */
export const DESTINOS_MOVIL = ['resumen', 'mes', 'deudas', 'metas'] as const satisfies readonly Ruta[]

/** Los cinco del sidebar de escritorio, en su orden. */
export const DESTINOS_ESCRITORIO = [
  'resumen',
  'mes',
  'deudas',
  'metas',
  'movimientos',
] as const satisfies readonly Ruta[]
