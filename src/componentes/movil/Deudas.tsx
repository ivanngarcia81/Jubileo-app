import { useId, useMemo, useState } from 'react'
import type { Presupuesto } from '../../datos/tipos'
import { EditarDeuda, type DeudaDelPresupuesto } from './EditarDeuda'
import { simular } from '../../lib/deudas'
import { type Centavos, centavos, formatearRedondo, suma } from '../../lib/dinero'
import {
  Barra,
  CeldaCifra,
  CeldaNombre,
  ChipCategoria,
  Fila,
  FilaAgregar,
  ListaSeccion,
  Moneda,
  Seccion,
  Vacio,
  Tarjeta,
  porcentaje,
} from '../base'
import { IconoDeudas } from '../iconos'
import { mesYAnio, mesYAnioEnFrase, meses } from '../textos'

/**
 * Deudas — la fecha de libertad.
 *
 * El héroe es carbón, no turquesa: la meta es la fecha, no un saldo. El
 * deslizador de "¿y si mandas un pago extra?" recalcula esa fecha en vivo con
 * el simulador de `lib/deudas`; no hay ningún número pintado a mano.
 */

const EXTRA_MAXIMO = 35000
const PASO = 1000

/** Las columnas de la lista de deudas. Ver el comentario de `ListaSeccion`. */
const DEUDAS = {
  columnas: 'minmax(0,1fr) 36px 84px',
  columnasPanel: 'minmax(150px,1fr) minmax(90px,300px) 140px',
}

