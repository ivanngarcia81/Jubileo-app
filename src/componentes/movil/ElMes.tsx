import { useState } from 'react'
import { ALTURAS_MESES } from '../../datos/ejemplo'
import type { Presupuesto } from '../../datos/tipos'
import { formatearRedondo } from '../../lib/dinero'
import { FilaFondo, Fila, Icono, Moneda, Seccion, Segmentado, Tarjeta } from '../base'

/**
 * El mes — presupuesto base cero.
 *
 * Primero mayordomía, luego los fijos con su día de vencimiento y el cheque
 * que les toca, y al final los fondos de reserva. Arriba, el selector de mes
 * con barras y el control segmentado de entra / sale / sobró.
 */

const VISTAS = ['Entra', 'Sale', 'Sobró'] as const

function SelectorDeMes({ presupuesto }: { presupuesto: Presupuesto }) {
  const [vista, setVista] = useState<string>('Sale')

  const cifra =
    vista === 'Entra'
      ? presupuesto.entraCents
      : vista === 'Sale'
        ? presupuesto.saleCents
        : presupuesto.sinRepartirCents

  return (
    <div className="bg-blanco border-linea rounded-[15px] border px-[14px] pt-[15px] pb-3">
      <div className="mb-[14px] text-center">
        <div className="font-serif text-teal-osc text-[38px] leading-none [font-variant-numeric:tabular-nums]">
          {formatearRedondo(vista === 'Sobró' ? presupuesto.sinRepartirCents : cifra)}
        </div>
        <div className="text-texto-2 mt-[3px] text-[11.5px]">
          {vista === 'Sobró'
            ? 'Sin repartir — tu presupuesto cuadra'
            : vista === 'Entra'
              ? `Entra este mes · ${presupuesto.periodos.length} cheques`
              : 'Sale este mes · repartido en tus cheques'}
        </div>
      </div>

      <div className="flex h-[112px] items-end gap-2">
        {presupuesto.mesesPasados.map((m, i) => {
          const activo = i === presupuesto.mesesPasados.length - 1
          return (
            <div key={m.etiqueta} className="flex h-full flex-1 flex-col items-center justify-end gap-[7px]">
              <div className="bg-gris relative h-full w-full max-w-[24px] rounded-[7px]">
                <div
                  className={`absolute bottom-0 left-0 w-full rounded-[7px] ${
                    activo ? 'bg-[linear-gradient(180deg,#12C2A0,#0F7F69)]' : 'bg-linea'
                  }`}
                  style={{ height: `${ALTURAS_MESES[i] ?? 0}%` }}
                />
              </div>
              <div className={`text-[10.5px] ${activo ? 'text-texto font-bold' : 'text-texto-2'}`}>
                {m.etiqueta}
              </div>
            </div>
          )
        })}
      </div>

      <Segmentado opciones={VISTAS} activa={vista} alElegir={setVista} className="mt-[14px]" />
    </div>
  )
}

export function ElMes({ presupuesto }: { presupuesto: Presupuesto }) {
  return (
    <>
      <SelectorDeMes presupuesto={presupuesto} />

      <Seccion>Primero</Seccion>
      <Tarjeta>
        <Fila
          izquierda={<Icono>{presupuesto.mayordomia.icono}</Icono>}
          titulo={presupuesto.mayordomia.nombre}
          detalle={presupuesto.mayordomia.detalle}
          derecha={<Moneda centavos={presupuesto.mayordomia.montoMensualCents} />}
        />
      </Tarjeta>

      <Seccion dato={`${presupuesto.fijos.length} categorías`}>Gastos fijos</Seccion>
      <div className="flex flex-col gap-2">
        {presupuesto.fijos.map((linea) => (
          <Tarjeta key={linea.id}>
            <Fila
              izquierda={<Icono>{linea.icono}</Icono>}
              titulo={linea.nombre}
              detalle={linea.detalle}
              derecha={<Moneda centavos={linea.montoMensualCents} />}
            />
          </Tarjeta>
        ))}
      </div>

      <Seccion>Fondos de reserva</Seccion>
      <Tarjeta>
        {presupuesto.fondos.slice(0, 2).map((fondo) => (
          <FilaFondo
            key={fondo.id}
            nombre={fondo.nombre}
            acumuladoCents={fondo.acumuladoCents}
            metaCents={fondo.metaCents}
            cuando={
              <>
                {fondo.mesObjetivo} ·{' '}
                <b className="text-teal-osc font-semibold">
                  <Moneda centavos={fondo.porChequeCents} /> por cheque
                </b>
              </>
            }
          />
        ))}
      </Tarjeta>
    </>
  )
}
