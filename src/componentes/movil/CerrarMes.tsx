import { useState } from 'react'
import type { Presupuesto } from '../../datos/tipos'
import { centavos } from '../../lib/dinero'
import { Moneda } from '../base'

/**
 * Cerrar el mes.
 *
 * El ritual que le faltaba a la app. El motor ya existía —`cerrar_mes` en
 * Postgres se niega a cerrar si alguna línea no cuadra con sus asignaciones—
 * pero nadie lo llamaba: estaba construido el candado y faltaba la llave.
 *
 * Cerrar no borra ni congela nada; deja el mes marcado como terminado. Lo que
 * de verdad importa es lo que viene después: el mes siguiente nace con estos
 * montos ya puestos.
 *
 * **Base cero manda.** El botón no se enciende mientras sobre o falte dinero
 * por repartir, y no por rigidez: el método entero consiste en que cada dólar
 * tenga nombre antes de que empiece el mes. Un mes que cierra con $400 sueltos
 * no cerró, se abandonó.
 */
export function CerrarMes({
  presupuesto,
  alCerrar,
}: {
  presupuesto: Presupuesto
  alCerrar: () => Promise<void>
}) {
  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sobra = presupuesto.sinRepartirCents
  const cuadrado = sobra === 0
  const yaCerrado = presupuesto.mesCerrado

  async function cerrar() {
    setCerrando(true)
    setError(null)
    try {
      await alCerrar()
    } catch (e) {
      // El mensaje sube en español desde la función de Postgres, con los
      // nombres de las líneas que no cuadran. Se enseña tal cual.
      setError(e instanceof Error ? e.message : 'No se pudo cerrar el mes.')
    } finally {
      setCerrando(false)
    }
  }

  if (yaCerrado) {
    return (
      <div className="bg-blanco border-linea mt-4 rounded-[15px] border p-5">
        <div className="text-texto-2 text-[10.5px] font-semibold tracking-[.12em] uppercase">
          {presupuesto.mes.etiqueta}
        </div>
        <h2 className="font-serif mt-1 text-[20px] leading-tight">Mes cerrado</h2>
        <p className="text-texto-2 mt-2 text-[13.5px] leading-[1.55]">
          Cuando entre el mes que viene, tus sobres van a arrancar con estos montos.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-blanco border-linea mt-4 rounded-[15px] border p-5">
      <h2 className="font-serif text-[20px] leading-tight">Cerrar el mes</h2>

      {cuadrado ? (
        <p className="text-texto-2 mt-2 text-[13.5px] leading-[1.55]">
          Todo tu dinero tiene nombre. Al cerrar, el mes que viene nace con estos mismos montos y
          solo ajustas lo que cambie.
        </p>
      ) : (
        <p className="text-texto-2 mt-2 text-[13.5px] leading-[1.55]">
          {sobra > 0 ? (
            <>
              Te faltan <b className="text-texto">{<Moneda centavos={sobra} />}</b> por repartir.
              Cada dólar necesita nombre antes de cerrar.
            </>
          ) : (
            <>
              Te pasaste por <b className="text-texto">{<Moneda centavos={centavos(-sobra)} />}</b>. Baja
              algún sobre hasta que cuadre.
            </>
          )}
        </p>
      )}

      {error && (
        <p className="text-ambar mt-3 text-[13px] leading-[1.5]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void cerrar()}
        disabled={!cuadrado || cerrando}
        className="bg-teal mt-4 min-h-11 w-full rounded-[11px] text-[14px] font-bold text-[#043432] disabled:opacity-40"
      >
        {cerrando ? 'Cerrando…' : 'Cerrar el mes'}
      </button>
    </div>
  )
}
