import type { FechaCivil } from '../fecha'

/**
 * Los movimientos agrupados por día.
 *
 * Una lista plana de movimientos no se lee: se escanea buscando el día. Cada
 * grupo lleva su encabezado con lo que entró y lo que salió ese día, que es la
 * pregunta que trae al usuario aquí.
 *
 * Va aparte del componente porque lo que se rompe no es el dibujo: es que un
 * movimiento caiga en el día equivocado, o que un día se cuele dos veces, o que
 * el total del día no sume lo que la lista de abajo enseña. Eso se prueba.
 */

export interface MovimientoDelDia {
  fecha: FechaCivil
  montoCents: number
  tipo: 'gasto' | 'ingreso'
}

export interface DiaDeMovimientos<T> {
  fecha: FechaCivil
  /** Lo que entró ese día. Cero si no entró nada. */
  entroCents: number
  /** Lo que salió ese día. Cero si no salió nada. */
  salioCents: number
  movimientos: T[]
}

/**
 * Del más reciente al más viejo. Dentro de un día se respeta el orden en que
 * llegaron: el repositorio ya los trae ordenados y reordenarlos aquí sería
 * inventar un criterio.
 */
export function porDia<T extends MovimientoDelDia>(
  movimientos: readonly T[],
): DiaDeMovimientos<T>[] {
  const dias = new Map<FechaCivil, DiaDeMovimientos<T>>()
  for (const m of movimientos) {
    let dia = dias.get(m.fecha)
    if (!dia) {
      dia = { fecha: m.fecha, entroCents: 0, salioCents: 0, movimientos: [] }
      dias.set(m.fecha, dia)
    }
    dia.movimientos.push(m)
    if (m.tipo === 'ingreso') dia.entroCents += m.montoCents
    else dia.salioCents += m.montoCents
  }
  // Las fechas civiles son AAAA-MM-DD: comparar como texto es comparar como
  // fecha, sin pasar por `Date` ni por una zona horaria.
  return [...dias.values()].sort((a, b) => (a.fecha > b.fecha ? -1 : a.fecha < b.fecha ? 1 : 0))
}
