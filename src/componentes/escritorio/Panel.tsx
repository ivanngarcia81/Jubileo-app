import type { ReactNode } from 'react'
import { IconoAviso, IconoBuscar } from '../iconos'
import type { Presupuesto } from '../../datos/tipos'
import { type Centavos, formatearRedondo } from '../../lib/dinero'
import { diaDe, mesDe } from '../../lib/fecha'
import type { Ruta } from '../../rutas'
import { Moneda } from '../base'
import { nombreDeMes } from '../textos'

/** Todo lo que tiene una línea en el presupuesto del mes. */
function contarCategorias(p: Presupuesto): number {
  return 1 + p.fijos.length + p.sobres.length + p.fondos.length + p.deudas.length
}

/**
 * La carcasa del panel de computadora: barra carbón arriba y banda oscura de
 * indicadores con los cheques del mes a la derecha, tal como
 * `design/escritorio.html`. El mockup la dibuja dentro de una ventana con
 * esquinas redondeadas porque es un documento de presentación; en la app la
 * carcasa es la página.
 */

const ENLACES: readonly { ruta: Ruta; texto: string }[] = [
  { ruta: 'resumen', texto: 'Resumen' },
  { ruta: 'mes', texto: 'Presupuesto' },
  { ruta: 'deudas', texto: 'Deudas' },
  { ruta: 'metas', texto: 'Metas' },
  { ruta: 'ajustes', texto: 'Ajustes' },
]

export function BarraSuperior({
  presupuesto,
  activa,
  ir,
}: {
  presupuesto: Presupuesto
  activa: Ruta
  ir: (ruta: Ruta) => void
}) {
  return (
    <div className="bg-carbon flex items-center gap-[26px] border-b border-[#262A2B] px-[26px] py-[17px] text-white">
      <div className="font-serif flex items-center gap-2 text-[21px]">
        Jubileo<span className="text-teal">.</span>
      </div>
      <nav aria-label="Navegación principal" className="flex gap-5 text-[13.5px]">
        {ENLACES.map(({ ruta, texto }) => {
          const activo = ruta === activa
          return (
            <button
              key={ruta}
              type="button"
              onClick={() => ir(ruta)}
              aria-current={activo ? 'page' : undefined}
              className={`relative py-1 ${activo ? 'font-semibold text-white' : 'text-[#787E7D]'}`}
            >
              {texto}
              {activo && <span className="bg-teal absolute -bottom-[19px] right-0 left-0 h-[2px]" />}
            </button>
          )
        })}
      </nav>
      <div className="ml-auto flex items-center gap-[9px]">
        <div className="bg-carbon-2 hidden min-w-[250px] items-center gap-[9px] rounded-full px-4 py-[9px] text-[13px] text-[#787E7D] panel:flex">
          <IconoBuscar tam={16} />
          <span>Buscar gasto, categoría, deuda…</span>
        </div>
        <div className="bg-carbon-2 relative grid size-[35px] place-items-center rounded-full text-[13px] text-[#A7ACAB]">
          <IconoAviso tam={17} />
          <span className="bg-teal border-carbon-2 absolute top-[7px] right-2 size-[7px] rounded-full border-[1.5px]" />
        </div>
        <div className="bg-carbon-3 grid size-[35px] place-items-center rounded-full text-[11.5px] font-semibold text-white">
          {presupuesto.usuario.iniciales}
        </div>
      </div>
    </div>
  )
}

function Indicador({
  titulo,
  valor,
  detalle,
  teal = false,
}: {
  titulo: string
  valor: Centavos
  detalle: ReactNode
  teal?: boolean
}) {
  return (
    <div>
      <div className="text-[12px] text-[#787E7D]">{titulo}</div>
      <div
        className={`mt-[3px] text-[29px] font-semibold [font-variant-numeric:tabular-nums] ${teal ? 'text-teal' : ''}`}
      >
        {formatearRedondo(valor)}
      </div>
      <div className="mt-1 text-[11.5px] text-[#6E7473]">{detalle}</div>
    </div>
  )
}

