import { type Centavos, centavos, suma } from './centavos'

/**
 * Reparte un monto entre varias partes sin perder ni inventar un centavo.
 *
 * Este es el único lugar del código donde se divide dinero. Lo usan las
 * asignaciones por periodo y el re-reparto al cambiar de frecuencia de pago,
 * y de él depende la invariante: la suma de las asignaciones de una línea
 * tiene que dar exactamente su monto mensual.
 *
 * Método: mayor residuo. Cada parte se lleva su piso; los centavos que
 * sobran van, de uno en uno, a las partes con la fracción más grande. Los
 * empates se rompen por posición, no al azar: el mismo reparto siempre da
 * el mismo resultado, y la interfaz no baila entre recargas.
 *
 * Los pesos van en enteros no negativos — típicamente `1` por cada periodo,
 * o el monto anterior en centavos cuando se re-reparte proporcionalmente.
 * La multiplicación intermedia usa BigInt: `monto × peso` se sale del entero
 * seguro de JavaScript con cifras que un presupuesto real sí alcanza.
 *
 * Si todos los pesos son cero, reparte en partes iguales: el dinero tiene
 * que ir a algún lado y repartirlo parejo es lo menos sorprendente.
 */
export function repartir(total: Centavos, pesos: readonly number[]): Centavos[] {
  for (const p of pesos) {
    if (!Number.isInteger(p) || p < 0) {
      throw new RangeError(`Los pesos del reparto van en enteros no negativos, llegó: ${p}`)
    }
  }

  if (pesos.length === 0) {
    if (total !== 0) {
      throw new RangeError(`No hay entre quién repartir ${total} centavos`)
    }
    return []
  }

  if (total === 0) return pesos.map(() => centavos(0))

  // El reparto de un monto negativo es el negativo del reparto positivo.
  if (total < 0) {
    return repartir(centavos(-total), pesos).map((m) => centavos(-m))
  }

  const totalPesos = pesos.reduce((a, b) => a + b, 0)
  const efectivos = totalPesos === 0 ? pesos.map(() => 1) : pesos
  const sumaEfectiva = BigInt(totalPesos === 0 ? pesos.length : totalPesos)

  const grandes = BigInt(total)
  const partes = efectivos.map((peso, indice) => {
    const producto = grandes * BigInt(peso)
    return {
      indice,
      base: Number(producto / sumaEfectiva),
      resto: producto % sumaEfectiva,
    }
  })

  const repartido = partes.reduce((a, p) => a + p.base, 0)
  const sobrantes = total - repartido

  // Los centavos sobrantes son menos que el número de partes, siempre.
  const orden = [...partes].sort((a, b) => {
    if (a.resto !== b.resto) return a.resto > b.resto ? -1 : 1
    return a.indice - b.indice
  })
  for (let i = 0; i < sobrantes; i++) {
    const parte = orden[i]
    if (parte === undefined) break
    partes[parte.indice]!.base += 1
  }

  const resultado = partes.map((p) => centavos(p.base))

  // Cinturón y tirantes: la invariante del producto entero cuelga de aquí.
  if (suma(resultado) !== total) {
    throw new Error(`El reparto no cuadró: ${suma(resultado)} ≠ ${total}`)
  }
  return resultado
}

/** Reparte en partes iguales entre `n` partes. */
export function repartirParejo(total: Centavos, n: number): Centavos[] {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`Número de partes inválido: ${n}`)
  }
  return repartir(total, new Array<number>(n).fill(1))
}
