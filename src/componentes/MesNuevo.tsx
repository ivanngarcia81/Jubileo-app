import { useState } from 'react'
import { centavos } from '../lib/dinero'
import type { MesObjetivo } from '../lib/periodos'
import { Moneda } from './base'
import { nombreDeMes } from './textos'

/**
 * Abrir el mes que sigue.
 *
 * Quien ya lleva un mes usando la app no es un usuario nuevo, y hasta hoy la
 * app lo trataba como tal: el 1 de septiembre le preguntaba otra vez cómo le
 * pagan, y el mes nacía con todos sus sobres en cero.
 *
 * Aquí no se le pregunta nada, porque no hace falta: su frecuencia de pago ya
 * está guardada y sus montos son los del mes pasado. Pero **hay un botón**, y
 * eso es a propósito: el mes no se abre solo. Presupuestar es un acto, y el
 * usuario ve lo que va a nacer antes de que exista.
 */

export interface LoQueTrae {
  anterior: { anio: number; mes: number }
  cuantasLineas: number
  totalMensualCents: number
  seQuedaronFuera: string[]
}

export function MesNuevo({
  mes,
  trae,
  alAbrir,
}: {
  mes: MesObjetivo
  trae: LoQueTrae
  alAbrir: () => Promise<void>
}) {
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esteMes = nombreDeMes(mes.mes).toLowerCase()
  const mesPasado = nombreDeMes(trae.anterior.mes).toLowerCase()

  async function abrir() {
    setAbriendo(true)
    setError(null)
    try {
      await alAbrir()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el mes.')
      setAbriendo(false)
    }
  }

  return (
    <main className="bg-gris text-texto font-sans min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-[46ch]">
        <h1 className="font-serif text-cifra leading-[1.15]">Vamos a armar {esteMes}</h1>
        <p className="text-texto-2 mt-2 text-cuerpo leading-[1.6]">
          Tus cheques salen de cómo te pagan, que ya está guardado. Y tus sobres arrancan con los
          montos de {mesPasado}, para que solo ajustes lo que cambió.
        </p>

        {trae.cuantasLineas > 0 && (
          <div className="bg-blanco border-linea mt-6 rounded-[15px] border p-5">
            <div className="text-texto-2 text-rotulo font-semibold tracking-[.12em] uppercase">
              Lo que se arrastra de {mesPasado}
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-texto text-cuerpo">
                {trae.cuantasLineas === 1 ? '1 sobre' : `${trae.cuantasLineas} sobres`}
              </span>
              <span className="font-serif text-titulo [font-variant-numeric:tabular-nums]">
                <Moneda centavos={centavos(trae.totalMensualCents)} />
              </span>
            </div>
            <p className="text-texto-2 mt-3 text-menor leading-[1.55]">
              Son un punto de partida, no una decisión tomada. Los cambias en cuanto entres.
            </p>
          </div>
        )}

        {trae.seQuedaronFuera.length > 0 && (
          <p className="text-texto-2 mt-4 text-menor leading-[1.55]">
            {trae.seQuedaronFuera.join(', ')}
            {trae.seQuedaronFuera.length === 1 ? ' no se arrastra' : ' no se arrastran'} porque ya
            no {trae.seQuedaronFuera.length === 1 ? 'está' : 'están'} en tu presupuesto.
          </p>
        )}

        {error && (
          <p className="text-ambar mt-5 text-cuerpo leading-[1.5]" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void abrir()}
          disabled={abriendo}
          className="bg-teal mt-7 min-h-12 w-full rounded-[11px] text-cuerpo font-bold text-tinta-teal disabled:opacity-50"
        >
          {abriendo ? 'Armando…' : `Armar ${esteMes}`}
        </button>
      </div>
    </main>
  )
}
