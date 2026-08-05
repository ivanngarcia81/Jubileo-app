import { useState } from 'react'
import type { Presupuesto } from '../../datos/tipos'
import { type Centavos, formatearRedondo } from '../../lib/dinero'
import { diaDe, mesDe } from '../../lib/fecha'
import {
  Barra,
  Casilla,
  Etiqueta,
  Fila,
  Moneda,
  Seccion,
  Tarjeta,
  colorDeSobre,
  porcentaje,
} from '../base'

/**
 * Mi semana — la pantalla de inicio.
 *
 * Un solo número grande: lo que queda en el periodo. El riel de cheques vive
 * dentro del héroe, y los chips de acción quedan en la zona del pulgar.
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function Hero({ presupuesto }: { presupuesto: Presupuesto }) {
  const { periodos, periodoActivo, libreporPeriodoCents, ingresoPorChequeCents } = presupuesto
  const activo = periodos[periodoActivo]!
  const disponible = libreporPeriodoCents[periodoActivo]!
  const dia = new Date(`${activo.fechaPago}T00:00:00Z`).getUTCDay()

  return (
    <div className="relative overflow-hidden rounded-[19px] bg-[linear-gradient(152deg,#0F7F69_0%,#12C2A0_100%)] px-[18px] pt-[17px] pb-4 text-[#04291F]">
      <div className="absolute -right-10 -bottom-14 size-[150px] rounded-full bg-white/[.12]" />
      <div className="relative">
        <div className="text-[10.5px] font-bold tracking-[.12em] text-[#04291F]/60 uppercase">
          Te queda esta semana
        </div>
        <div className="font-serif mt-[6px] mb-[3px] text-[52px] leading-none [font-variant-numeric:tabular-nums]">
          {formatearRedondo(disponible)}
        </div>
        <div className="text-[12px] text-[#04291F]/75">
          Entró <Moneda centavos={ingresoPorChequeCents} /> el {DIAS[dia]} {diaDe(activo.fechaPago)}{' '}
          de {MESES[mesDe(activo.fechaPago) - 1]}
        </div>

        <div className="mt-[14px] flex gap-[5px]">
          {periodos.map((periodo, i) => {
            const esActivo = i === periodoActivo
            const fondo = esActivo
              ? 'bg-white/[.94]'
              : periodo.esExtra
                ? 'bg-carbon/[.16]'
                : 'bg-white/[.28]'
            return (
              <div key={periodo.numero} className={`flex-1 rounded-[8px] px-[5px] py-[6px] text-center ${fondo}`}>
                <div className="text-[8.5px] font-bold tracking-[.07em] uppercase opacity-70">
                  {periodo.esExtra ? 'Extra' : `Chq ${periodo.numero}`}
                </div>
                <div className="mt-[1px] text-[12px] font-bold">
                  <Moneda centavos={libreporPeriodoCents[i]!} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const CHIPS = [
  { icono: '+', texto: 'Anotar' },
  { icono: '✓', texto: 'Pagué' },
  { icono: '◷', texto: 'Semana' },
] as const

export function MiSemana({ presupuesto }: { presupuesto: Presupuesto }) {
  const [pagados, setPagados] = useState<Record<string, boolean>>(
    Object.fromEntries(presupuesto.pagos.map((p) => [p.id, p.pagado])),
  )

  const hechos = presupuesto.pagos.filter((p) => pagados[p.id]).length

  return (
    <>
      <Hero presupuesto={presupuesto} />

      <div className="mt-[13px] mb-1 flex gap-[7px]">
        {CHIPS.map(({ icono, texto }) => (
          <button
            key={texto}
            type="button"
            className="bg-blanco border-linea flex min-h-11 flex-1 items-center justify-center gap-[5px] rounded-full border px-1 py-[9px] text-[11.5px] font-semibold"
          >
            <span className="bg-teal grid size-[17px] shrink-0 place-items-center rounded-full text-[10px] font-bold text-[#06322A]">
              {icono}
            </span>
            {texto}
          </button>
        ))}
      </div>

      <Seccion dato={`${hechos} de ${presupuesto.pagos.length} hechos`}>Pagos de esta semana</Seccion>
      <div className="flex flex-col gap-2">
        {presupuesto.pagos.map((pago) => {
          const pagado = pagados[pago.id] ?? false
          return (
            <Tarjeta key={pago.id}>
              <Fila
                izquierda={
                  <Casilla
                    marcada={pagado}
                    etiqueta={pago.nombre}
                    alCambiar={() => setPagados((p) => ({ ...p, [pago.id]: !pagado }))}
                  />
                }
                titulo={pago.nombre}
                detalle={
                  <>
                    {pagado ? `Venció el ${pago.diaVencimiento} · pagado` : `Vence el ${pago.diaVencimiento}`}
                    {pago.esEnfoque && !pagado && (
                      <>
                        {' · '}
                        <Etiqueta>enfoque</Etiqueta>
                      </>
                    )}
                  </>
                }
                derecha={
                  <span className={pagado ? 'text-texto-2 line-through' : undefined}>
                    <Moneda centavos={pago.montoCents} />
                  </span>
                }
              />
            </Tarjeta>
          )
        })}
      </div>

      <Seccion>Sobres de la semana</Seccion>
      <div className="flex flex-col gap-2">
        {presupuesto.sobres.map((sobre) => (
          <Sobre key={sobre.id} {...sobre} />
        ))}
      </div>
    </>
  )
}

function Sobre({
  nombre,
  gastadoCents,
  presupuestoCents,
}: {
  nombre: string
  gastadoCents: Centavos
  presupuestoCents: Centavos
}) {
  return (
    <div className="bg-blanco border-linea rounded-[13px] border px-[14px] py-3">
      <div className="mb-[9px] flex items-baseline justify-between">
        <div className="text-[14px] font-medium">{nombre}</div>
        <div className="text-texto-2 text-[12px]">
          <b className="text-texto text-[14px] font-semibold">
            <Moneda centavos={gastadoCents} />
          </b>{' '}
          de <Moneda centavos={presupuestoCents} />
        </div>
      </div>
      <Barra
        porcentaje={porcentaje(gastadoCents, presupuestoCents)}
        color={colorDeSobre(gastadoCents, presupuestoCents)}
      />
    </div>
  )
}
