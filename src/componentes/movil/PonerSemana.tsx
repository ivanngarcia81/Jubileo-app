import { useState } from 'react'
import type { LineaMes, SemanaDelPresupuesto } from '../../datos/tipos'
import { type Centavos, centavos, formatear } from '../../lib/dinero'
import { diaDe } from '../../lib/fecha'
import { CampoDinero, Hoja, PieDeHoja } from '../base'
import { aCentavos } from './PonerMonto'

/**
 * Poner cuánto va de un sobre en una semana.
 *
 * Aquí el mes no es el punto de partida sino la consecuencia: el monto mensual
 * de un sobre repartible es **la suma de sus semanas**, y la hoja lo dice
 * mientras escribes para que nadie se sorprenda al volver a la vista del mes.
 */

export function PonerSemana({
  sobre,
  semana,
  asignadoCents,
  alGuardar,
  alCerrar,
}: {
  sobre: LineaMes
  semana: SemanaDelPresupuesto
  /** Lo que la semana ya tiene de este sobre. */
  asignadoCents: Centavos
  alGuardar: (montoCents: Centavos) => Promise<void>
  alCerrar: () => void
}) {
  const [texto, setTexto] = useState(() =>
    asignadoCents === 0 ? '' : (asignadoCents / 100).toFixed(2),
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monto = aCentavos(texto)
  const mesNuevo =
    monto === null ? null : centavos(sobre.montoMensualCents - asignadoCents + monto)

  async function guardar() {
    if (monto === null) return
    setGuardando(true)
    setError(null)
    try {
      await alGuardar(monto)
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo.')
      setGuardando(false)
    }
  }

  return (
    <Hoja etiqueta={`${sobre.nombre} en la semana ${semana.numero}`} alCerrar={alCerrar}>
      <div className="text-texto font-serif text-titulo leading-tight">
        {sobre.nombre} · Semana {semana.numero}
      </div>
      <div className="text-texto-2 mt-1 text-menor">
        Del {diaDe(semana.fechaInicio)} al {diaDe(semana.fechaFin)} · cuánto va a este sobre en
        la semana
      </div>

      <CampoDinero
        valor={texto}
        alCambiar={setTexto}
        etiqueta={`Monto de ${sobre.nombre} en la semana ${semana.numero}`}
        autoFoco
        desactivado={guardando}
      />

      {mesNuevo !== null && mesNuevo !== sobre.montoMensualCents && (
        <p className="text-texto-2 mt-3 text-menor leading-[1.5]">
          El mes de <b className="text-texto font-semibold">{sobre.nombre}</b> queda en{' '}
          <b className="text-teal-osc font-semibold">{formatear(mesNuevo)}</b>: la suma de sus
          semanas.
        </p>
      )}

      {error && (
        <p className="text-ambar mt-3 text-menor leading-[1.5]" role="alert">
          {error}
        </p>
      )}

      <PieDeHoja
        alCancelar={alCerrar}
        alConfirmar={() => void guardar()}
        confirmar="Guardar"
        listo={monto !== null}
        ocupado={guardando}
      />
    </Hoja>
  )
}
