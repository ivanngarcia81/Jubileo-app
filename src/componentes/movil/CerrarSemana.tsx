import { useState } from 'react'
import type { Pago, Presupuesto } from '../../datos/tipos'
import { type Centavos, centavos, formatear } from '../../lib/dinero'
import { Casilla } from '../base'
import { aCentavos } from './PonerMonto'

/**
 * Cerrar la semana — tres preguntas, treinta segundos.
 *
 * Es el aviso de cierre de la sección 9, hecho pantalla. Cada pregunta viene ya
 * contestada con lo que la app sabe: si todo cuadra, el usuario toca "siguiente"
 * tres veces y se acabó. Preguntar no es lo mismo que hacer trabajar.
 *
 * Lo que ya está anotado no se reescribe. Corregir un sobre anota la diferencia
 * como un movimiento con su nombre, para que el historial siga contando lo que
 * de verdad pasó.
 */

export interface RespuestaCierre {
  ingresoRealCents: Centavos | null
  sobres: { categoriaId: string; gastadoCents: Centavos; yaAnotadoCents: Centavos }[]
  pagosHechos: { categoriaId: string; nombre: string; montoCents: Centavos }[]
}

const PASOS = 3

export function CerrarSemana({
  presupuesto,
  alCerrarSemana,
  alCerrar,
}: {
  presupuesto: Presupuesto
  alCerrarSemana: (r: RespuestaCierre) => Promise<void>
  alCerrar: () => void
}) {
  const cheque = presupuesto.periodos[presupuesto.periodoActivo]
  const esperado = cheque?.ingresoEsperadoCents ?? null

  const [paso, setPaso] = useState(1)
  const [ingreso, setIngreso] = useState(() =>
    esperado === null ? '' : (esperado / 100).toFixed(2),
  )
  const [gastos, setGastos] = useState<Record<string, string>>(() =>
    Object.fromEntries(presupuesto.sobres.map((s) => [s.id, (s.gastadoCents / 100).toFixed(2)])),
  )
  const [pagados, setPagados] = useState<Record<string, boolean>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pendientes: Pago[] = presupuesto.pagos.filter((p) => !p.pagado)
  const ingresoCents = aCentavos(ingreso)

  async function terminar() {
    setGuardando(true)
    setError(null)
    try {
      await alCerrarSemana({
        ingresoRealCents: ingresoCents,
        sobres: presupuesto.sobres.map((s) => ({
          categoriaId: s.id,
          gastadoCents: aCentavos(gastos[s.id] ?? '') ?? s.gastadoCents,
          yaAnotadoCents: s.gastadoCents,
        })),
        pagosHechos: pendientes
          .filter((p) => pagados[p.id])
          .map((p) => ({ categoriaId: p.id, nombre: p.nombre, montoCents: p.montoCents })),
      })
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la semana.')
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
        aria-label="Cerrar la semana"
      >
        <div className="text-texto-2 mb-1 text-menor font-bold tracking-[.06em] uppercase">
          Cerrar la semana · {paso} de {PASOS}
        </div>

        {paso === 1 && (
          <>
            <div className="text-texto font-serif text-titulo leading-tight">
              ¿Entró lo que esperabas?
            </div>
            <div className="text-texto-2 mt-1 text-menor leading-[1.5]">
              {esperado === null
                ? 'Tu ingreso es variable, así que aquí va lo que entró de verdad.'
                : `Tenías apuntado ${formatear(esperado)}. Si entró otra cosa, corrígelo.`}
            </div>
            <div className="border-linea mt-4 flex items-center gap-2 rounded-card border px-4">
              <span className="text-texto-2 font-serif text-cifra">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={ingreso}
                disabled={guardando}
                onChange={(e) => setIngreso(e.target.value)}
                placeholder="0.00"
                aria-label="Cuánto entró de verdad"
                className="text-texto font-serif min-h-14 w-full bg-transparent text-cifra [font-variant-numeric:tabular-nums] placeholder:text-tenue focus:outline-none"
              />
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <div className="text-texto font-serif text-titulo leading-tight">
              ¿Cuánto gastaste en los sobres?
            </div>
            <div className="text-texto-2 mt-1 text-menor leading-[1.5]">
              Esto es lo que la app tiene anotado. Corrige lo que no cuadre; la diferencia se anota
              como un movimiento aparte y lo de antes no se borra.
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {presupuesto.sobres.map((sobre) => (
                <div
                  key={sobre.id}
                  className="border-linea flex items-center justify-between gap-3 rounded-btn border px-4 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-texto truncate text-cuerpo">{sobre.nombre}</div>
                    <div className="text-texto-2 text-menor">
                      de {formatear(sobre.presupuestoCents)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-texto-2 text-titulo">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={gastos[sobre.id] ?? ''}
                      disabled={guardando}
                      onChange={(e) => setGastos((g) => ({ ...g, [sobre.id]: e.target.value }))}
                      aria-label={`Gastado en ${sobre.nombre}`}
                      className="text-texto min-h-11 w-24 bg-transparent text-right text-titulo [font-variant-numeric:tabular-nums] focus:outline-none"
                    />
                  </div>
                </div>
              ))}
              {presupuesto.sobres.length === 0 && (
                <p className="text-texto-2 text-menor">Este cheque no tiene sobres variables.</p>
              )}
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <div className="text-texto font-serif text-titulo leading-tight">
              ¿Pagaste lo que faltaba?
            </div>
            <div className="text-texto-2 mt-1 text-menor leading-[1.5]">
              {pendientes.length === 0
                ? 'No quedó nada pendiente en este cheque.'
                : 'Marca lo que sí pagaste. Lo que dejes sin marcar se queda pendiente.'}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {pendientes.map((pago) => (
                <div
                  key={pago.id}
                  className="border-linea flex items-center gap-3 rounded-btn border px-4 py-3"
                >
                  <Casilla
                    marcada={pagados[pago.id] ?? false}
                    etiqueta={pago.nombre}
                    alCambiar={() => setPagados((p) => ({ ...p, [pago.id]: !p[pago.id] }))}
                  />
                  <span className="text-texto min-w-0 flex-1 truncate text-cuerpo">
                    {pago.nombre}
                  </span>
                  <span className="text-texto-2 text-cuerpo [font-variant-numeric:tabular-nums]">
                    {formatear(pago.montoCents)}
                  </span>
                </div>
              ))}
            </div>
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
            onClick={() => (paso === 1 ? alCerrar() : setPaso(paso - 1))}
            disabled={guardando}
            className="border-linea text-texto-2 min-h-11 flex-1 rounded-btn border text-cuerpo font-semibold"
          >
            {paso === 1 ? 'Ahora no' : 'Atrás'}
          </button>
          <button
            type="button"
            onClick={() => (paso === PASOS ? void terminar() : setPaso(paso + 1))}
            disabled={guardando || (paso === 1 && ingresoCents === null && ingreso.trim() !== '')}
            className="bg-teal min-h-11 flex-[1.6] rounded-btn text-cuerpo font-bold text-tinta-teal disabled:opacity-50"
          >
            {guardando ? 'Cerrando…' : paso === PASOS ? 'Cerrar la semana' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Lo que se manda al servidor, en centavos. Exportado para poder probarlo. */
export function ajusteDeSobre(dice: Centavos, yaAnotado: Centavos): Centavos {
  return centavos(Math.max(0, dice - yaAnotado))
}
