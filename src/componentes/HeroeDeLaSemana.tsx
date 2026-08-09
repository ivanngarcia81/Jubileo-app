import type { Presupuesto } from '../datos/tipos'
import { centavos, formatearRedondo, suma } from '../lib/dinero'
import { diaDe, mesDe } from '../lib/fecha'
import { Moneda } from './base'

/**
 * El héroe de la semana en curso: "te queda", el rango de días y el riel de
 * las semanas del mes.
 *
 * Vivía dentro de Mi semana, que era la pantalla de inicio. Cuando el Dashboard
 * tomó ese lugar, esta pieza fue lo único de aquella pantalla que se mudó
 * entera —el resto se repartió entre las tarjetas y el detalle de la semana—,
 * así que se quedó con archivo propio en vez de seguir colgando de una pantalla
 * que ya no existe.
 *
 * El número es lo que queda en los sobres de la semana **con su arrastre**: lo
 * que sobró de las anteriores viaja, y lo que se pasó también, en negativo.
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

/**
 * El héroe de la semana en curso. Vive aquí y lo usa también el Dashboard: es
 * la misma pieza, no una copia parecida — el día que "te queda" cambie de
 * cuenta, tiene que cambiar en los dos sitios a la vez.
 */
export function Hero({ presupuesto }: { presupuesto: Presupuesto }) {
  const { semanas, semanaActiva, sobres } = presupuesto
  const semana = semanas[semanaActiva]
  // Lo que queda en los sobres de la semana: el presupuesto ya trae el
  // arrastre de las semanas anteriores, en positivo y en negativo.
  const disponible = centavos(
    suma(sobres.map((s) => centavos(s.presupuestoCents - s.gastadoCents))),
  )

  return (
    <div className="relative overflow-hidden rounded-card bg-[linear-gradient(152deg,var(--color-teal-hondo)_0%,var(--color-teal)_100%)] px-[18px] pt-[17px] pb-4 text-tinta-heroe">
      <div className="absolute -right-10 -bottom-14 size-[150px] rounded-chip bg-white/[.12]" />
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
                className={`flex-1 rounded-btn px-[5px] py-[6px] text-center ${fondo}`}
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
