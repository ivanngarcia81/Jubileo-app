import { useState } from 'react'
import type { Presupuesto } from '../../datos/tipos'
import { type Centavos, formatear } from '../../lib/dinero'
import { diaDe } from '../../lib/fecha'
import { CampoDinero, Hoja, PieDeHoja } from '../base'
import { aCentavos } from './PonerMonto'

/**
 * Anotar un cheque: lo que de verdad entró.
 *
 * Es la puerta que faltaba. Hasta hoy el único sitio donde se podía corregir un
 * cheque era dentro de "cerrar la semana", y eso obliga a cerrar algo que
 * todavía se está usando con tal de arreglar un número. El cheque llega el
 * martes; la semana se cierra el domingo.
 *
 * Una sola pregunta y un solo campo. Lo que sigue —los sobres, los pagos— es el
 * cierre, y el cierre se queda donde está.
 */
export function AnotarCheque({
  presupuesto,
  alAnotarCheque,
  alCerrar,
}: {
  presupuesto: Presupuesto
  alAnotarCheque: (montoCents: Centavos) => Promise<void>
  alCerrar: () => void
}) {
  const cheque = presupuesto.periodos[presupuesto.periodoActivo]
  // Lo que la app cree hoy: lo real si ya se anotó, y si no, lo esperado. Es el
  // mismo número que se ve en el héroe, así que el campo arranca enseñando lo
  // que el usuario vino a corregir en vez de un cero.
  const actual = presupuesto.ingresoPorChequeCents

  const [texto, setTexto] = useState(() => (actual === 0 ? '' : (actual / 100).toFixed(2)))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monto = aCentavos(texto)
  const listo = monto !== null && monto >= 0

  async function guardar() {
    if (!listo || monto === null) return
    setGuardando(true)
    setError(null)
    try {
      await alAnotarCheque(monto)
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anotar el cheque.')
      setGuardando(false)
    }
  }

  return (
    <Hoja etiqueta="Anotar un cheque" alCerrar={alCerrar}>
      <div className="text-texto font-serif text-titulo leading-tight">Anotar un cheque</div>
      <p className="text-texto-2 mt-1 text-menor leading-[1.55]">
        {cheque
          ? `El cheque del ${diaDe(cheque.fechaPago)}. Tienes apuntado ${formatear(actual)} — si entró otra cosa, corrígelo aquí.`
          : `Tienes apuntado ${formatear(actual)} — si entró otra cosa, corrígelo aquí.`}
      </p>

      <CampoDinero
        valor={texto}
        alCambiar={setTexto}
        etiqueta="Cuánto entró de verdad"
        autoFoco
        desactivado={guardando}
      />

      <p className="text-texto-2 mt-3 text-menor leading-[1.55]">
        Esto no cierra la semana. Solo corrige lo que entró, para que el reparto y el aviso del
        domingo cuenten con el dinero de verdad.
      </p>

      {error && (
        <p className="text-ambar mt-3 text-menor leading-[1.5]" role="alert">
          {error}
        </p>
      )}

      <PieDeHoja
        alCancelar={alCerrar}
        alConfirmar={() => void guardar()}
        confirmar="Anotar"
        listo={listo}
        ocupado={guardando}
      />
    </Hoja>
  )
}
