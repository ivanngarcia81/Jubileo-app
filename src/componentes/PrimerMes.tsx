import { useState } from 'react'
import { deDolares } from '../lib/dinero'
import { fecha } from '../lib/fecha'
import type { FrecuenciaPago, MesObjetivo } from '../lib/periodos'
import { generarPeriodos } from '../lib/periodos'
import { Moneda } from './base'
import { nombreDeMes } from './textos'

/**
 * Arma tu primer mes.
 *
 * Las dos primeras preguntas del onboarding de la sección 7: cómo te pagan y
 * cuánto entra. Con eso el motor de periodos ya puede generar el calendario, y
 * el usuario **ve sus cheques antes de guardar nada** — la vista previa se
 * recalcula mientras contesta. Nunca una pantalla vacía.
 */

const FRECUENCIAS: readonly { valor: FrecuenciaPago; etiqueta: string; ayuda: string }[] = [
  { valor: 'semanal', etiqueta: 'Cada semana', ayuda: 'Todas las semanas el mismo día' },
  { valor: 'cada_dos_semanas', etiqueta: 'Cada dos semanas', ayuda: 'Cada 14 días' },
  { valor: 'dos_veces_al_mes', etiqueta: 'Dos veces al mes', ayuda: 'Por ejemplo el 1 y el 15' },
  { valor: 'mensual', etiqueta: 'Una vez al mes', ayuda: 'Un solo cheque al mes' },
  { valor: 'variable', etiqueta: 'Es variable', ayuda: 'Cambia de semana a semana' },
]

