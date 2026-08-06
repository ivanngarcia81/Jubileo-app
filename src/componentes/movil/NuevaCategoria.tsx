import { useEffect, useRef, useState } from 'react'

/**
 * Una categoría nueva.
 *
 * Solo el nombre, y el día de vencimiento cuando es fija. El monto se pone
 * después, en la misma hoja que el de las demás: crear y presupuestar son dos
 * actos distintos, y juntarlos obliga a decidir el número antes de saber si la
 * categoría siquiera hace falta.
 *
 * El día no es opcional en las fijas, y no por burocracia de la base: sin él el
 * aviso del domingo no puede decir qué se vence esta semana, que es la mitad de
 * su valor (sección 9 del SPEC).
 */

export function NuevaCategoria({
  grupo,
  alCrear,
  alCerrar,
}: {
  grupo: 'fijo' | 'variable'
  alCrear: (nombre: string, diaVencimiento: number | undefined) => Promise<void>
  alCerrar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [dia, setDia] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => campo.current?.focus(), [])

  const esFija = grupo === 'fijo'
  const diaNumero = Number(dia)
  const diaValido = !esFija || (Number.isInteger(diaNumero) && diaNumero >= 1 && diaNumero <= 31)
  const listo = nombre.trim() !== '' && diaValido

  async function crear() {
    if (!listo) return
    setGuardando(true)
    setError(null)
    try {
      await alCrear(nombre, esFija ? diaNumero : undefined)
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear.')
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
        aria-label={esFija ? 'Nuevo gasto fijo' : 'Nuevo sobre'}
      >
        <div className="text-texto font-serif text-[22px] leading-tight">
          {esFija ? 'Nuevo gasto fijo' : 'Nuevo sobre'}
        </div>
        <div className="text-texto-2 mt-1 text-[12.5px] leading-[1.5]">
          {esFija
            ? 'Algo que se paga el mismo día cada mes: renta, seguro, un préstamo.'
            : 'Algo que cambia de semana a semana: comida, gasolina, gastos personales.'}
        </div>

        <input
          ref={campo}
          type="text"
          value={nombre}
          disabled={guardando}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !esFija && void crear()}
          placeholder={esFija ? 'Seguro del carro' : 'Comida'}
          aria-label="Nombre de la categoría"
          className="border-linea text-texto mt-4 min-h-11 w-full rounded-[11px] border px-4 py-3 text-[17px] placeholder:text-[#9AA09E] focus:outline-none"
        />

        {esFija && (
          <>
            <label
              htmlFor="dia-vencimiento"
              className="text-texto-2 mt-4 mb-2 block text-[11.5px] font-bold tracking-[.06em] uppercase"
            >
              ¿Qué día del mes se vence?
            </label>
            <input
              id="dia-vencimiento"
              type="text"
              inputMode="numeric"
              value={dia}
              disabled={guardando}
              onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 2))}
              onKeyDown={(e) => e.key === 'Enter' && void crear()}
              placeholder="15"
              className="border-linea text-texto min-h-11 w-24 rounded-[11px] border px-4 py-3 text-center text-[17px] [font-variant-numeric:tabular-nums] placeholder:text-[#9AA09E] focus:outline-none"
            />
            <p className="text-texto-2 mt-2 text-[12.5px] leading-[1.5]">
              Con esto la app sabe con qué cheque se paga, y el aviso del domingo puede
              recordártelo.
            </p>
          </>
        )}

        {error && (
          <p className="text-ambar mt-3 text-[13px] leading-[1.5]" role="alert">
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
            onClick={() => void crear()}
            disabled={!listo || guardando}
            className="bg-teal min-h-11 flex-[1.6] rounded-[11px] text-[14px] font-bold text-[#043432] disabled:opacity-50"
          >
            {guardando ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}
