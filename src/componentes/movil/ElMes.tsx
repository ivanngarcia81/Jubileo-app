import { useState } from 'react'
import { ALTURAS_MESES } from '../../datos/ejemplo'
import type { LineaMes, Presupuesto } from '../../datos/tipos'
import { type Centavos, formatearRedondo } from '../../lib/dinero'
import { FilaFondo, Fila, Icono, Moneda, Seccion, Segmentado, Tarjeta } from '../base'
import { PonerMonto } from './PonerMonto'

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

  const sobra = presupuesto.sinRepartirCents
  const cifra =
    vista === 'Entra' ? presupuesto.entraCents : vista === 'Sale' ? presupuesto.saleCents : sobra

  return (
    <div className="bg-blanco border-linea rounded-[15px] border px-[14px] pt-[15px] pb-3">
      <div className="mb-[14px] text-center">
        <div
          className={`font-serif text-[38px] leading-none [font-variant-numeric:tabular-nums] ${
            vista === 'Sobró' && sobra !== 0 ? 'text-ambar' : 'text-teal-osc'
          }`}
        >
          {formatearRedondo(cifra)}
        </div>
        <div className="text-texto-2 mt-[3px] text-[11.5px]">
          {vista === 'Sobró'
            ? sobra === 0
              ? 'Sin repartir — tu presupuesto cuadra'
              : sobra > 0
                ? 'Sin repartir — todavía falta darle destino'
                : 'Te pasaste: repartiste más de lo que entra'
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
                    activo ? 'bg-[linear-gradient(180deg,#0ABBB4,#0A847F)]' : 'bg-linea'
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

export function ElMes({
  presupuesto,
  alPonerMonto,
}: {
  presupuesto: Presupuesto
  /** Ausente con los datos de ejemplo: la demostración se ve pero no se edita. */
  alPonerMonto?: (categoriaId: string, montoCents: Centavos) => Promise<void>
}) {
  const [editando, setEditando] = useState<LineaMes | null>(null)
  const editable = Boolean(alPonerMonto && presupuesto.mesId)
  // Los cheques extra no se reparten: lo que caiga ahí es de más, no del mes.
  const chequesQueSeReparten = presupuesto.periodos.filter((p) => !p.esExtra).length

  const filaEditable = (linea: LineaMes) => (
    <Tarjeta key={linea.id}>
      <Fila
        izquierda={<Icono>{linea.icono}</Icono>}
        titulo={linea.nombre}
        detalle={linea.detalle}
        derecha={
          editable ? (
            <button
              type="button"
              onClick={() => setEditando(linea)}
              aria-label={`Poner el monto de ${linea.nombre}`}
              className="border-linea text-texto min-h-11 rounded-[9px] border px-3 text-[15px] font-semibold [font-variant-numeric:tabular-nums]"
            >
              <Moneda centavos={linea.montoMensualCents} />
            </button>
          ) : (
            <Moneda centavos={linea.montoMensualCents} />
          )
        }
      />
    </Tarjeta>
  )

  return (
    <>
      <SelectorDeMes presupuesto={presupuesto} />

      <Seccion>Primero</Seccion>
      {filaEditable(presupuesto.mayordomia)}

      <Seccion dato={`${presupuesto.fijos.length} categorías`}>Gastos fijos</Seccion>
      <div className="flex flex-col gap-2">{presupuesto.fijos.map(filaEditable)}</div>

      {presupuesto.variables.length > 0 && (
        <>
          <Seccion dato={`${presupuesto.variables.length} sobres`}>Gastos variables</Seccion>
          <div className="flex flex-col gap-2">{presupuesto.variables.map(filaEditable)}</div>
        </>
      )}

      {editando && alPonerMonto && (
        <PonerMonto
          linea={editando}
          cheques={chequesQueSeReparten}
          alGuardar={(monto) => alPonerMonto(editando.id, monto)}
          alCerrar={() => setEditando(null)}
        />
      )}

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
