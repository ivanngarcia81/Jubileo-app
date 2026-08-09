import { IconoAnotar, IconoDinero, IconoMovimientos, IconoPalomita, IconoReloj } from '../iconos'
import { useState } from 'react'
import type { Pago, Presupuesto } from '../../datos/tipos'
import { type Centavos, centavos, formatearRedondo, suma } from '../../lib/dinero'
import { diaDe, mesDe } from '../../lib/fecha'
import {
  CeldaCifra,
  CeldaNombre,
  CeldasDeAvance,
  Casilla,
  ChipCategoria,
  Fila,
  ListaSeccion,
  Moneda,
  Vacio,
} from '../base'
import { Anotar } from './Anotar'
import { CerrarSemana, type RespuestaCierre } from './CerrarSemana'

/**
 * Mi semana — la pantalla de inicio, anclada a la semana del mes.
 *
 * Un solo número grande: lo que queda en los sobres de la semana en curso, con
 * el arrastre de las anteriores. El riel de semanas vive dentro del héroe, y
 * los chips de acción quedan en la zona del pulgar. El cheque ya no manda
 * aquí: quedó de lente en El mes y de regla al cerrar la semana.
 */

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
  const { semanas, semanaActiva, sobres } = presupuesto
  const semana = semanas[semanaActiva]
  // Lo que queda en los sobres de la semana: el presupuesto ya trae el
  // arrastre de las semanas anteriores, en positivo y en negativo.
  const disponible = centavos(
    suma(sobres.map((s) => centavos(s.presupuestoCents - s.gastadoCents))),
  )

  return (
    <div className="relative overflow-hidden rounded-[19px] bg-[linear-gradient(152deg,var(--color-teal-hondo)_0%,var(--color-teal)_100%)] px-[18px] pt-[17px] pb-4 text-tinta-heroe">
      <div className="absolute -right-10 -bottom-14 size-[150px] rounded-full bg-white/[.12]" />
      <div className="relative">
        <div className="text-rotulo font-bold tracking-[.12em] text-tinta-heroe/60 uppercase">
          Te queda esta semana
        </div>
        <div className="font-serif mt-[6px] mb-[3px] text-heroe leading-none [font-variant-numeric:tabular-nums]">
          {formatearRedondo(disponible)}
        </div>
        <div className="text-menor text-tinta-heroe/75">
          {semana
            ? `Semana ${semana.numero} · del ${diaDe(semana.fechaInicio)} al ${diaDe(semana.fechaFin)} de ${MESES[mesDe(semana.fechaInicio) - 1]}`
            : 'Sin semanas todavía'}
        </div>

        <div className="mt-[14px] flex gap-[5px]">
          {semanas.map((s, i) => {
            const esActiva = i === semanaActiva
            const fondo = esActiva ? 'bg-white/[.94]' : 'bg-white/[.28]'
            return (
              <div
                key={s.numero}
                className={`flex-1 rounded-[8px] px-[5px] py-[6px] text-center ${fondo}`}
              >
                {/* La bandera de apretada vive en El mes, con espacio para
                    explicarse: aquí un signo suelto solo asustaría. */}
                <div className="text-rotulo font-bold tracking-[.07em] uppercase opacity-70">
                  Sem {s.numero}
                </div>
                <div className="mt-[1px] text-menor font-bold">
                  <Moneda centavos={s.totalCents} />
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
  columnas: 'minmax(0,1fr) 36px 84px',
  columnasPanel: 'minmax(150px,1fr) 88px minmax(90px,300px) 88px',
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
  alVerMovimientos,
}: {
  presupuesto: Presupuesto
  /** Ausentes con los datos de ejemplo: la demostración se ve pero no se toca. */
  alAnotar?: (categoriaId: string, montoCents: Centavos, descripcion: string) => Promise<void>
  alMarcarPago?: (pago: Pago) => Promise<void>
  alCerrarSemana?: (r: RespuestaCierre) => Promise<void>
  /** En el teléfono, Movimientos no está en la píldora: se llega desde aquí. */
  alVerMovimientos?: () => void
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
            className="bg-blanco border-linea flex min-h-11 flex-1 items-center justify-center gap-[5px] rounded-full border px-1 py-[9px] text-menor font-semibold disabled:opacity-50"
          >
            {/* El círculo sube a 20 y el icono baja a 12: a 15 dentro de 17
                quedaba pegado al borde por los cuatro lados. */}
            <span className="bg-teal grid size-[20px] shrink-0 place-items-center rounded-full text-tinta-teal">
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
        {presupuesto.pagos.length === 0 && (
          <Vacio>
            Ningún pago vence en esta semana. Los gastos fijos con día de
            vencimiento aparecen aquí la semana que les toca.
          </Vacio>
        )}
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
                        <ChipCategoria tono="teal">enfoque</ChipCategoria>
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
        encabezadosPanel={['Sobre', 'Gastado', null, 'De la semana']}
        className="mt-3"
        {...SOBRES}
      >
        {presupuesto.sobres.length === 0 && (
          <Vacio>
            Todavía no tienes sobres. Ve a Presupuesto mensual y reparte tus semanas: ahí es
            donde el dinero recibe su trabajo.
          </Vacio>
        )}
        {presupuesto.sobres.map((sobre) => (
          <Sobre key={sobre.id} {...sobre} />
        ))}
      </ListaSeccion>
      {alVerMovimientos && (
        <button
          type="button"
          onClick={alVerMovimientos}
          className="bg-blanco border-linea text-texto mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[15px] border text-menor font-semibold"
        >
          <IconoMovimientos tam={15} />
          Ver todos los movimientos
        </button>
      )}

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
      <CeldasDeAvance gastadoCents={gastadoCents} delMesCents={presupuestoCents} />
    </Fila>
  )
}
