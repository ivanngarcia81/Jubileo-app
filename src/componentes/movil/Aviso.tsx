import { IconoBateria, IconoSenal } from '../iconos'
import type { Presupuesto } from '../../datos/tipos'
import { type Centavos, centavos, suma } from '../../lib/dinero'
import { diaDe } from '../../lib/fecha'
import { Moneda } from '../base'

/**
 * El aviso de arranque de periodo.
 *
 * No es una pantalla de la app: es la notificación. Se construye aquí como
 * componente porque es la misma pieza que alimenta el correo y el push, y
 * porque conviene poder verla sin esperar al domingo. Vive en la ruta de
 * vista previa `#/aviso`, fuera de la navegación.
 *
 * El orden del contenido lo fija la sección 9 del SPEC y no se cambia:
 * cuánto entra y qué día, lo que vence dentro del periodo, los sobres
 * variables, y al final cuánto queda libre.
 */

function Notificacion({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-texto rounded-[17px] bg-white/95 px-[14px] py-[13px] shadow-[0_10px_26px_rgba(0,0,0,.3)]">
      {children}
    </div>
  )
}

function Encabezado({ cuando }: { cuando: string }) {
  return (
    <div className="mb-[9px] flex items-center gap-2">
      <div className="bg-carbon text-teal font-serif grid size-[19px] place-items-center rounded-[5px] text-menor">
        J
      </div>
      <div className="flex-1 text-rotulo font-bold tracking-[.03em] uppercase">Jubileo</div>
      <div className="text-texto-2 text-rotulo">{cuando}</div>
    </div>
  )
}

function Renglon({ texto, monto }: { texto: string; monto: Centavos }) {
  return (
    <li className="flex justify-between gap-[10px]">
      <span className="text-[#3E4342]">{texto}</span>
      <b className="font-semibold">
        <Moneda centavos={monto} />
      </b>
    </li>
  )
}

export function Aviso({ presupuesto }: { presupuesto: Presupuesto }) {
  const activo = presupuesto.periodos[presupuesto.periodoActivo]!
  const semana = presupuesto.semanas[presupuesto.semanaActiva]
  const pendientes = presupuesto.pagos.filter((p) => !p.pagado)
  const sobresTotal = centavos(suma(presupuesto.sobres.map((s) => s.presupuestoCents)))
  const libre = presupuesto.libreporPeriodoCents[presupuesto.periodoActivo]!

  return (
    <div className="flex min-h-dvh flex-col bg-[linear-gradient(170deg,#1C1E1F_0%,#31302B_58%,#4A4238_100%)] px-[15px] pt-4 pb-[22px] text-white">
      <div className="flex items-center justify-end gap-1 px-2 text-menor font-semibold">
        <IconoSenal tam={13} />
        <IconoBateria tam={15} />
        91%
      </div>

      <div className="mt-[26px] mb-6 text-center">
        <div className="text-menor text-[#C9CCCA]">domingo, 2 de agosto</div>
        <div className="font-serif text-heroe leading-none [font-variant-numeric:tabular-nums]">
          8:00
        </div>
      </div>

      <Notificacion>
        <Encabezado cuando="ahora" />
        <h4 className="mb-[2px] text-cuerpo font-semibold">Tu semana empieza mañana</h4>
        {semana && (
          <div className="text-texto-2 mb-[7px] text-rotulo">
            Semana {semana.numero} · del {diaDe(semana.fechaInicio)} al {diaDe(semana.fechaFin)}{' '}
            · presupuesto de <Moneda centavos={semana.totalCents} />
          </div>
        )}

        <ul className="list-none text-menor leading-[1.62]">
          <Renglon texto="Entra el lunes" monto={presupuesto.ingresoPorChequeCents} />
        </ul>

        <div className="bg-linea my-2 h-px" />
        <ul className="list-none text-menor leading-[1.62]">
          {pendientes.map((pago) => (
            <Renglon
              key={pago.id}
              texto={`${pago.nombre} · ${pago.esEnfoque ? 'pago extra el' : 'vence el'} ${pago.diaVencimiento}`}
              monto={pago.montoCents}
            />
          ))}
        </ul>

        <div className="bg-linea my-2 h-px" />
        <ul className="list-none text-menor leading-[1.62]">
          <Renglon
            texto={presupuesto.sobres.map((s) => s.nombre.toLowerCase()).join(', ')}
            monto={sobresTotal}
          />
        </ul>

        <div className="text-texto-2 mt-2 flex justify-between text-menor">
          <span>Te queda libre</span>
          <b className="text-teal-osc font-bold">
            <Moneda centavos={libre} />
          </b>
        </div>

        {/* Solo cuando la semana se aprieta: una alerta permanente no alerta. */}
        {semana?.apretada && (
          <div className="text-ambar mt-2 text-menor font-semibold">
            La semana se aprieta: se vence más de lo que habrá entrado. Mueve
            tus sobres a una semana con cheque.
          </div>
        )}
      </Notificacion>

      <div className="mt-[11px]">
        <Notificacion>
          <Encabezado cuando="dom pasado" />
          <h4 className="mb-[7px] text-cuerpo font-semibold">¿Cerramos la semana?</h4>
          <div className="text-texto-2 mt-[2px] flex justify-between text-menor">
            <span>3 preguntas · 30 segundos</span>
            <b className="text-teal-osc font-bold">Abrir</b>
          </div>
        </Notificacion>
      </div>

      <p className="mt-auto pt-8 text-center text-menor leading-[1.5] text-[#9AA09E]">
        El usuario ya sabe su semana sin abrir la app.
        <br />
        Entra solo a verificar.
      </p>

      <p className="sr-only">
        El aviso arranca el periodo del {diaDe(activo.fechaPago)}.
      </p>
    </div>
  )
}
