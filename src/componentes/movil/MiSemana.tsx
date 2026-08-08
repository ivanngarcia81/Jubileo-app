import { IconoAnotar, IconoDinero, IconoPalomita, IconoReloj } from '../iconos'
import { useState } from 'react'
import type { Pago, Presupuesto } from '../../datos/tipos'
import { type Centavos, formatearRedondo } from '../../lib/dinero'
import { diaDe, mesDe } from '../../lib/fecha'
import {
  Barra,
  CeldaCifra,
  CeldaNombre,
  Casilla,
  Etiqueta,
  Fila,
  ListaSeccion,
  Moneda,
  colorDeSobre,
  porcentaje,
} from '../base'
import { Anotar } from './Anotar'
import { CerrarSemana, type RespuestaCierre } from './CerrarSemana'

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
    <div className="relative overflow-hidden rounded-[19px] bg-[linear-gradient(152deg,#0A847F_0%,#0ABBB4_100%)] px-[18px] pt-[17px] pb-4 text-[#022B29]">
      <div className="absolute -right-10 -bottom-14 size-[150px] rounded-full bg-white/[.12]" />
      <div className="relative">
        <div className="text-[10.5px] font-bold tracking-[.12em] text-[#022B29]/60 uppercase">
          Te queda esta semana
        </div>
        <div className="font-serif mt-[6px] mb-[3px] text-[52px] leading-none [font-variant-numeric:tabular-nums]">
          {formatearRedondo(disponible)}
        </div>
        <div className="text-[12px] text-[#022B29]/75">
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

/** Las columnas de las dos listas. Ver el comentario de `ListaSeccion`. */
const PAGOS = { columnas: '21px minmax(0,1fr) 84px', columnasPanel: '21px minmax(150px,1fr) 120px' }
const SOBRES = {
  columnas: 'minmax(0,1fr) 44px 84px',
  columnasPanel: 'minmax(150px,1fr) minmax(90px,300px) 140px',
}

const CHIPS = [
  { Icono: IconoAnotar, texto: 'Anotar' },
  { Icono: IconoPalomita, texto: 'Pagué' },
  { Icono: IconoReloj, texto: 'Semana' },
] as const

export function MiSemana({
  presupuesto,
  alAnotar,
  alMarcarPago,
  alCerrarSemana,
}: {
  presupuesto: Presupuesto
  /** Ausentes con los datos de ejemplo: la demostración se ve pero no se toca. */
  alAnotar?: (categoriaId: string, montoCents: Centavos, descripcion: string) => Promise<void>
  alMarcarPago?: (pago: Pago) => Promise<void>
  alCerrarSemana?: (r: RespuestaCierre) => Promise<void>
}) {
  const [anotando, setAnotando] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  // Cuál casilla está esperando al servidor. Se marca al volver, no al tocar:
  // una palomita que aparece y se deshace sola es peor que una que tarda.
  const [ocupado, setOcupado] = useState<string | null>(null)

  const hechos = presupuesto.pagos.filter((p) => p.pagado).length

  return (
    <>
      <Hero presupuesto={presupuesto} />

      <div className="mt-[13px] mb-1 flex gap-[7px]">
        {CHIPS.map(({ Icono, texto }) => (
          <button
            key={texto}
            type="button"
            onClick={
              texto === 'Anotar' && alAnotar
                ? () => setAnotando(true)
                : texto === 'Semana' && alCerrarSemana
                  ? () => setCerrando(true)
                  : undefined
            }
            disabled={
              (texto === 'Anotar' && !alAnotar) || (texto === 'Semana' && !alCerrarSemana)
            }
            className="bg-blanco border-linea flex min-h-11 flex-1 items-center justify-center gap-[5px] rounded-full border px-1 py-[9px] text-[11.5px] font-semibold disabled:opacity-50"
          >
            {/* El círculo sube a 20 y el icono baja a 12: a 15 dentro de 17
                quedaba pegado al borde por los cuatro lados. */}
            <span className="bg-teal grid size-[20px] shrink-0 place-items-center rounded-full text-[#043432]">
              <Icono tam={12} />
            </span>
            {texto}
          </button>
        ))}
      </div>

      <ListaSeccion
        titulo="Pagos de esta semana"
        icono={<IconoPalomita tam={15} />}
        dato={`${hechos} de ${presupuesto.pagos.length} hechos`}
        encabezados={[null, 'Pago', 'Monto']}
        className="mt-3"
        {...PAGOS}
      >
        {presupuesto.pagos.map((pago) => {
          const pagado = pago.pagado
          return (
            <Fila key={pago.id}>
              <Casilla
                marcada={pagado}
                etiqueta={pago.nombre}
                ocupada={ocupado === pago.id}
                alCambiar={
                  alMarcarPago
                    ? () => {
                        setOcupado(pago.id)
                        void alMarcarPago(pago).finally(() => setOcupado(null))
                      }
                    : undefined
                }
              />
              <CeldaNombre
                detalle={
                  <>
                    {pagado
                      ? `Venció el ${pago.diaVencimiento} · pagado`
                      : `Vence el ${pago.diaVencimiento}`}
                    {pago.esEnfoque && !pagado && (
                      <>
                        {' · '}
                        <Etiqueta>enfoque</Etiqueta>
                      </>
                    )}
                  </>
                }
              >
                {pago.nombre}
              </CeldaNombre>
              <CeldaCifra className={pagado ? 'text-texto-2 line-through' : ''}>
                <Moneda centavos={pago.montoCents} />
              </CeldaCifra>
            </Fila>
          )
        })}
      </ListaSeccion>

      <ListaSeccion
        titulo="Sobres de la semana"
        icono={<IconoDinero tam={15} />}
        encabezados={['Sobre', null, 'Gastado']}
        className="mt-3"
        {...SOBRES}
      >
        {presupuesto.sobres.map((sobre) => (
          <Sobre key={sobre.id} {...sobre} />
        ))}
      </ListaSeccion>
      {cerrando && alCerrarSemana && (
        <CerrarSemana
          presupuesto={presupuesto}
          alCerrarSemana={alCerrarSemana}
          alCerrar={() => setCerrando(false)}
        />
      )}

      {anotando && alAnotar && (
        <Anotar
          presupuesto={presupuesto}
          alAnotar={alAnotar}
          alCerrar={() => setAnotando(false)}
        />
      )}
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
    <Fila>
      <CeldaNombre>{nombre}</CeldaNombre>
      <Barra
        porcentaje={porcentaje(gastadoCents, presupuestoCents)}
        color={colorDeSobre(gastadoCents, presupuestoCents)}
      />
      <CeldaCifra>
        <Moneda centavos={gastadoCents} />
        <div className="text-texto-2 text-[11px] font-normal">
          de <Moneda centavos={presupuestoCents} />
        </div>
      </CeldaCifra>
    </Fila>
  )
}
