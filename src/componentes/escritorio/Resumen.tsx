import { useState } from 'react'
import type { Presupuesto } from '../../datos/tipos'
import { simular } from '../../lib/deudas'
import { centavos, formatearRedondo, suma } from '../../lib/dinero'
import { diaDe, mesDe } from '../../lib/fecha'
import { FilaFondo, Moneda, Segmentado } from '../base'
import { mesYAnio, mesYAnioEnFrase, nombreDeMes } from '../textos'
import { TarjetaEscritorio } from './Panel'

/**
 * El lienzo claro del panel: reparto y gráfica de planeado contra gastado,
 * movimientos y bloque de premium, y fondos de reserva con el bloque del
 * coach. Estructura y contenido salen de `design/escritorio.html`.
 */

const VISTAS = ['Semana', 'Cheque', 'Mes'] as const

// Las alturas de la gráfica vienen del mockup: son datos de ejemplo, no una
// escala calculada. Las dos últimas semanas están por venir.
const SEMANAS = [
  { etiqueta: 'Sem 1', planeado: 34, gastado: 30, porVenir: false },
  { etiqueta: 'Sem 2', planeado: 30, gastado: 34, porVenir: false },
  { etiqueta: 'Sem 3', planeado: 26, gastado: 44, porVenir: false, activa: true },
  { etiqueta: 'Sem 4', planeado: 58, gastado: 0, porVenir: true },
  { etiqueta: 'Sem 5', planeado: 34, gastado: 0, porVenir: true },
]

function Grafica() {
  return (
    <>
      <div className="text-texto-2 mt-[2px] mb-[11px] flex items-center gap-[7px] text-[10.5px] font-semibold tracking-[.11em] uppercase">
        <span className="bg-teal size-[6px] rounded-full" />
        Planeado vs. gastado por semana
      </div>

      <div className="flex h-[158px] items-end gap-[14px]">
        {SEMANAS.map((semana) => (
          <div
            key={semana.etiqueta}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <div className="flex h-full w-full max-w-[52px] flex-col justify-end gap-[2px]">
              {semana.porVenir ? (
                <div
                  className="bg-gris border-linea rounded-[6px] border border-dashed"
                  style={{ height: `${semana.planeado}%` }}
                />
              ) : (
                <>
                  <div
                    className="bg-carbon-3 rounded-[6px]"
                    style={{ height: `${semana.planeado}%` }}
                  />
                  <div className="bg-teal rounded-[6px]" style={{ height: `${semana.gastado}%` }} />
                </>
              )}
            </div>
            <div
              className={`text-[11.5px] ${semana.activa ? 'text-texto font-bold' : 'text-texto-2'}`}
            >
              {semana.etiqueta}
            </div>
          </div>
        ))}
      </div>

      <div className="text-texto-2 mt-3 flex gap-4 text-[11.5px]">
        <span className="flex items-center gap-[6px]">
          <i className="bg-teal block size-[9px] rounded-[3px]" /> Gastado
        </span>
        <span className="flex items-center gap-[6px]">
          <i className="bg-carbon-3 block size-[9px] rounded-[3px]" /> Planeado
        </span>
        <span className="flex items-center gap-[6px]">
          <i className="bg-gris border-linea block size-[9px] rounded-[3px] border border-dashed" />{' '}
          Por venir
        </span>
      </div>
    </>
  )
}

