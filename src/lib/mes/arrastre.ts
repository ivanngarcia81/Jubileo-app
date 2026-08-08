import { type Centavos, centavos, suma } from '../dinero'

/**
 * Qué se lleva un mes nuevo del anterior.
 *
 * Sin esto la app sirve un mes y estorba el siguiente: el 1 de septiembre el
 * usuario se encontraría todos sus sobres en cero y tendría que volver a
 * teclear cada monto, cada mes, para siempre. Un presupuesto se ajusta, no se
 * reescribe.
 *
 * Lo que nace es un **punto de partida**, no una decisión tomada: el usuario ve
 * los montos antes de que existan y los cambia en cuanto entre. La app no
 * presupuesta por nadie — arrastra lo que él decidió el mes pasado.
 */

export interface LineaDelMes {
  categoriaId: string
  montoMensualCents: Centavos
}

export interface Arrastre {
  /** Las líneas con las que nace el mes nuevo. */
  lineas: LineaDelMes[]
  /** Lo que suman al mes, para poder enseñarlo antes de crear nada. */
  totalMensualCents: Centavos
  /**
   * Categorías que tenían monto el mes pasado y no se lo llevan, porque ya no
   * están activas. Se devuelven en vez de desaparecer en silencio: si alguien
   * quitó un sobre a media carrera, el mes nuevo cambia de forma y decirlo
   * cuesta un renglón.
   */
  seQuedaronFuera: string[]
}

/**
 * Los montos siguen tal cual, **incluido el cero**. Una línea en cero es una
 * decisión tomada —"a este sobre no le pongo nada este mes"— y no es lo mismo
 * que no haber decidido: al arrastrarla, el mes nuevo nace idéntico al que se
 * cerró, y lo que el usuario cambie es un cambio suyo y no un efecto de la
 * migración.
 */
export function loQueSeArrastra(
  previas: readonly LineaDelMes[],
  categoriasActivas: ReadonlySet<string>,
): Arrastre {
  const lineas: LineaDelMes[] = []
  const seQuedaronFuera: string[] = []

  for (const linea of previas) {
    if (categoriasActivas.has(linea.categoriaId)) lineas.push(linea)
    else seQuedaronFuera.push(linea.categoriaId)
  }

  return {
    lineas,
    totalMensualCents: centavos(suma(lineas.map((l) => l.montoMensualCents))),
    seQuedaronFuera,
  }
}
