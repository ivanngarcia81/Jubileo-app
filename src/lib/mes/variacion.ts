import { type Centavos, centavos } from '../dinero/index.js'

/**
 * Cuánto cambió una cifra contra el mes pasado.
 *
 * `Presupuesto` traía dos campos para esto —`variacionEntra` y
 * `variacionSale`— y eran **cadenas vacías** en producción: solo los datos de
 * ejemplo los llenaban, con números escritos a mano. Un campo que solo tiene
 * valor en la demostración es peor que no tenerlo, porque las capturas enseñan
 * algo que la app no hace.
 *
 * Aquí se calcula de lo que ya hay: `mesesPasados` trae lo que entró y lo que
 * salió en cada mes cerrado.
 *
 * **Nulo cuando no hay con qué comparar**, y eso es la mitad del trabajo: en el
 * primer mes de una cuenta nueva no existe un mes anterior, y "+$0" o "0%"
 * diría que no cambió nada cuando la verdad es que no hay contra qué medir. La
 * tarjeta no dibuja nada.
 */
export interface Variacion {
  /** La diferencia en centavos. Positiva: este mes es más que el pasado. */
  diferenciaCents: Centavos
  /** El mes contra el que se comparó, para poder decirlo. */
  etiquetaAnterior: string
}

export interface MesComparable {
  anio: number
  mes: number
  etiqueta: string
  entraCents: Centavos
  saleCents: Centavos
}

/**
 * El mes inmediatamente anterior al que se está mirando, si está en la lista.
 *
 * Se busca por **fecha**, no por posición: la lista viene ordenada, pero un
 * hueco —alguien que no abrió noviembre— convertiría a octubre en "el mes
 * pasado" de diciembre, y comparar contra dos meses atrás llamándolo el pasado
 * es mentir con precisión.
 */
function anterior(
  meses: readonly MesComparable[],
  anio: number,
  mes: number,
): MesComparable | null {
  const anioAnterior = mes === 1 ? anio - 1 : anio
  const mesAnterior = mes === 1 ? 12 : mes - 1
  return meses.find((m) => m.anio === anioAnterior && m.mes === mesAnterior) ?? null
}

export function variacionContraElMesPasado(
  meses: readonly MesComparable[],
  anio: number,
  mes: number,
  cual: 'entra' | 'sale',
): Variacion | null {
  const previo = anterior(meses, anio, mes)
  if (!previo) return null
  const actual = meses.find((m) => m.anio === anio && m.mes === mes)
  if (!actual) return null

  const de = cual === 'entra' ? previo.entraCents : previo.saleCents
  const a = cual === 'entra' ? actual.entraCents : actual.saleCents
  // Un mes anterior en cero no da comparación útil: "subió $3,000" contra un mes
  // que no se usó no dice nada de cómo va este.
  if (de === 0) return null
  if (a === de) return null

  return { diferenciaCents: centavos(a - de), etiquetaAnterior: previo.etiqueta }
}
