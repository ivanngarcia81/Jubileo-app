import { useState } from 'react'
import type { Fondo } from '../../datos/tipos'
import { type Centavos, formatear } from '../../lib/dinero'
import { CampoDinero, Hoja, PieDeHoja } from '../base'
import { aCentavos } from './PonerMonto'

/**
 * Un fondo de reserva: el que se crea y el que ya existe.
 *
 * La fecha objetivo es opcional pero cambia todo lo demás: con ella la app
 * puede decir cuánto apartar por cheque, que es el número que convierte "quiero
 * juntar $1,600" en algo que se hace. Sin ella el fondo es una lista de deseos.
 *
 * Cuánto apartar por cheque **no se guarda**: se deriva de lo que falta y los
 * cheques que quedan (sección 5 del SPEC). Guardarlo sería un número que se
 * queda viejo en cuanto el usuario aparta de más o de menos una semana.
 */

export function EditarFondo({
  fondo,
  alCrear,
  alGuardarAcumulado,
  alBorrar,
  alCerrar,
}: {
  /** Nulo cuando se está creando. */
  fondo: Fondo | null
  alCrear: (
    nombre: string,
    metaCents: Centavos,
    acumuladoCents: Centavos,
    fechaObjetivo: string | null,
  ) => Promise<void>
  alGuardarAcumulado: (acumuladoCents: Centavos) => Promise<void>
  alBorrar: () => Promise<void>
  alCerrar: () => void
}) {
  const nuevo = fondo === null
  const [nombre, setNombre] = useState(fondo?.nombre ?? '')
  const [meta, setMeta] = useState('')
  const [acumulado, setAcumulado] = useState(fondo ? (fondo.acumuladoCents / 100).toFixed(2) : '')
  const [cuando, setCuando] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const metaCents = aCentavos(meta)
  const acumuladoCents = aCentavos(acumulado)

  const listo = nuevo
    ? nombre.trim() !== '' && metaCents !== null && metaCents > 0 && acumuladoCents !== null
    : acumuladoCents !== null

  async function intentar(accion: () => Promise<void>) {
    setGuardando(true)
    setError(null)
    try {
      await accion()
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
      setGuardando(false)
    }
  }

  return (
    <Hoja etiqueta={nuevo ? 'Nuevo fondo de reserva' : `Fondo ${fondo.nombre}`} alCerrar={alCerrar}>
      <div className="text-texto font-serif text-titulo leading-tight">
        {nuevo ? 'Un fondo de reserva' : fondo.nombre}
      </div>

      {nuevo ? (
        <>
          <div className="text-texto-2 mt-1 text-menor leading-[1.5]">
            Algo que sabes que viene y no quieres que te agarre de sorpresa: llantas, Navidad, el
            viaje al país.
          </div>

          <input
            type="text"
            value={nombre}
            autoFocus
            disabled={guardando}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Llantas"
            aria-label="Nombre del fondo"
            className="border-linea text-texto mt-4 min-h-11 w-full rounded-[11px] border px-4 py-3 text-titulo placeholder:text-[#9AA09E] focus:outline-none"
          />

          <Rotulo>¿Cuánto necesitas juntar?</Rotulo>
          <CampoDinero
            valor={meta}
            alCambiar={setMeta}
            etiqueta="Cuánto necesitas juntar"
            desactivado={guardando}
          />

          <Rotulo>¿Ya llevas algo?</Rotulo>
          <CampoDinero
            valor={acumulado}
            alCambiar={setAcumulado}
            etiqueta="Cuánto llevas juntado"
            desactivado={guardando}
          />

          <Rotulo>¿Para cuándo lo necesitas? (opcional)</Rotulo>
          <input
            type="date"
            value={cuando}
            disabled={guardando}
            onChange={(e) => setCuando(e.target.value)}
            aria-label="Para cuándo lo necesitas"
            className="border-linea text-texto mt-2 min-h-11 w-full rounded-[11px] border px-4 py-3 text-titulo focus:outline-none"
          />
          <p className="text-texto-2 mt-2 text-menor leading-[1.5]">
            Con una fecha, la app te dice cuánto apartar en cada cheque. Sin ella, el fondo se
            queda en buena intención.
          </p>
        </>
      ) : (
        <>
          <div className="text-texto-2 mt-1 text-menor leading-[1.5]">
            Meta de {formatear(fondo.metaCents)}
            {fondo.mesesQueFaltan > 0 && ` · para ${fondo.mesObjetivo}`}
          </div>
          <Rotulo>¿Cuánto llevas juntado?</Rotulo>
          <CampoDinero
            valor={acumulado}
            alCambiar={setAcumulado}
            etiqueta={`Juntado en ${fondo.nombre}`}
            autoFoco
            desactivado={guardando}
          />
          {acumuladoCents !== null && acumuladoCents >= fondo.metaCents && (
            <p className="text-teal-osc mt-3 text-menor font-semibold">
              Ya llegaste a la meta.
            </p>
          )}
        </>
      )}

      {error && (
        <p className="text-ambar mt-3 text-menor leading-[1.5]" role="alert">
          {error}
        </p>
      )}

      {!confirmando && (
        <PieDeHoja
          alCancelar={alCerrar}
          alConfirmar={() =>
            void intentar(() =>
              nuevo
                ? alCrear(nombre, metaCents!, acumuladoCents!, cuando || null)
                : alGuardarAcumulado(acumuladoCents!),
            )
          }
          confirmar={nuevo ? 'Agregar' : 'Guardar'}
          listo={listo}
          ocupado={guardando}
        />
      )}

      {!nuevo && !confirmando && (
        <div className="border-linea mt-4 border-t pt-3">
          <button
            type="button"
            disabled={guardando}
            onClick={() => setConfirmando(true)}
            className="text-texto-2 min-h-11 text-cuerpo"
          >
            Borrar este fondo
          </button>
        </div>
      )}

      {confirmando && !nuevo && (
        <div className="border-linea mt-4 border-t pt-3">
          <p className="text-texto text-cuerpo leading-[1.55]">
            Se borra <b>{fondo.nombre}</b> con lo que llevas apuntado. El dinero no se mueve de
            ningún lado — esto es solo la cuenta.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={guardando}
              className="border-linea text-texto-2 min-h-11 flex-1 rounded-[11px] border text-cuerpo font-semibold"
            >
              Mejor no
            </button>
            <button
              type="button"
              onClick={() => void intentar(alBorrar)}
              disabled={guardando}
              className="bg-carbon min-h-11 flex-1 rounded-[11px] text-cuerpo font-bold text-white disabled:opacity-50"
            >
              Borrarlo
            </button>
          </div>
        </div>
      )}
    </Hoja>
  )
}

function Rotulo({ children }: { children: string }) {
  return (
    <div className="text-texto-2 mt-4 text-menor font-bold tracking-[.06em] uppercase">
      {children}
    </div>
  )
}
