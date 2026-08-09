import { useEffect, useRef, useState } from 'react'
import { type ClaveIcono, sugerirIcono } from '../../lib/iconos'
import { RejillaDeIconos, RotuloDeIconos } from './RejillaDeIconos'

/**
 * Una categoría nueva.
 *
 * El nombre, su icono, y el día de vencimiento cuando es fija. El monto se pone
 * después, en la misma hoja que el de las demás: crear y presupuestar son dos
 * actos distintos, y juntarlos obliga a decidir el número antes de saber si la
 * categoría siquiera hace falta.
 *
 * El icono se **sugiere** mientras se escribe el nombre: quien teclea "Comida"
 * ve el cubierto marcado antes de llegar al botón. Se sugiere y no se impone —
 * en cuanto el usuario toca otro, la sugerencia deja de mandar aunque siga
 * escribiendo.
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
  alCrear: (
    nombre: string,
    diaVencimiento: number | undefined,
    icono: ClaveIcono | null,
  ) => Promise<void>
  alCerrar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [dia, setDia] = useState('')
  const [aMano, setAMano] = useState<ClaveIcono | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => campo.current?.focus(), [])

  const esFija = grupo === 'fijo'
  const diaNumero = Number(dia)
  const diaValido = !esFija || (Number.isInteger(diaNumero) && diaNumero >= 1 && diaNumero <= 31)
  const listo = nombre.trim() !== '' && diaValido
  // Lo que el usuario escogió gana; si no ha escogido, la sugerencia del
  // nombre. Nulo = ninguno, y entonces manda el grupo.
  const icono = aMano ?? sugerirIcono(nombre)

  async function crear() {
    if (!listo) return
    setGuardando(true)
    setError(null)
    try {
      await alCrear(nombre, esFija ? diaNumero : undefined, icono)
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
        className="bg-blanco w-full rounded-t-card px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={esFija ? 'Nuevo gasto fijo' : 'Nuevo sobre'}
      >
        <div className="text-texto font-serif text-titulo leading-tight">
          {esFija ? 'Nuevo gasto fijo' : 'Nuevo sobre'}
        </div>
        <div className="text-texto-2 mt-1 text-menor leading-[1.5]">
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
          className="border-linea text-texto mt-4 min-h-11 w-full rounded-btn border px-4 py-3 text-titulo placeholder:text-texto-claro-3 focus:outline-none"
        />

        <RotuloDeIconos>Su icono</RotuloDeIconos>
        <RejillaDeIconos elegido={icono} alElegir={setAMano} desactivada={guardando} />

        {esFija && (
          <>
            <label
              htmlFor="dia-vencimiento"
              className="text-texto-2 mt-4 mb-2 block text-menor font-bold tracking-[.06em] uppercase"
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
              className="border-linea text-texto min-h-11 w-24 rounded-btn border px-4 py-3 text-center text-titulo [font-variant-numeric:tabular-nums] placeholder:text-texto-claro-3 focus:outline-none"
            />
            <p className="text-texto-2 mt-2 text-menor leading-[1.5]">
              Con esto la app sabe con qué cheque se paga, y el aviso del domingo puede
              recordártelo.
            </p>
          </>
        )}

        {error && (
          <p className="text-ambar mt-3 text-menor leading-[1.5]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={alCerrar}
            disabled={guardando}
            className="border-linea text-texto-2 min-h-11 flex-1 rounded-btn border text-cuerpo font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void crear()}
            disabled={!listo || guardando}
            className="bg-teal min-h-11 flex-[1.6] rounded-btn text-cuerpo font-bold text-tinta-teal disabled:opacity-50"
          >
            {guardando ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}
