import { useState } from 'react'
import type { Presupuesto } from '../datos/tipos'
import { deDolares } from '../lib/dinero'
import { fecha } from '../lib/fecha'
import type { FrecuenciaPago, MesObjetivo, Periodo } from '../lib/periodos'
import { generarPeriodos } from '../lib/periodos'
import { Moneda } from './base'
import { cuantos, diaYMes } from './textos'

/**
 * Cambiar cómo te pagan.
 *
 * La regla 3 de la sección 6 es explícita: **es un solo control en ajustes**, y
 * cambiar de frecuencia no rehace el presupuesto. Lo que se ve antes de guardar
 * son los cheques de verdad, con el mismo motor — el usuario decide viendo el
 * resultado, no imaginándolo.
 *
 * Lo que ya anotó no se pierde: cada gasto vuelve al cheque que cubre su fecha.
 * Eso se dice aquí, porque es la duda razonable de alguien a quien le van a
 * mover el calendario a medio mes.
 */

const FRECUENCIAS: readonly { valor: FrecuenciaPago; etiqueta: string; ayuda: string }[] = [
  { valor: 'semanal', etiqueta: 'Cada semana', ayuda: 'Todas las semanas el mismo día' },
  { valor: 'cada_dos_semanas', etiqueta: 'Cada dos semanas', ayuda: 'Cada 14 días' },
  { valor: 'dos_veces_al_mes', etiqueta: 'Dos veces al mes', ayuda: 'Por ejemplo el 1 y el 15' },
  { valor: 'mensual', etiqueta: 'Una vez al mes', ayuda: 'Un solo cheque al mes' },
  { valor: 'variable', etiqueta: 'Es variable', ayuda: 'Cambia de semana a semana' },
]

const ACTUAL: Record<string, FrecuenciaPago> = {
  Semanal: 'semanal',
  'Cada dos semanas': 'cada_dos_semanas',
  'Dos veces al mes': 'dos_veces_al_mes',
  Mensual: 'mensual',
  'Ingreso variable': 'variable',
}

export interface DatosDePago {
  frecuencia: FrecuenciaPago
  fechaAncla: string
  diasPago: number[]
  ingresoEsperadoCents: number | null
}