export function BandaIndicadores({
  presupuesto,
  fechaLibertad,
}: {
  presupuesto: Presupuesto
  fechaLibertad: string
}) {
  const { periodos, periodoActivo, libreporPeriodoCents } = presupuesto
  const hayExtra = periodos.some((p) => p.esExtra)

  return (
    <div
      className="bg-carbon grid items-center gap-[34px] px-[26px] pt-[26px] pb-[30px] text-white ancho:grid-cols-[1fr_500px]"
      style={{
        background:
          'radial-gradient(900px 320px at 88% 120%, rgba(18,194,160,.14), transparent 70%), var(--carbon)',
      }}
    >
      <div>
        <div className="font-serif mb-5 text-[26px]">
          Buenos días, {presupuesto.usuario.nombre}
          <span className="text-teal">.</span>
          <div className="font-sans mt-[5px] text-[11px] font-semibold tracking-[.14em] text-[#787E7D] uppercase">
            {presupuesto.mes.etiqueta} · {presupuesto.usuario.frecuencia.toLowerCase()} ·{' '}
            {presupuesto.usuario.nivel === 'premium' ? 'Premium' : 'Gratis'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-[30px] gap-y-[22px]">
          <Indicador
            titulo="Entra este mes"
            valor={presupuesto.entraCents}
            detalle={
              <>
                {periodos.length} cheques ·{' '}
                <b className="text-teal font-semibold">{presupuesto.variacionEntra}</b> vs julio
              </>
            }
          />
          <Indicador
            titulo="Sale este mes"
            valor={presupuesto.saleCents}
            detalle={
              <>
                {contarCategorias(presupuesto)} categorías ·{' '}
                <b className="text-ambar font-semibold">{presupuesto.variacionSale}</b> vs julio
              </>
            }
          />
          <Indicador
            titulo="Sin repartir"
            valor={presupuesto.sinRepartirCents}
            teal
            detalle={
              presupuesto.sinRepartirCents === 0
                ? 'Tu presupuesto cuadra'
                : 'Te falta repartir este dinero'
            }
          />
          <Indicador
            titulo="A la deuda este mes"
            valor={presupuesto.aLaDeudaCents}
            detalle={
              <>
                Fecha de libertad: <b className="text-teal font-semibold">{fechaLibertad}</b>
              </>
            }
          />
        </div>
      </div>

      <div>
        <div className="mb-[10px] text-[10px] font-semibold tracking-[.14em] text-[#787E7D] uppercase">
          Tus cheques de {nombreDeMes(presupuesto.mes.mes)}
        </div>
        <div className="grid grid-cols-3 gap-[10px]">
          {periodos.map((periodo, i) => {
            const esActivo = i === periodoActivo
            const cerrado = i < periodoActivo
            return (
              <div
                key={periodo.numero}
                className={`relative overflow-hidden rounded-[14px] p-[14px] ${
                  periodo.esExtra
                    ? 'border-ambar border-[1.5px] border-dashed'
                    : esActivo
                      ? 'bg-[linear-gradient(150deg,#0A847F,#0ABBB4)] text-[#022B29]'
                      : 'bg-carbon-2'
                } ${cerrado ? 'opacity-55' : ''}`}
              >
                <div
                  className={`text-[9.5px] font-semibold tracking-[.1em] uppercase ${
                    esActivo && !periodo.esExtra ? 'text-[#022B29]/70' : 'text-[#787E7D]'
                  }`}
                >
                  {periodo.esExtra ? 'Extra' : `Cheque ${periodo.numero}`} ·{' '}
                  {diaDe(periodo.fechaPago)} {nombreDeMes(mesDe(periodo.fechaPago)).slice(0, 3)}
                </div>
                <div
                  className={`font-serif mt-[6px] mb-[2px] text-[28px] leading-[1.1] [font-variant-numeric:tabular-nums] ${
                    periodo.esExtra ? 'text-ambar' : ''
                  }`}
                >
                  {formatearRedondo(libreporPeriodoCents[i]!)}
                </div>
                <div
                  className={`text-[10.5px] leading-[1.35] ${
                    esActivo && !periodo.esExtra ? 'text-[#022B29]/70' : 'text-[#787E7D]'
                  }`}
                >
                  {periodo.esExtra ? 'Tercer cheque' : cerrado ? 'Repartido y cerrado' : 'Te queda libre'}
                </div>
              </div>
            )
          })}
        </div>
        {hayExtra && (
          <div className="mt-[10px] text-[11px] text-[#787E7D]">
            Este mes te caen <b className="text-ambar font-semibold">{periodos.length} cheques</b>.
            El extra no se reparte en categorías: va completo a{' '}
            {presupuesto.deudas.find((d) => d.esEnfoque)?.nombre ?? 'tu fondo de emergencia'}.
          </div>
        )}
      </div>
    </div>
  )
}

export function TarjetaEscritorio({
  icono,
  titulo,
  derecha,
  children,
  className = '',
}: {
  icono: ReactNode
  titulo: string
  derecha?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`bg-blanco border-linea rounded-[15px] border p-[18px] ${className}`}>
      <div className="mb-[15px] flex items-center gap-[10px]">
        <div className="bg-carbon text-teal font-serif grid size-7 shrink-0 place-items-center rounded-[9px] text-[14px]">
          {icono}
        </div>
        <h3 className="font-serif flex-1 text-[17px] font-normal">{titulo}</h3>
        {derecha}
      </div>
      {children}
    </section>
  )
}

export function BloqueMoneda({ centavos: monto }: { centavos: Centavos }) {
  return <Moneda centavos={monto} />
}
