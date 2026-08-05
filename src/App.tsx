import { PRESUPUESTO_EJEMPLO } from './datos/ejemplo'
import type { Presupuesto } from './datos/tipos'
import { BandaIndicadores, BarraSuperior, TarjetaEscritorio } from './componentes/escritorio/Panel'
import { Resumen } from './componentes/escritorio/Resumen'
import { Aviso } from './componentes/movil/Aviso'
import { Deudas } from './componentes/movil/Deudas'
import { ElMes } from './componentes/movil/ElMes'
import { Cabecera, Marco } from './componentes/movil/Marco'
import { Metas } from './componentes/movil/Metas'
import { MiSemana } from './componentes/movil/MiSemana'
import { mesYAnio } from './componentes/textos'
import { simular } from './lib/deudas'
import { centavos, suma } from './lib/dinero'
import { type Ruta, rutaEscritorio, rutaMovil, useRuta } from './rutas'

/**
 * Un solo frontend responsivo para computadora y teléfono, como pide la
 * sección 4 del SPEC. Por debajo del ancho de escritorio manda el diseño de
 * `design/movil.html`; por encima, el de `design/escritorio.html`.
 */

function cabeceraDe(ruta: Ruta, presupuesto: Presupuesto, ir: (r: Ruta) => void) {
  const pendientes = presupuesto.deudas.filter((d) => d.saldoCents > 0).length

  switch (ruta) {
    case 'mes':
      return (
        <Cabecera
          avatar="◀"
          alTocarAvatar={() => ir('semana')}
          titulo={presupuesto.mes.etiqueta}
          subtitulo={`${presupuesto.usuario.frecuencia} · ${presupuesto.periodos.length} cheques`}
          accion="✎"
        />
      )
    case 'deudas':
      return (
        <Cabecera
          avatar="↓"
          titulo="Salir de deudas"
          subtitulo={`${pendientes} deudas pendientes`}
          accion="⋯"
        />
      )
    case 'metas':
      return (
        <Cabecera
          avatar="◍"
          titulo="Tus metas"
          subtitulo={`${presupuesto.fondos.length} fondos de reserva`}
          accion="⋯"
        />
      )
    default:
      return (
        <Cabecera
          avatar={presupuesto.usuario.iniciales}
          titulo={`Buenos días, ${presupuesto.usuario.nombre}`}
          subtitulo={presupuesto.usuario.nivel === 'premium' ? 'Cuenta Premium' : 'Cuenta gratis'}
          accion="◔"
          conAviso
        />
      )
  }
}

function Contenido({ ruta, presupuesto }: { ruta: Ruta; presupuesto: Presupuesto }) {
  switch (ruta) {
    case 'mes':
      return <ElMes presupuesto={presupuesto} />
    case 'deudas':
      return <Deudas presupuesto={presupuesto} />
    case 'metas':
      return <Metas presupuesto={presupuesto} />
    default:
      return <MiSemana presupuesto={presupuesto} />
  }
}

function Ajustes() {
  return (
    <TarjetaEscritorio icono="⚙" titulo="Ajustes">
      <p className="text-texto-2 text-[13px] leading-[1.6]">
        Aquí va el control para cambiar tu frecuencia de pago, la hora y el canal de tu aviso, y tu
        membresía. Todavía no está construido.
      </p>
    </TarjetaEscritorio>
  )
}

export function App() {
  const presupuesto = PRESUPUESTO_EJEMPLO
  const [ruta, ir] = useRuta()

  // El aviso no es una pantalla de la app: es la notificación. Se ve entera,
  // sin barra ni navegación.
  if (ruta === 'aviso') return <Aviso presupuesto={presupuesto} />

  const enMovil = rutaMovil(ruta)
  const enEscritorio = rutaEscritorio(ruta)

  const extraActual = centavos(
    suma(presupuesto.deudas.map((d) => d.pagoActualCents)) -
      suma(presupuesto.deudas.map((d) => d.pagoMinimoCents)),
  )
  const plan = simular(presupuesto.deudas, extraActual, presupuesto.inicioDeudas)
  const fechaLibertad = plan.fechaLibertad ? mesYAnio(plan.fechaLibertad) : 'sin fecha'

  return (
    <>
      <div className="lg:hidden">
        <Marco cabecera={cabeceraDe(enMovil, presupuesto, ir)} activa={enMovil} ir={ir}>
          <Contenido ruta={enMovil} presupuesto={presupuesto} />
        </Marco>
      </div>

      <div className="bg-gris text-texto font-sans hidden min-h-dvh lg:block">
        <BarraSuperior presupuesto={presupuesto} activa={enEscritorio} ir={ir} />
        <BandaIndicadores presupuesto={presupuesto} fechaLibertad={fechaLibertad} />

        {enEscritorio === 'resumen' ? (
          <Resumen presupuesto={presupuesto} />
        ) : (
          <div className="mx-auto max-w-[720px] p-[22px]">
            {enEscritorio === 'ajustes' ? (
              <Ajustes />
            ) : (
              <Contenido ruta={enEscritorio} presupuesto={presupuesto} />
            )}
          </div>
        )}
      </div>
    </>
  )
}