export function ComoMePagan({
  presupuesto,
  mes,
  alGuardar,
}: {
  presupuesto: Presupuesto
  mes: MesObjetivo
  alGuardar: (datos: DatosDePago) => Promise<void>
}) {
  const cheque = presupuesto.periodos[0]
  const [abierto, setAbierto] = useState(false)
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPago>(
    ACTUAL[presupuesto.usuario.frecuencia] ?? 'cada_dos_semanas',
  )
  const [ancla, setAncla] = useState<string>(cheque ? cheque.fechaPago : '')
  const [dias, setDias] = useState<[number, number]>([1, 15])
  const [ingreso, setIngreso] = useState(
    presupuesto.ingresoPorChequeCents > 0
      ? String(Math.round(presupuesto.ingresoPorChequeCents / 100))
      : '',
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esVariable = frecuencia === 'variable'
  const listo = ancla !== '' && (esVariable || ingreso !== '')

  let previa: Periodo[] = []
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

  const cambia = previa.length > 0 && previa.length !== presupuesto.periodos.length

  async function guardar() {
    if (!listo) return
    setGuardando(true)
    setError(null)
    try {
      await alGuardar({
        frecuencia,
        fechaAncla: ancla,
        diasPago: dias,
        ingresoEsperadoCents: esVariable || ingreso === '' ? null : deDolares(Number(ingreso)),
      })
      setAbierto(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <div className="bg-blanco border-linea rounded-[15px] border p-5">
        <div className="text-texto-2 text-menor font-bold tracking-[.06em] uppercase">
          Cómo te pagan
        </div>
        <h2 className="font-serif mt-1 text-titulo leading-tight">
          {presupuesto.usuario.frecuencia}
        </h2>
        <p className="text-texto-2 mt-2 text-cuerpo leading-[1.55]">
          {cuantos(presupuesto.periodos.length, 'cheque', 'cheques')} este mes
          {cheque && ` · el primero el ${diaYMes(cheque.fechaPago)}`}
        </p>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="border-linea text-texto mt-4 min-h-11 w-full rounded-[11px] border text-cuerpo font-semibold"
        >
          Cambiar cómo me pagan
        </button>
      </div>
    )
  }

  return (
    <div className="bg-blanco border-linea rounded-[15px] border p-5">
      <h2 className="font-serif text-titulo leading-tight">Cómo te pagan</h2>
      <p className="text-texto-2 mt-1 text-menor leading-[1.5]">
        Cambiar esto vuelve a armar tus cheques, pero <b>no rehace tu presupuesto</b>: los montos
        de cada categoría se quedan igual y solo se reparten distinto.
      </p>

      <fieldset className="mt-5">
        <legend className="text-texto-2 text-rotulo font-semibold tracking-[.12em] uppercase">
          ¿Cada cuánto te pagan?
        </legend>
        <div className="mt-2 flex flex-col gap-2">
          {FRECUENCIAS.map((f) => (
            <label
              key={f.valor}
              className={`flex min-h-11 items-center gap-3 rounded-[11px] border px-4 py-3 ${
                frecuencia === f.valor ? 'border-teal border-2' : 'border-linea'
              }`}
            >
              <input
                type="radio"
                name="frecuencia-ajustes"
                value={f.valor}
                checked={frecuencia === f.valor}
                onChange={() => setFrecuencia(f.valor)}
                className="accent-teal size-4"
              />
              <span className="min-w-0">
                <span className="text-texto block text-cuerpo font-medium">{f.etiqueta}</span>
                <span className="text-texto-2 block text-menor">{f.ayuda}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {frecuencia === 'dos_veces_al_mes' && (
        <div className="mt-4 flex items-center gap-2">
          {([0, 1] as const).map((i) => (
            <input
              key={i}
              type="text"
              inputMode="numeric"
              value={dias[i]}
              aria-label={i === 0 ? 'Primer día de pago' : 'Segundo día de pago'}
              onChange={(e) => {
                const n = Math.min(31, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))
                setDias((d) => (i === 0 ? [n, d[1]] : [d[0], n]))
              }}
              className="border-linea text-texto min-h-11 w-20 rounded-[11px] border px-3 py-2 text-center text-titulo"
            />
          ))}
          <span className="text-texto-2 text-menor">días del mes</span>
        </div>
      )}

      <label
        htmlFor="ancla-ajustes"
        className="text-texto-2 mt-5 block text-rotulo font-semibold tracking-[.12em] uppercase"
      >
        ¿Cuándo fue tu último cheque?
      </label>
      <input
        id="ancla-ajustes"
        type="date"
        value={ancla}
        onChange={(e) => setAncla(e.target.value)}
        className="border-linea text-texto mt-2 min-h-11 w-full rounded-[11px] border px-4 py-3 text-titulo"
      />

      {!esVariable && (
        <>
          <label
            htmlFor="ingreso-ajustes"
            className="text-texto-2 mt-5 block text-rotulo font-semibold tracking-[.12em] uppercase"
          >
            ¿Cuánto entra en cada cheque?
          </label>
          <div className="border-linea mt-2 flex items-center gap-2 rounded-[11px] border px-4">
            <span className="text-texto-2 text-titulo">$</span>
            <input
              id="ingreso-ajustes"
              type="text"
              inputMode="decimal"
              value={ingreso}
              onChange={(e) => setIngreso(e.target.value.replace(/[^\d.]/g, ''))}
              className="text-texto min-h-11 w-full bg-transparent py-3 text-titulo [font-variant-numeric:tabular-nums] focus:outline-none"
            />
          </div>
        </>
      )}

      {previa.length > 0 && (
        <div className="bg-gris mt-5 rounded-[11px] p-4">
          <div className="text-texto-2 text-rotulo font-semibold tracking-[.12em] uppercase">
            Tus cheques quedarían así
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {previa.map((p) => (
              <div key={p.numero} className="flex justify-between text-menor">
                <span className="text-texto">
                  Cheque {p.numero} · {diaYMes(p.fechaPago)}
                  {p.esExtra && <span className="text-teal-osc font-semibold"> · extra</span>}
                </span>
                <span className="text-texto-2 [font-variant-numeric:tabular-nums]">
                  {p.ingresoEsperadoCents === null ? '—' : <Moneda centavos={p.ingresoEsperadoCents} />}
                </span>
              </div>
            ))}
          </div>
          {cambia && (
            <p className="text-texto-2 mt-3 text-menor leading-[1.5]">
              Pasas de {presupuesto.periodos.length} a {previa.length} cheques este mes. Lo que ya
              anotaste no se pierde: cada gasto se va al cheque que cubre su fecha.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-ambar mt-3 text-menor leading-[1.5]" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={guardando}
          className="border-linea text-texto-2 min-h-11 flex-1 rounded-[11px] border text-cuerpo font-semibold"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={!listo || guardando}
          className="bg-teal min-h-11 flex-[1.6] rounded-[11px] text-cuerpo font-bold text-tinta-teal disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