export function Deudas({
  presupuesto,
  alCrearDeuda,
  alGuardarSaldo,
  alEnfocar,
  alBorrarDeuda,
}: {
  presupuesto: Presupuesto
  /** Ausentes con los datos de ejemplo: la demostración se ve pero no se toca. */
  alCrearDeuda?: (
    nombre: string,
    saldoCents: Centavos,
    pagoMinimoCents: Centavos,
    tasa: number | null,
  ) => Promise<void>
  alGuardarSaldo?: (deudaId: string, saldoCents: Centavos, saldoInicialCents: Centavos) => Promise<void>
  alEnfocar?: (deudaId: string) => Promise<void>
  alBorrarDeuda?: (deudaId: string) => Promise<void>
}) {
  const [extra, setExtra] = useState(15000)
  const [editando, setEditando] = useState<DeudaDelPresupuesto | null | undefined>(undefined)
  const editable = Boolean(alCrearDeuda && alGuardarSaldo && alEnfocar && alBorrarDeuda)
  // El teléfono y el escritorio se montan a la vez, así que el id no puede
  // estar escrito a mano: se duplicaría y el <label> dejaría de apuntar.
  const idDeslizador = useId()

  const { plan, conExtra, soloMinimos, extraActual } = useMemo(() => {
    const deudas = presupuesto.deudas
    // Lo que el usuario ya paga por encima de los mínimos.
    const actual = centavos(
      suma(deudas.map((d) => d.pagoActualCents)) - suma(deudas.map((d) => d.pagoMinimoCents)),
    )
    return {
      extraActual: actual,
      plan: simular(deudas, actual, presupuesto.inicioDeudas),
      conExtra: simular(deudas, centavos(actual + extra), presupuesto.inicioDeudas),
      soloMinimos: simular(deudas, centavos(0), presupuesto.inicioDeudas),
    }
  }, [presupuesto, extra])

  const ganadosContraMinimos =
    soloMinimos.mesesHastaLibertad !== null && plan.mesesHastaLibertad !== null
      ? soloMinimos.mesesHastaLibertad - plan.mesesHastaLibertad
      : null

  const seAdelanta =
    plan.mesesHastaLibertad !== null && conExtra.mesesHastaLibertad !== null
      ? plan.mesesHastaLibertad - conExtra.mesesHastaLibertad
      : null

  const pendientes = [...presupuesto.deudas].sort((a, b) => a.saldoCents - b.saldoCents)

  return (
    <>
      <div className="relative overflow-hidden rounded-[19px] bg-[linear-gradient(152deg,#2A2D2E_0%,#1C1E1F_100%)] px-[18px] pt-[17px] pb-4 text-white">
        <div className="absolute -right-10 -bottom-14 size-[150px] rounded-full bg-white/[.12]" />
        <div className="relative">
          <div className="text-[10.5px] font-bold tracking-[.12em] text-[#787E7D] uppercase">
            Tu fecha de libertad
          </div>
          <div className="font-serif mt-[6px] mb-[3px] text-[40px] leading-none">
            {plan.fechaLibertad ? mesYAnio(plan.fechaLibertad) : 'Sin fecha todavía'}
          </div>
          <div className="text-teal text-[12px]">
            {ganadosContraMinimos && ganadosContraMinimos > 0
              ? `${meses(ganadosContraMinimos)} menos que pagando solo los mínimos`
              : 'Pagando solo los mínimos'}
          </div>
        </div>
      </div>

      <Tarjeta className="mt-[13px]">
        <label htmlFor={idDeslizador} className="text-texto-2 mb-[14px] block text-[12.5px]">
          ¿Y si mandas un pago extra cada mes?
        </label>

        <div className="relative mx-1 mt-5 mb-4 h-[5px]">
          <div className="bg-gris absolute inset-0 rounded-full" />
          <div
            className="bg-teal absolute top-0 left-0 h-full rounded-full"
            style={{ width: `${(extra / EXTRA_MAXIMO) * 100}%` }}
          />
          <div
            className="pointer-events-none absolute -top-[26px] -translate-x-1/2 text-[13px] font-bold whitespace-nowrap"
            style={{ left: `${(extra / EXTRA_MAXIMO) * 100}%` }}
          >
            +{formatearRedondo(centavos(extra))}
          </div>
          <div
            className="border-teal pointer-events-none absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white shadow-[0_2px_6px_rgba(0,0,0,.16)]"
            style={{ left: `${(extra / EXTRA_MAXIMO) * 100}%` }}
          />
          <input
            id={idDeslizador}
            type="range"
            min={0}
            max={EXTRA_MAXIMO}
            step={PASO}
            value={extra}
            onChange={(e) => setExtra(Number(e.target.value))}
            aria-label="Pago extra cada mes"
            aria-valuetext={`${formatearRedondo(centavos(extra))} al mes`}
            className="absolute top-1/2 left-0 h-11 w-full -translate-y-1/2 cursor-pointer opacity-0"
          />
        </div>

        <div className="text-teal-osc text-[13px] font-semibold">
          {extra === 0
            ? 'Mueve el deslizador para ver cuánto se adelanta.'
            : conExtra.fechaLibertad === null
              ? 'Con ese pago la deuda no se termina: el interés le gana al abono.'
              : `Sales en ${mesYAnioEnFrase(conExtra.fechaLibertad)}${
                  seAdelanta && seAdelanta > 0 ? ` — ${meses(seAdelanta)} antes.` : '.'
                }`}
        </div>
        {extraActual > 0 && (
          <div className="text-texto-2 mt-[6px] text-[11.5px]">
            Ya mandas <Moneda centavos={extraActual} /> extra al mes por encima de los mínimos.
          </div>
        )}
      </Tarjeta>

      <ListaSeccion
        titulo="En orden de saldo"
        icono={<IconoDeudas tam={15} />}
        dato="menor primero"
        encabezados={['Deuda', 'Pagado', 'Saldo']}
        className="mt-3"
        {...DEUDAS}
      >
        {pendientes.length === 0 && (
          <Vacio>
            Sin deudas pendientes. Si tienes una, agrégala aquí y la app te dice
            en qué mes sales.
          </Vacio>
        )}
        {pendientes.map((deuda) => (
          <Fila
            key={deuda.id}
            {...(editable
              ? { alTocar: () => setEditando(deuda), etiqueta: `Editar ${deuda.nombre}` }
              : {})}
          >
            <CeldaNombre
              detalle={
                deuda.pagoActualCents > deuda.pagoMinimoCents ? (
                  <>
                    Mínimo <Moneda centavos={deuda.pagoMinimoCents} /> · pagas{' '}
                    <Moneda centavos={deuda.pagoActualCents} />
                  </>
                ) : (
                  <>
                    Solo el mínimo · <Moneda centavos={deuda.pagoMinimoCents} />
                  </>
                )
              }
            >
              {deuda.nombre} {deuda.esEnfoque && <ChipCategoria tono="teal">enfoque</ChipCategoria>}
            </CeldaNombre>
            {/* Cuánto lleva pagado de lo que debía al empezar. Antes solo la
                deuda en enfoque la traía; en su propia columna se puede comparar
                el avance de todas, que es de lo que se trata la lista. */}
            <Barra
              porcentaje={100 - porcentaje(deuda.saldoCents, deuda.saldoInicialCents)}
              color="var(--teal)"
            />
            <CeldaCifra>
              <Moneda centavos={deuda.saldoCents} />
            </CeldaCifra>
          </Fila>
        ))}
        <FilaAgregar
          texto="Agregar una deuda"
          {...(editable ? { alTocar: () => setEditando(null) } : {})}
        />
      </ListaSeccion>

      {editando !== undefined && editable && (
        <EditarDeuda
          deuda={editando}
          alCrear={alCrearDeuda!}
          alGuardarSaldo={(saldo) =>
            alGuardarSaldo!(editando!.id, saldo, editando!.saldoInicialCents)
          }
          alEnfocar={() => alEnfocar!(editando!.id)}
          alBorrar={() => alBorrarDeuda!(editando!.id)}
          alCerrar={() => setEditando(undefined)}
        />
      )}

      {presupuesto.observacion && (
        <>
          <Seccion>Vale la pena revisar</Seccion>
          <Tarjeta>
            <div className="text-[14px] font-semibold">{presupuesto.observacion.titulo}</div>
            <div className="text-texto-2 mt-[5px] text-[12.5px] leading-[1.5]">
              {presupuesto.observacion.cuerpo}
            </div>
          </Tarjeta>
        </>
      )}
    </>
  )
}
