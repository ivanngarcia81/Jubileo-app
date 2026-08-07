import { useState } from 'react'
import type { Presupuesto } from '../datos/tipos'
import { type Centavos, formatear } from '../lib/dinero'
import { Moneda } from './base'
import { EditarDeuda } from './movil/EditarDeuda'
import { NuevaCategoria } from './movil/NuevaCategoria'
import { PonerMonto } from './movil/PonerMonto'

/**
 * Los pasos 3 a 6 del onboarding de la sección 7.
 *
 * Los dos primeros —cómo te pagan y cuánto entra— ya pasaron en `PrimerMes`, y
 * con ellos se creó el mes. Estos cuatro lo llenan: gastos fijos, deudas,
 * cuándo quieres el aviso, e instalar la app.
 *
 * Nada de esto es obligatorio. Se puede saltar cualquiera y volver después —
 * pero se pregunta ahora, una sola vez, porque el SPEC describe a alguien que
 * no va a ir a buscar dónde configurar algo. Al terminar ve su primera semana
 * armada, nunca una pantalla vacía.
 */

const PASOS = 4

/** ¿Está corriendo desde la pantalla de inicio y no desde el navegador? */
function yaInstalada(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

function esIPhone(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function Onboarding({
  presupuesto,
  alPonerMonto,
  alCrearCategoria,
  alCrearDeuda,
  alGuardarAviso,
  alTerminar,
}: {
  presupuesto: Presupuesto
  alPonerMonto: (categoriaId: string, montoCents: Centavos) => Promise<void>
  alCrearCategoria: (
    grupo: 'fijo' | 'variable',
    nombre: string,
    diaVencimiento: number | undefined,
  ) => Promise<void>
  alCrearDeuda: (
    nombre: string,
    saldoCents: Centavos,
    pagoMinimoCents: Centavos,
    tasa: number | null,
  ) => Promise<void>
  alGuardarAviso: (horaLocal: string, activo: boolean) => Promise<void>
  alTerminar: () => Promise<void>
}) {
  const [paso, setPaso] = useState(1)
  const [creandoFijo, setCreandoFijo] = useState(false)
  const [creandoDeuda, setCreandoDeuda] = useState(false)
  const [poniendoMonto, setPoniendoMonto] = useState<Presupuesto['fijos'][number] | null>(null)
  const [hora, setHora] = useState('08:00')
  const [quiereAviso, setQuiereAviso] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chequesQueSeReparten = presupuesto.periodos.filter((p) => !p.esExtra).length
  const conMonto = presupuesto.fijos.filter((f) => f.montoMensualCents > 0)
  const deudas = presupuesto.deudas

  async function siguiente() {
    if (paso < PASOS) {
      // El aviso se guarda al salir de su paso, no al final: si el usuario
      // cierra la app en el paso 4, su elección ya quedó.
      if (paso === 3) {
        setGuardando(true)
        try {
          await alGuardarAviso(hora, quiereAviso)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo guardar.')
          setGuardando(false)
          return
        }
        setGuardando(false)
      }
      setPaso(paso + 1)
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await alTerminar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo terminar.')
      setGuardando(false)
    }
  }

  return (
    <main className="bg-gris text-texto font-sans min-h-dvh px-5 py-8">
      <div className="mx-auto w-full max-w-[34rem]">
        <div className="text-texto-2 mb-1 text-[11.5px] font-bold tracking-[.06em] uppercase">
          Paso {paso + 2} de 6
        </div>

        {paso === 1 && (
          <>
            <h1 className="font-serif text-[30px] leading-[1.1]">Tus gastos fijos</h1>
            <p className="text-texto-2 mt-2 text-[15px] leading-[1.55]">
              Lo que se paga el mismo día cada mes. Con el día de vencimiento, la app sabe con qué
              cheque se paga cada uno — y eso es lo que te avisa antes de que se te pase.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              {presupuesto.fijos.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPoniendoMonto(f)}
                  className="bg-blanco border-linea flex min-h-11 items-center justify-between gap-3 rounded-[13px] border px-[14px] py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-medium">{f.nombre}</span>
                    <span className="text-texto-2 block text-[11.5px]">
                      {f.detalle || 'Sin día de vencimiento'}
                    </span>
                  </span>
                  <span
                    className={`text-[15px] font-semibold ${
                      f.montoMensualCents === 0 ? 'text-texto-2' : ''
                    }`}
                  >
                    <Moneda centavos={f.montoMensualCents} />
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCreandoFijo(true)}
                className="border-linea text-texto-2 flex min-h-11 items-center gap-2 rounded-[13px] border border-dashed px-[14px] py-3 text-left text-[13.5px]"
              >
                <span className="text-teal-osc text-[17px] leading-none">+</span>
                Agregar un gasto fijo
              </button>
            </div>

            {conMonto.length > 0 && (
              <p className="text-teal-osc mt-4 text-[13px] font-semibold">
                {conMonto.length} con monto · {formatear(
                  conMonto.reduce((s, f) => (s + f.montoMensualCents) as Centavos, 0 as Centavos),
                )}{' '}
                al mes
              </p>
            )}
          </>
        )}

        {paso === 2 && (
          <>
            <h1 className="font-serif text-[30px] leading-[1.1]">Tus deudas</h1>
            <p className="text-texto-2 mt-2 text-[15px] leading-[1.55]">
              Con el saldo y el pago mínimo de cada una, la app calcula tu fecha de libertad. Si no
              tienes ninguna, salta este paso.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              {deudas.map((d) => (
                <div
                  key={d.id}
                  className="bg-blanco border-linea flex items-center justify-between gap-3 rounded-[13px] border px-[14px] py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-medium">{d.nombre}</span>
                    <span className="text-texto-2 block text-[11.5px]">
                      Mínimo <Moneda centavos={d.pagoMinimoCents} />
                    </span>
                  </span>
                  <span className="text-[15px] font-semibold">
                    <Moneda centavos={d.saldoCents} />
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCreandoDeuda(true)}
                className="border-linea text-texto-2 flex min-h-11 items-center gap-2 rounded-[13px] border border-dashed px-[14px] py-3 text-left text-[13.5px]"
              >
                <span className="text-teal-osc text-[17px] leading-none">+</span>
                Agregar una deuda
              </button>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <h1 className="font-serif text-[30px] leading-[1.1]">Tu aviso</h1>
            <p className="text-texto-2 mt-2 text-[15px] leading-[1.55]">
              El día que te cae el cheque te llega un correo con lo que se vence esa semana, cuánto
              va a cada sobre y cuánto te queda libre. Es la parte que más sirve.
            </p>

            <label className="bg-blanco border-linea mt-6 flex min-h-11 items-center justify-between gap-3 rounded-[13px] border px-[14px] py-3">
              <span className="text-[14.5px] font-medium">Quiero el aviso</span>
              <input
                type="checkbox"
                checked={quiereAviso}
                onChange={(e) => setQuiereAviso(e.target.checked)}
                className="accent-teal size-5"
              />
            </label>

            {quiereAviso && (
              <>
                <div className="text-texto-2 mt-5 mb-2 text-[11.5px] font-bold tracking-[.06em] uppercase">
                  ¿A qué hora?
                </div>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  aria-label="A qué hora quieres el aviso"
                  className="border-linea bg-blanco text-texto min-h-11 rounded-[11px] border px-4 py-3 text-[17px]"
                />
                <p className="text-texto-2 mt-2 text-[12.5px] leading-[1.5]">
                  En tu hora, no en la del servidor.
                </p>
              </>
            )}
          </>
        )}

        {paso === 4 && (
          <>
            <h1 className="font-serif text-[30px] leading-[1.1]">Ponla en tu pantalla de inicio</h1>
            {yaInstalada() ? (
              <p className="text-teal-osc mt-2 text-[15px] leading-[1.55] font-semibold">
                Ya está instalada. Perfecto.
              </p>
            ) : (
              <>
                <p className="text-texto-2 mt-2 text-[15px] leading-[1.55]">
                  Instalada abre como una app, sin la barra del navegador, y es la única forma de
                  que te lleguen avisos al teléfono.
                </p>
                <ol className="text-texto mt-6 flex flex-col gap-3 text-[15px] leading-[1.5]">
                  {(esIPhone()
                    ? [
                        'Toca el botón de compartir, abajo en el centro — el cuadro con la flecha hacia arriba.',
                        'Baja en la lista y toca «Agregar a inicio».',
                        'Toca «Agregar», arriba a la derecha.',
                      ]
                    : [
                        'Toca los tres puntos, arriba a la derecha.',
                        'Toca «Instalar app» o «Agregar a la pantalla principal».',
                        'Confirma.',
                      ]
                  ).map((texto, i) => (
                    <li key={texto} className="flex gap-3">
                      <span className="bg-teal text-[#043432] grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold">
                        {i + 1}
                      </span>
                      {texto}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        )}

        {error && (
          <p className="text-ambar mt-4 text-[13px] leading-[1.5]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 flex gap-3">
          {paso > 1 && (
            <button
              type="button"
              onClick={() => setPaso(paso - 1)}
              disabled={guardando}
              className="border-linea text-texto-2 min-h-11 flex-1 rounded-[11px] border text-[14px] font-semibold"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={() => void siguiente()}
            disabled={guardando}
            className="bg-teal min-h-11 flex-[2] rounded-[11px] text-[15px] font-bold text-[#043432] disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : paso === PASOS ? 'Ver mi primera semana' : 'Siguiente'}
          </button>
        </div>

        {paso < PASOS && (
          <button
            type="button"
            onClick={() => void siguiente()}
            disabled={guardando}
            className="text-texto-2 mt-3 min-h-11 w-full text-[13.5px]"
          >
            Saltar este paso
          </button>
        )}
      </div>

      {creandoFijo && (
        <NuevaCategoria
          grupo="fijo"
          alCrear={(nombre, dia) => alCrearCategoria('fijo', nombre, dia)}
          alCerrar={() => setCreandoFijo(false)}
        />
      )}

      {creandoDeuda && (
        <EditarDeuda
          deuda={null}
          alCrear={alCrearDeuda}
          alGuardarSaldo={async () => {}}
          alEnfocar={async () => {}}
          alBorrar={async () => {}}
          alCerrar={() => setCreandoDeuda(false)}
        />
      )}

      {poniendoMonto && (
        <PonerMonto
          linea={poniendoMonto}
          cheques={chequesQueSeReparten}
          alGuardar={(monto) => alPonerMonto(poniendoMonto.id, monto)}
          alCerrar={() => setPoniendoMonto(null)}
        />
      )}
    </main>
  )
}
