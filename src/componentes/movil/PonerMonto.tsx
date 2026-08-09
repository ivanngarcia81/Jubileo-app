import { useEffect, useRef, useState } from 'react'
import type { LineaMes } from '../../datos/tipos'
import { type Centavos, deDolares, formatear, repartir } from '../../lib/dinero'
import { type ClaveIcono, esClaveDeCategoria } from '../../lib/iconos'
import { RejillaDeIconos, RotuloDeIconos } from './RejillaDeIconos'

/**
 * Poner cuánto va a una categoría en el mes.
 *
 * Se teclea el monto **del mes**, porque el mes es el marco (sección 1 del
 * SPEC). En lo repartible, el plan por semana lo enseña esta misma hoja
 * mientras escribes — proporcional a los días de cada semana, con el mismo
 * `repartir` que usa el servidor: lo que ves aquí es lo que se va a guardar,
 * al centavo. El ajuste fino por semana vive en la vista de Semanas.
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
  diasPorSemana,
  alGuardar,
  alRenombrar,
  alCambiarIcono,
  alQuitar,
  alCerrar,
}: {
  linea: LineaMes
  /** Los días de cada semana del mes: los pesos del reparto semanal. */
  diasPorSemana: readonly number[]
  alGuardar: (montoCents: Centavos) => Promise<void>
  alRenombrar?: ((nombre: string) => Promise<void>) | undefined
  /** Ausente en el onboarding y en la demostración: ahí solo se pone el monto. */
  alCambiarIcono?: ((icono: ClaveIcono) => Promise<void>) | undefined
  alQuitar?: (() => Promise<void>) | undefined
  alCerrar: () => void
}) {
  const [texto, setTexto] = useState(() =>
    linea.montoMensualCents === 0 ? '' : (linea.montoMensualCents / 100).toFixed(2),
  )
  const [nombre, setNombre] = useState(linea.nombre)
  const [renombrando, setRenombrando] = useState(false)
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => campo.current?.focus(), [])

  /** Corre una acción del servidor y deja dicho si falló, sin cerrar la hoja. */
  async function intentar(accion: () => Promise<void>) {
    setGuardando(true)
    setError(null)
    try {
      await accion()
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo.')
      setGuardando(false)
    }
  }

  /**
   * Igual, pero la hoja se queda abierta. Escoger icono no es terminar: quien
   * vino a poner el monto todavía no lo ha puesto, y cerrarle la hoja debajo
   * sería castigarlo por tocar un dibujo.
   */
  async function intentarSinCerrar(accion: () => Promise<void>) {
    setGuardando(true)
    setError(null)
    try {
      await accion()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo.')
    } finally {
      setGuardando(false)
    }
  }

  const monto = aCentavos(texto)
  const porSemana =
    monto !== null && diasPorSemana.length > 0 ? repartir(monto, [...diasPorSemana]) : []

  async function guardar() {
    if (monto === null) return
    await intentar(() => alGuardar(monto))
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
        aria-label={`Monto de ${linea.nombre}`}
      >
        {renombrando ? (
          <input
            type="text"
            value={nombre}
            autoFocus
            disabled={guardando}
            onChange={(e) => setNombre(e.target.value)}
            aria-label={`Nombre de ${linea.nombre}`}
            className="border-linea text-texto font-serif min-h-11 w-full rounded-btn border px-3 text-titulo focus:outline-none"
          />
        ) : (
          <>
            <div className="text-texto font-serif text-titulo leading-tight">{linea.nombre}</div>
            <div className="text-texto-2 mt-1 text-menor">
              {linea.detalle || 'Cuánto va a esta categoría en el mes'}
            </div>
          </>
        )}

        <div className="border-linea mt-4 flex items-center gap-2 rounded-card border px-4">
          <span className="text-texto-2 font-serif text-cifra">$</span>
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
            className="text-texto font-serif min-h-14 w-full bg-transparent text-cifra [font-variant-numeric:tabular-nums] placeholder:text-tenue focus:outline-none"
          />
        </div>

        {alCambiarIcono && (
          <>
            <RotuloDeIconos>Su icono</RotuloDeIconos>
            <RejillaDeIconos
              // La línea trae el icono ya resuelto por `mapeo`: cuando la
              // categoría no eligió, viene el de su grupo — que no está en la
              // rejilla y por eso no marca ninguno, que es lo correcto.
              elegido={esClaveDeCategoria(linea.icono) ? linea.icono : null}
              alElegir={(clave) => void intentarSinCerrar(() => alCambiarIcono(clave))}
              desactivada={guardando}
            />
          </>
        )}

        {porSemana.length > 0 && monto !== null && monto > 0 && (
          <p className="text-texto-2 mt-3 text-menor leading-[1.5]">
            Se reparte en{' '}
            <b className="text-teal-osc font-semibold">
              {porSemana.map((c) => formatear(c)).join(' · ')}
            </b>{' '}
            {porSemana.length === 1
              ? 'en la semana del mes'
              : `en las ${porSemana.length} semanas del mes, según sus días`}
            .
          </p>
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
            onClick={() => void guardar()}
            disabled={monto === null || guardando}
            className="bg-teal min-h-11 flex-[1.6] rounded-btn text-cuerpo font-bold text-tinta-teal disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        {(alRenombrar || alQuitar) && !confirmandoQuitar && (
          <div className="border-linea mt-4 flex gap-4 border-t pt-3">
            {alRenombrar && (
              <button
                type="button"
                disabled={guardando}
                onClick={() =>
                  renombrando ? void intentar(() => alRenombrar(nombre)) : setRenombrando(true)
                }
                className="text-teal-osc min-h-11 text-cuerpo font-semibold"
              >
                {renombrando ? 'Guardar el nombre' : 'Renombrar'}
              </button>
            )}
            {alQuitar && (
              <button
                type="button"
                disabled={guardando}
                onClick={() => setConfirmandoQuitar(true)}
                className="text-texto-2 min-h-11 text-cuerpo"
              >
                Quitar del mes
              </button>
            )}
          </div>
        )}

        {confirmandoQuitar && alQuitar && (
          <div className="border-linea mt-4 border-t pt-3">
            <p className="text-texto text-cuerpo leading-[1.55]">
              {linea.montoMensualCents > 0 ? (
                <>
                  Se quita <b>{linea.nombre}</b> del mes junto con sus{' '}
                  <b>{formatear(linea.montoMensualCents)}</b>, y ese dinero vuelve a quedar sin
                  repartir. Lo que ya anotaste ahí no se borra.
                </>
              ) : (
                <>
                  Se quita <b>{linea.nombre}</b> del mes. Lo que ya anotaste ahí no se borra.
                </>
              )}
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmandoQuitar(false)}
                disabled={guardando}
                className="border-linea text-texto-2 min-h-11 flex-1 rounded-btn border text-cuerpo font-semibold"
              >
                Mejor no
              </button>
              <button
                type="button"
                onClick={() => void intentar(alQuitar)}
                disabled={guardando}
                className="bg-carbon min-h-11 flex-1 rounded-btn text-cuerpo font-bold text-white disabled:opacity-50"
              >
                Quitar del mes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
