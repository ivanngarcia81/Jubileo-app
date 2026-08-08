import { useState } from 'react'
import type { Presupuesto } from '../../datos/tipos'
import { type Centavos, formatear } from '../../lib/dinero'
import { CampoDinero, Hoja, PieDeHoja } from '../base'
import { aCentavos } from './PonerMonto'

/**
 * Una deuda: la que se crea y la que ya existe.
 *
 * De una deuda nueva se piden cuatro cosas y ninguna más — nombre, saldo, pago
 * mínimo y tasa. Con eso el simulador ya puede calcular la fecha de libertad,
 * que es lo único que el usuario quiere ver.
 *
 * De una que ya existe solo se toca el saldo, porque es lo único que cambia
 * cada mes, y desde aquí se le pone el **enfoque**: la deuda que se está
 * atacando con todo lo que sobra.
 */

export type DeudaDelPresupuesto = Presupuesto['deudas'][number]

export function EditarDeuda({
  deuda,
  alCrear,
  alGuardarSaldo,
  alEnfocar,
  alBorrar,
  alCerrar,
}: {
  /** Nula cuando se está creando. */
  deuda: DeudaDelPresupuesto | null
  alCrear: (
    nombre: string,
    saldoCents: Centavos,
    pagoMinimoCents: Centavos,
    tasa: number | null,
  ) => Promise<void>
  alGuardarSaldo: (saldoCents: Centavos) => Promise<void>
  alEnfocar: () => Promise<void>
  alBorrar: () => Promise<void>
  alCerrar: () => void
}) {
  const nueva = deuda === null
  const [nombre, setNombre] = useState(deuda?.nombre ?? '')
  const [saldo, setSaldo] = useState(deuda ? (deuda.saldoCents / 100).toFixed(2) : '')
  const [minimo, setMinimo] = useState('')
  const [tasa, setTasa] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saldoCents = aCentavos(saldo)
  const minimoCents = aCentavos(minimo)
  const tasaNumero = tasa.trim() === '' ? null : Number(tasa.replace(',', '.'))
  const tasaValida = tasaNumero === null || (Number.isFinite(tasaNumero) && tasaNumero >= 0)

  const listo = nueva
    ? nombre.trim() !== '' && saldoCents !== null && minimoCents !== null && tasaValida
    : saldoCents !== null

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
    <Hoja etiqueta={nueva ? 'Nueva deuda' : `Deuda ${deuda.nombre}`} alCerrar={alCerrar}>
      <div className="text-texto font-serif text-titulo leading-tight">
        {nueva ? 'Una deuda más' : deuda.nombre}
      </div>

      {nueva ? (
        <>
          <div className="text-texto-2 mt-1 text-menor leading-[1.5]">
            Con estos cuatro datos ya se puede calcular tu fecha de libertad.
          </div>

          <input
            type="text"
            value={nombre}
            autoFocus
            disabled={guardando}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Capital One"
            aria-label="Nombre de la deuda"
            className="border-linea text-texto mt-4 min-h-11 w-full rounded-[11px] border px-4 py-3 text-titulo placeholder:text-[#9AA09E] focus:outline-none"
          />

          <Rotulo>¿Cuánto debes?</Rotulo>
          <CampoDinero
            valor={saldo}
            alCambiar={setSaldo}
            etiqueta="Cuánto debes"
            desactivado={guardando}
          />

          <Rotulo>¿Cuál es el pago mínimo al mes?</Rotulo>
          <CampoDinero
            valor={minimo}
            alCambiar={setMinimo}
            etiqueta="Pago mínimo al mes"
            desactivado={guardando}
          />

          <Rotulo>¿Qué tasa de interés tiene? (opcional)</Rotulo>
          <div className="border-linea mt-2 flex w-32 items-center gap-1 rounded-[11px] border px-4">
            <input
              type="text"
              inputMode="decimal"
              value={tasa}
              disabled={guardando}
              onChange={(e) => setTasa(e.target.value)}
              placeholder="24.9"
              aria-label="Tasa de interés anual"
              className="text-texto min-h-11 w-full bg-transparent text-titulo [font-variant-numeric:tabular-nums] placeholder:text-[#9AA09E] focus:outline-none"
            />
            <span className="text-texto-2 text-titulo">%</span>
          </div>
          <p className="text-texto-2 mt-2 text-menor leading-[1.5]">
            Si no la sabes, déjala en blanco. La fecha sale igual, solo que menos exacta.
          </p>
        </>
      ) : (
        <>
          <div className="text-texto-2 mt-1 text-menor leading-[1.5]">
            Empezaste con {formatear(deuda.saldoInicialCents)}. Actualiza el saldo cuando te llegue
            el estado de cuenta.
          </div>
          <Rotulo>¿Cuánto debes ahora?</Rotulo>
          <CampoDinero
            valor={saldo}
            alCambiar={setSaldo}
            etiqueta={`Saldo de ${deuda.nombre}`}
            autoFoco
            desactivado={guardando}
          />
          {saldoCents === 0 && (
            <p className="text-teal-osc mt-3 text-menor font-semibold">
              Si la dejas en cero, queda saldada. Eso es una deuda menos.
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
              nueva
                ? alCrear(nombre, saldoCents!, minimoCents!, tasaNumero)
                : alGuardarSaldo(saldoCents!),
            )
          }
          confirmar={nueva ? 'Agregar' : 'Guardar'}
          listo={listo}
          ocupado={guardando}
        />
      )}

      {!nueva && !confirmando && (
        <div className="border-linea mt-4 flex gap-4 border-t pt-3">
          {!deuda.esEnfoque && (
            <button
              type="button"
              disabled={guardando}
              onClick={() => void intentar(alEnfocar)}
              className="text-teal-osc min-h-11 text-cuerpo font-semibold"
            >
              Atacar esta primero
            </button>
          )}
          <button
            type="button"
            disabled={guardando}
            onClick={() => setConfirmando(true)}
            className="text-texto-2 min-h-11 text-cuerpo"
          >
            Borrarla
          </button>
        </div>
      )}

      {confirmando && !nueva && (
        <div className="border-linea mt-4 border-t pt-3">
          <p className="text-texto text-cuerpo leading-[1.55]">
            Se borra <b>{deuda.nombre}</b> y con ella su historial. Si ya la terminaste de pagar,
            mejor déjala en cero: así se queda como algo que lograste.
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
              Borrarla
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
