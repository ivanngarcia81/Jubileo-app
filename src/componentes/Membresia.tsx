import { useState } from 'react'
import { PRECIOS, ahorroAnual, type Plan } from '../lib/membresia'
import { formatear } from '../lib/dinero'
import type { Centavos } from '../lib/dinero'

/**
 * La membresía.
 *
 * Lo de arriba no es una lista de lo que le falta al usuario: es lo que ya
 * tiene. El presupuesto completo, el motor de cheques, las deudas con su fecha
 * y el aviso semanal van gratis — el diferenciador del producto va gratis a
 * propósito, porque es lo que hace que la gente lo cuente (sección 10).
 *
 * Premium se ofrece por lo que agrega, no por lo que retiene.
 */

const LO_QUE_YA_TIENES = [
  'Tu presupuesto completo, cheque a cheque',
  'Sobres, gastos y cierre de semana',
  'Tus deudas con su fecha de libertad',
  'El aviso semanal por correo',
]

const LO_QUE_AGREGA = [
  'Aviso al teléfono, a la hora que tú digas',
  'Fondos de reserva sin tope',
  'Historial completo y comparar meses',
  'El simulador de «¿qué pasa si?»',
  'Exportar tu presupuesto en PDF',
  'Compartirlo con tu coach',
]

export function Membresia({
  nivel,
  venceEn,
  alPagar,
  alAdministrar,
  alCanjear,
}: {
  nivel: 'gratis' | 'premium'
  /** Cuándo se acaba lo pagado, si hay fecha. */
  venceEn: string | null
  alPagar?: (plan: Plan) => Promise<void>
  alAdministrar?: () => Promise<void>
  alCanjear?: (codigo: string) => Promise<void>
}) {
  const [plan, setPlan] = useState<Plan>('mensual')
  const [codigo, setCodigo] = useState('')
  const [canjeando, setCanjeando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function intentar(accion: () => Promise<void>) {
    setOcupado(true)
    setError(null)
    try {
      await accion()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el pago.')
      setOcupado(false)
    }
  }

  if (nivel === 'premium') {
    return (
      <div className="bg-blanco border-linea rounded-[15px] border p-5">
        <div className="text-teal-osc text-[11.5px] font-bold tracking-[.06em] uppercase">
          Cuenta Premium
        </div>
        <h2 className="font-serif mt-1 text-[24px] leading-tight">Gracias.</h2>
        <p className="text-texto-2 mt-2 text-[13.5px] leading-[1.55]">
          {venceEn
            ? `Tu membresía sigue activa hasta el ${venceEn}.`
            : 'Tu membresía está activa.'}
        </p>
        {alAdministrar && (
          <button
            type="button"
            onClick={() => void intentar(alAdministrar)}
            disabled={ocupado}
            className="border-linea text-texto mt-4 min-h-11 w-full rounded-[11px] border text-[14px] font-semibold disabled:opacity-50"
          >
            {ocupado ? 'Abriendo…' : 'Administrar mi membresía'}
          </button>
        )}
        <p className="text-texto-2 mt-3 text-[12.5px] leading-[1.5]">
          Ahí puedes cambiar tu tarjeta, ver tus recibos o cancelar. Si cancelas, tu membresía dura
          hasta el final del periodo que ya pagaste, y después la cuenta baja a gratis sin borrar
          nada.
        </p>
        {error && (
          <p className="text-ambar mt-3 text-[13px]" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  const ahorro = ahorroAnual() as Centavos

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-blanco border-linea rounded-[15px] border p-5">
        <div className="text-texto-2 text-[11.5px] font-bold tracking-[.06em] uppercase">
          Cuenta gratis
        </div>
        <h2 className="font-serif mt-1 text-[22px] leading-tight">Lo que ya tienes</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {LO_QUE_YA_TIENES.map((t) => (
            <li key={t} className="text-texto flex gap-2 text-[13.5px] leading-[1.5]">
              <span className="text-teal-osc">✓</span>
              {t}
            </li>
          ))}
        </ul>
        <p className="text-texto-2 mt-3 text-[12.5px] leading-[1.5]">
          Nada de esto tiene fecha ni tope. El presupuesto cheque a cheque es el producto, no el
          anzuelo.
        </p>
      </div>

      <div className="bg-carbon rounded-[15px] p-5 text-white">
        <div className="text-teal text-[11.5px] font-bold tracking-[.06em] uppercase">Premium</div>
        <h2 className="font-serif mt-1 text-[22px] leading-tight">Lo que agrega</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {LO_QUE_AGREGA.map((t) => (
            <li key={t} className="flex gap-2 text-[13.5px] leading-[1.5] text-[#C9CECC]">
              <span className="text-teal">+</span>
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex gap-2">
          {(['mensual', 'anual'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlan(p)}
              aria-pressed={plan === p}
              className={`flex-1 rounded-[11px] border-2 px-3 py-3 text-left ${
                plan === p ? 'border-teal bg-carbon-2' : 'border-carbon-3'
              }`}
            >
              <span className="block text-[15px] font-bold">{PRECIOS[p].etiqueta}</span>
              {p === 'anual' && (
                <span className="text-teal block text-[11.5px] font-semibold">
                  ahorras {formatear(ahorro)}
                </span>
              )}
            </button>
          ))}
        </div>

        {alPagar && (
          <button
            type="button"
            onClick={() => void intentar(() => alPagar(plan))}
            disabled={ocupado}
            className="bg-teal mt-4 min-h-11 w-full rounded-[11px] py-3 text-[15px] font-bold text-[#043432] disabled:opacity-50"
          >
            {ocupado ? 'Abriendo…' : `Hacerme Premium · ${PRECIOS[plan].etiqueta}`}
          </button>
        )}

        {error && (
          <p className="text-ambar mt-3 text-[13px]" role="alert">
            {error}
          </p>
        )}

        <p className="mt-3 text-[12px] leading-[1.5] text-[#8E9492]">
          El pago se hace en Stripe. Puedes cancelar cuando quieras desde tu cuenta, y si cancelas
          no se borra nada.
        </p>
      </div>

      {alCanjear && (
        <div className="bg-blanco border-linea rounded-[15px] border p-5">
          {canjeando ? (
            <>
              <label
                htmlFor="codigo-cortesia"
                className="text-texto-2 block text-[11.5px] font-bold tracking-[.06em] uppercase"
              >
                Tu código
              </label>
              <input
                id="codigo-cortesia"
                type="text"
                value={codigo}
                autoFocus
                autoCapitalize="characters"
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="COACH2026"
                className="border-linea text-texto mt-2 min-h-11 w-full rounded-[11px] border px-4 py-3 text-[17px] tracking-[.12em] placeholder:tracking-normal placeholder:text-[#9AA09E] focus:outline-none"
              />
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCanjeando(false)}
                  disabled={ocupado}
                  className="border-linea text-texto-2 min-h-11 flex-1 rounded-[11px] border text-[14px] font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void intentar(() => alCanjear(codigo))}
                  disabled={ocupado || codigo.trim() === ''}
                  className="bg-carbon min-h-11 flex-[1.6] rounded-[11px] text-[14px] font-bold text-white disabled:opacity-50"
                >
                  {ocupado ? 'Canjeando…' : 'Canjear'}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCanjeando(true)}
              className="text-texto-2 min-h-11 w-full text-left text-[13.5px]"
            >
              ¿Tienes un código de tu coach?
            </button>
          )}
          {error && (
            <p className="text-ambar mt-3 text-[13px] leading-[1.5]" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