export function PrimerMes({
  mes,
  alArmar,
}: {
  mes: MesObjetivo
  alArmar: (datos: {
    frecuencia: FrecuenciaPago
    fechaAncla: string
    diasPago: number[]
    ingresoEsperadoCents: number | null
    nombre: string
  }) => Promise<void>
}) {
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPago>('cada_dos_semanas')
  const [ancla, setAncla] = useState('')
  const [dias, setDias] = useState<[number, number]>([1, 15])
  const [ingreso, setIngreso] = useState('')
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esVariable = frecuencia === 'variable'
  const listo = ancla !== '' && (esVariable || ingreso !== '')

  // Vista previa: los cheques de verdad, con el mismo motor que usa el mes.
  let previa: ReturnType<typeof generarPeriodos> = []
  try {
    if (ancla !== '') {
      previa = generarPeriodos(
        {
          frecuencia,
          fechaAncla: fecha(ancla),
          ...(frecuencia === 'dos_veces_al_mes' ? { diasPago: dias } : {}),
          ingresoEsperadoCents: ingreso === '' ? null : deDolares(Number(ingreso)),
        },
        mes,
      )
    }
  } catch {
    previa = []
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await alArmar({
        frecuencia,
        fechaAncla: ancla,
        diasPago: dias,
        ingresoEsperadoCents: esVariable || ingreso === '' ? null : deDolares(Number(ingreso)),
        nombre,
      })
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'No se pudo armar el mes.')
      setGuardando(false)
    }
  }

  return (
    <main className="bg-gris text-texto font-sans min-h-dvh px-4 py-8">
      <form onSubmit={guardar} className="mx-auto max-w-[46ch]">
        <h1 className="font-serif text-cifra leading-[1.15]">
          Vamos a armar {nombreDeMes(mes.mes).toLowerCase()}
        </h1>
        <p className="text-texto-2 mt-2 text-cuerpo leading-[1.6]">
          Empezamos por cómo te pagan. Con eso la app sabe cuántos cheques te caen este mes y
          cuándo.
        </p>

        <label
          htmlFor="tu-nombre"
          className="text-texto-2 mt-7 block text-rotulo font-semibold tracking-[.12em] uppercase"
        >
          ¿Cómo te llamas?
        </label>
        <input
          id="tu-nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Iván"
          autoComplete="given-name"
          className="border-linea bg-blanco text-texto mt-2 min-h-11 w-full rounded-btn border px-4 py-3 text-titulo placeholder:text-texto-claro-3 focus:outline-none"
        />

        <fieldset className="mt-7">
          <legend className="text-texto-2 text-rotulo font-semibold tracking-[.12em] uppercase">
            ¿Cada cuánto te pagan?
          </legend>
          <div className="mt-3 flex flex-col gap-2">
            {FRECUENCIAS.map((f) => (
              <label
                key={f.valor}
                className={`bg-blanco flex min-h-11 cursor-pointer items-center gap-3 rounded-card border px-[14px] py-3 ${
                  frecuencia === f.valor ? 'border-teal border-2' : 'border-linea'
                }`}
              >
                <input
                  type="radio"
                  name="frecuencia"
                  value={f.valor}
                  checked={frecuencia === f.valor}
                  onChange={() => setFrecuencia(f.valor)}
                  className="accent-[color:var(--teal)] size-[18px]"
                />
                <span className="flex-1">
                  <span className="block text-cuerpo font-medium">{f.etiqueta}</span>
                  <span className="text-texto-2 block text-menor">{f.ayuda}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {frecuencia === 'dos_veces_al_mes' && (
          <div className="mt-5">
            <span className="text-texto-2 text-rotulo font-semibold tracking-[.12em] uppercase">
              ¿Qué días del mes?
            </span>
            <div className="mt-3 flex items-center gap-3">
              {([0, 1] as const).map((i) => (
                <input
                  key={i}
                  type="number"
                  min={1}
                  max={31}
                  value={dias[i]}
                  onChange={(e) => {
                    const v = Math.min(31, Math.max(1, Number(e.target.value) || 1))
                    setDias((d) => (i === 0 ? [v, d[1]] : [d[0], v]))
                  }}
                  aria-label={i === 0 ? 'Primer día de pago' : 'Segundo día de pago'}
                  className="bg-blanco border-linea min-h-11 w-20 rounded-btn border px-3 py-2 text-center text-titulo"
                />
              ))}
              <span className="text-texto-2 text-menor">Si te pagan el último, pon 31.</span>
            </div>
          </div>
        )}

        <div className="mt-6">
          <label
            htmlFor="ancla"
            className="text-texto-2 block text-rotulo font-semibold tracking-[.12em] uppercase"
          >
            ¿Cuándo fue tu último cheque?
          </label>
          <input
            id="ancla"
            type="date"
            required
            value={ancla}
            onChange={(e) => setAncla(e.target.value)}
            className="bg-blanco border-linea mt-3 min-h-11 w-full rounded-btn border px-4 py-3 text-titulo"
          />
          <p className="text-texto-2 mt-2 text-menor leading-[1.5]">
            Con una fecha basta. De ahí sale todo tu calendario.
          </p>
        </div>

        {!esVariable && (
          <div className="mt-6">
            <label
              htmlFor="ingreso"
              className="text-texto-2 block text-rotulo font-semibold tracking-[.12em] uppercase"
            >
              ¿Cuánto entra en cada cheque?
            </label>
            <div className="bg-blanco border-linea mt-3 flex items-center rounded-btn border px-4">
              <span className="text-texto-2 text-titulo">$</span>
              <input
                id="ingreso"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                required
                value={ingreso}
                onChange={(e) => setIngreso(e.target.value)}
                placeholder="1240"
                className="min-h-11 w-full bg-transparent py-3 pl-2 text-titulo focus:outline-none"
              />
            </div>
            <p className="text-texto-2 mt-2 text-menor leading-[1.5]">
              Más o menos. Después confirmas lo que entró de verdad.
            </p>
          </div>
        )}

        {previa.length > 0 && (
          <div className="bg-carbon mt-7 rounded-card p-[18px] text-white">
            <div className="text-rotulo font-semibold tracking-[.14em] text-texto-claro-3 uppercase">
              Tus cheques de {nombreDeMes(mes.mes)}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {previa.map((p) => (
                <div key={p.numero} className="flex items-baseline justify-between text-cuerpo">
                  <span className={p.esExtra ? 'text-ambar' : ''}>
                    {p.esExtra ? 'Cheque extra' : `Cheque ${p.numero}`} · {p.fechaPago.slice(8)} de{' '}
                    {nombreDeMes(Number(p.fechaPago.slice(5, 7))).toLowerCase()}
                  </span>
                  <span className="font-semibold [font-variant-numeric:tabular-nums]">
                    {p.ingresoEsperadoCents === null ? (
                      '—'
                    ) : (
                      <Moneda centavos={p.ingresoEsperadoCents} />
                    )}
                  </span>
                </div>
              ))}
            </div>
            {previa.some((p) => p.esExtra) && (
              <p className="mt-3 text-menor leading-[1.5] text-texto-claro-3">
                Este mes te caen <b className="text-ambar">{previa.length} cheques</b>. El extra no
                se reparte entre categorías: llega completo.
              </p>
            )}
            {esVariable && (
              <p className="mt-3 text-menor leading-[1.5] text-texto-claro-3">
                Como tu ingreso es variable, cada semana capturas lo que entró y ahí se reparte.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-rojo mt-4 text-menor leading-[1.5]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!listo || guardando}
          className="bg-carbon mt-6 min-h-11 w-full rounded-btn py-3 text-cuerpo font-bold text-white disabled:opacity-40"
        >
          {guardando ? 'Armando tu mes…' : 'Armar mi mes'}
        </button>
      </form>
    </main>
  )
}
