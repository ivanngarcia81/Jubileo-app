import { useEffect, useRef, useState } from 'react'
import type { Presupuesto } from '../../datos/tipos'
import { type Centavos, formatear } from '../../lib/dinero'
import { aCentavos } from './PonerMonto'

/**
 * Anotar un gasto.
 *
 * Dos datos y ya: cuánto y de qué sobre salió. La categoría **no** se adivina
 * nunca — es la regla de `CLAUDE.md`, y no es burocracia: presupuestar es un
 * acto, y el acto es decidir de dónde sale el dinero. Una app que lo adivina
 * convierte el presupuesto en un reporte.
 *
 * Los sobres se enseñan con lo que les queda, porque esa es la pregunta que
 * trae al usuario aquí: *¿de cuál me alcanza?*
 */

export function Anotar({
  presupuesto,
  alAnotar,
  alCerrar,
}: {
  presupuesto: Presupuesto
  alAnotar: (categoriaId: string, montoCents: Centavos, descripcion: string) => Promise<void>
  alCerrar: () => void
}) {
  const [texto, setTexto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => campo.current?.focus(), [])

  const monto = aCentavos(texto)
  const listo = monto !== null && monto > 0 && categoria !== null

  async function guardar() {
    if (!listo || monto === null || categoria === null) return
    setGuardando(true)
    setError(null)
    try {
      await alAnotar(categoria, monto, descripcion)
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anotar.')
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
        className="bg-blanco max-h-[92dvh] w-full overflow-y-auto rounded-t-card px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Anotar un gasto"
      >
        <div className="text-texto font-serif text-titulo leading-tight">Anotar un gasto</div>

        <div className="border-linea mt-4 flex items-center gap-2 rounded-card border px-4">
          <span className="text-texto-2 font-serif text-cifra">$</span>
          <input
            ref={campo}
            type="text"
            inputMode="decimal"
            value={texto}
            disabled={guardando}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="0.00"
            aria-label="Cuánto gastaste"
            className="text-texto font-serif min-h-14 w-full bg-transparent text-cifra [font-variant-numeric:tabular-nums] placeholder:text-tenue focus:outline-none"
          />
        </div>

        <input
          type="text"
          value={descripcion}
          disabled={guardando}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="¿En qué? (opcional)"
          aria-label="En qué gastaste"
          // 17px y no 14: iOS hace zoom a la página al enfocar un campo de
          // menos de 16px, y salir de ese zoom es cosa del usuario. Todos los
          // campos de texto de la app van en `text-titulo` por lo mismo.
          className="border-linea text-texto mt-2 min-h-11 w-full rounded-btn border px-4 py-3 text-titulo placeholder:text-texto-claro-3 focus:outline-none"
        />

        <div className="text-texto-2 mt-5 mb-2 text-menor font-bold tracking-[.06em] uppercase">
          ¿De qué sobre sale?
        </div>
        <div className="flex flex-col gap-2">
          {presupuesto.sobres.map((sobre) => {
            const queda = sobre.presupuestoCents - sobre.gastadoCents
            const elegido = categoria === sobre.id
            return (
              <button
                key={sobre.id}
                type="button"
                onClick={() => setCategoria(sobre.id)}
                aria-pressed={elegido}
                className={`flex min-h-11 items-center justify-between rounded-btn border px-4 py-3 text-left ${
                  elegido ? 'border-teal border-2' : 'border-linea'
                }`}
              >
                <span className="text-texto text-cuerpo">{sobre.nombre}</span>
                <span
                  className={`text-menor [font-variant-numeric:tabular-nums] ${
                    queda < 0 ? 'text-rojo' : 'text-texto-2'
                  }`}
                >
                  {queda < 0 ? 'te pasaste ' : 'quedan '}
                  {formatear(Math.abs(queda) as Centavos)}
                </span>
              </button>
            )
          })}
        </div>

        {presupuesto.sobres.length === 0 && (
          <p className="text-texto-2 text-menor leading-[1.55]">
            Todavía no tienes sobres con dinero. Ve a Presupuesto mensual y reparte tus semanas primero.
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
            disabled={!listo || guardando}
            className="bg-teal min-h-11 flex-[1.6] rounded-btn text-cuerpo font-bold text-tinta-teal disabled:opacity-50"
          >
            {guardando ? 'Anotando…' : 'Anotar'}
          </button>
        </div>
      </div>
    </div>
  )
}
