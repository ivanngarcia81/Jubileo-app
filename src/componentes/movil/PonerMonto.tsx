import { useEffect, useRef, useState } from 'react'
import type { LineaMes } from '../../datos/tipos'
import { type Centavos, deDolares, formatear, repartirParejo } from '../../lib/dinero'

/**
 * Poner cuánto va a una categoría en el mes.
 *
 * Se teclea el monto **del mes**, no el del cheque, porque el mes es el marco
 * (sección 1 del SPEC). El reparto entre cheques lo enseña esta misma hoja
 * mientras escribes, con el mismo `repartir` que usa el servidor: lo que ves
 * aquí es lo que se va a guardar, al centavo.
 *
 * En dólares con dos decimales de cara al usuario, en centavos enteros por
 * dentro. La conversión pasa una sola vez, al salir del campo.
 */

/**
 * Texto tecleado → centavos, o nulo si no es un número usable.
 *
 * El redondeo lo hace `deDolares`, que es el único lugar donde se cruza esa
 * frontera. Aquí solo se decide qué es un número: se aceptan comas de miles y
 * la coma decimal que teclea mucha gente en español, y se rechaza lo demás en
 * vez de adivinar.
 */
export function aCentavos(texto: string): Centavos | null {
  const limpio = texto.trim().replace(/,(?=\d{3}\b)/g, '').replace(',', '.')
  if (limpio === '' || !/^\d*\.?\d*$/.test(limpio) || limpio === '.') return null
  const n = Number(limpio)
  if (!Number.isFinite(n) || n < 0) return null
  return deDolares(n)
}

export function PonerMonto({
  linea,
  cheques,
  alGuardar,
  alCerrar,
}: {
  linea: LineaMes
  /** Cuántos cheques se reparten este mes. */
  cheques: number
  alGuardar: (montoCents: Centavos) => Promise<void>
  alCerrar: () => void
}) {
  const [texto, setTexto] = useState(() =>
    linea.montoMensualCents === 0 ? '' : (linea.montoMensualCents / 100).toFixed(2),
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => campo.current?.focus(), [])

  const monto = aCentavos(texto)
  const porCheque = monto !== null && cheques > 0 ? repartirParejo(monto, cheques) : []

  async function guardar() {
    if (monto === null) return
    setGuardando(true)
    setError(null)
    try {
      await alGuardar(monto)
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/45"
      onClick={alCerrar}
      role="presentation"
    >
      <div
        className="bg-blanco w-full rounded-t-[20px] px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Monto de ${linea.nombre}`}
      >
        <div className="text-texto font-serif text-[22px] leading-tight">{linea.nombre}</div>
        <div className="text-texto-2 mt-1 text-[12.5px]">
          {linea.detalle || 'Cuánto va a esta categoría en el mes'}
        </div>

        <div className="border-linea mt-4 flex items-center gap-2 rounded-[13px] border px-4">
          <span className="text-texto-2 font-serif text-[26px]">$</span>
          <input
            ref={campo}
            type="text"
            inputMode="decimal"
            value={texto}
            disabled={guardando}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void guardar()}
            placeholder="0.00"
            aria-label={`Monto mensual de ${linea.nombre}`}
            className="text-texto font-serif min-h-14 w-full bg-transparent text-[30px] [font-variant-numeric:tabular-nums] placeholder:text-[#C3C7C4] focus:outline-none"
          />
        </div>

        {porCheque.length > 0 && monto !== null && monto > 0 && (
          <p className="text-texto-2 mt-3 text-[12.5px] leading-[1.5]">
            Se reparte en{' '}
            <b className="text-teal-osc font-semibold">
              {porCheque.map((c) => formatear(c)).join(' · ')}
            </b>{' '}
            {cheques === 1 ? 'en tu cheque' : `en tus ${cheques} cheques`}.
          </p>
        )}

        {error && (
          <p className="text-ambar mt-3 text-[12.5px] leading-[1.5]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={alCerrar}
            disabled={guardando}
            className="border-linea text-texto-2 min-h-11 flex-1 rounded-[11px] border text-[14px] font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={monto === null || guardando}
            className="bg-teal min-h-11 flex-[1.6] rounded-[11px] text-[14px] font-bold text-[#043432] disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