export function Resumen({ presupuesto }: { presupuesto: Presupuesto }) {
  const [vista, setVista] = useState<string>('Cheque')

  const extraActual = centavos(
    suma(presupuesto.deudas.map((d) => d.pagoActualCents)) -
      suma(presupuesto.deudas.map((d) => d.pagoMinimoCents)),
  )
  const plan = simular(presupuesto.deudas, extraActual, presupuesto.inicioDeudas)
  const conMas = simular(
    presupuesto.deudas,
    centavos(extraActual + 15000),
    presupuesto.inicioDeudas,
  )
  const pendientes = [...presupuesto.deudas].sort((a, b) => a.saldoCents - b.saldoCents)

  return (
    <div className="bg-gris grid items-start gap-4 p-[22px] lg:grid-cols-[1fr_262px] xl:grid-cols-[1fr_262px_262px]">
      <div className="flex flex-col gap-4">
        <TarjetaEscritorio
          icono="$"
          titulo="Cómo va el reparto"
          derecha={<Segmentado opciones={VISTAS} activa={vista} alElegir={setVista} />}
        >
          <Grafica />
        </TarjetaEscritorio>

        <TarjetaEscritorio
          icono="↓"
          titulo="Salir de deudas"
          derecha={
            <div className="font-serif text-[19px]">
              {plan.fechaLibertad ? mesYAnio(plan.fechaLibertad) : 'Sin fecha'}
            </div>
          }
        >
          {pendientes.map((deuda) => (
            <div
              key={deuda.id}
              className="border-linea flex items-center justify-between border-b py-[9px] text-[13px] last:border-b-0"
            >
              <span className="text-texto-2">
                {deuda.nombre} ·{' '}
                {deuda.esEnfoque ? (
                  <b className="text-teal-osc font-semibold">enfoque</b>
                ) : (
                  'mínimo'
                )}
              </span>
              <span className="font-semibold">
                <Moneda centavos={deuda.saldoCents} />
              </span>
            </div>
          ))}
          <div className="border-linea flex items-center justify-between border-t py-[9px] text-[13px]">
            <span className="text-teal-osc font-semibold">Si mandas +$150 al mes</span>
            <span className="text-teal-osc font-semibold">
              {conMas.fechaLibertad ? `Sales en ${mesYAnioEnFrase(conMas.fechaLibertad)}` : '—'}
            </span>
          </div>
        </TarjetaEscritorio>
      </div>

      <div className="flex flex-col gap-4">
        <TarjetaEscritorio icono="⇅" titulo="Movimientos">
          {presupuesto.movimientos.map((m) => (
            <div key={m.id} className="bg-gris mb-[6px] flex items-center gap-[10px] rounded-[10px] px-[10px] py-[9px]">
              <div className="bg-blanco border-linea text-texto-2 grid size-[26px] shrink-0 place-items-center rounded-[8px] border text-[12px]">
                {m.icono}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium">{m.nombre}</div>
                <div className="text-texto-2 mt-[1px] text-[10.5px]">
                  {m.categoria} · {diaDe(m.fecha)} {nombreDeMes(mesDe(m.fecha)).slice(0, 3)}
                </div>
              </div>
              <div
                className={`text-[12.5px] font-semibold whitespace-nowrap ${
                  m.tipo === 'ingreso' ? 'text-teal-osc' : ''
                }`}
              >
                {m.tipo === 'ingreso' ? '+' : ''}
                {formatearRedondo(m.montoCents)}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="border-linea text-texto-2 mt-2 min-h-11 w-full rounded-[11px] border py-[10px] text-[12.5px] font-semibold"
          >
            Ver todos
          </button>
        </TarjetaEscritorio>

        <div className="bg-carbon rounded-[15px] p-[18px] text-white">
          <div className="bg-teal mb-3 grid size-[26px] place-items-center rounded-[8px] text-[13px] text-[#06322A]">
            ★
          </div>
          <h4 className="font-serif mb-2 text-[21px] leading-[1.15] font-normal">
            Conecta tu banco
          </h4>
          <p className="mb-[13px] text-[12px] leading-[1.5] text-[#9AA09E]">
            La app trae tus gastos y tú solo los mandas a su sobre. Incluye avisos al teléfono y
            modo pareja.
          </p>
          <button
            type="button"
            className="bg-teal min-h-11 rounded-[10px] px-[15px] py-[10px] text-[12.5px] font-bold text-[#06322A]"
          >
            Hazte Premium
          </button>
          <div className="mt-[9px] text-[11px] text-[#787E7D]">$8 al mes · o $79 al año</div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <TarjetaEscritorio icono="◍" titulo="Fondos de reserva">
          {presupuesto.fondos.map((fondo) => (
            <FilaFondo
              key={fondo.id}
              nombre={fondo.nombre}
              acumuladoCents={fondo.acumuladoCents}
              metaCents={fondo.metaCents}
              cifras
              cuando={
                fondo.mesesQueFaltan > 0 ? (
                  <>
                    {fondo.mesObjetivo} · faltan{' '}
                    <b className="text-teal-osc font-semibold">{fondo.mesesQueFaltan} meses</b>
                  </>
                ) : (
                  <>
                    {fondo.mesObjetivo} ·{' '}
                    <b className="text-teal-osc font-semibold">
                      <Moneda centavos={fondo.porChequeCents} /> por cheque
                    </b>
                  </>
                )
              }
            />
          ))}
          <button
            type="button"
            className="border-linea text-texto-2 mt-[14px] min-h-11 w-full rounded-[11px] border py-[10px] text-[12.5px] font-semibold"
          >
            Agregar un fondo
          </button>
        </TarjetaEscritorio>

        {presupuesto.coach && (
          <TarjetaEscritorio icono="◌" titulo="Tu coach">
            <div className="flex items-center gap-[11px]">
              <div className="bg-carbon text-teal font-serif grid size-[38px] shrink-0 place-items-center rounded-full text-[16px]">
                {presupuesto.coach.iniciales}
              </div>
              <div>
                <div className="text-[13px] font-semibold">{presupuesto.coach.titulo}</div>
                <div className="text-texto-2 mt-[2px] text-[11.5px]">{presupuesto.coach.detalle}</div>
              </div>
            </div>
            <button
              type="button"
              className="border-linea text-texto-2 mt-[13px] min-h-11 w-full rounded-[11px] border py-[10px] text-[12.5px] font-semibold"
            >
              Leer las notas
            </button>
          </TarjetaEscritorio>
        )}
      </div>
    </div>
  )
}
