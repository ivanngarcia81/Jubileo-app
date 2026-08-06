import { useMemo } from 'react'
import { MES_DEL_EJEMPLO, hoy, mesActual, usaServidor } from './datos/fuente'
import type { Pago, Presupuesto } from './datos/tipos'
import { usarPresupuesto } from './datos/usarPresupuesto'
import { usarSesion } from './datos/usarSesion'
import { Entrar } from './componentes/Entrar'
import { PrimerMes } from './componentes/PrimerMes'
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
import { type Centavos, centavos, suma } from './lib/dinero'
import { fecha } from './lib/fecha'
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

/** Lo que la pantalla puede escribir. Ausente con datos de ejemplo. */
interface Acciones {
  alPonerMonto?: (categoriaId: string, montoCents: Centavos) => Promise<void>
  alAnotar?: (categoriaId: string, montoCents: Centavos, descripcion: string) => Promise<void>
  alMarcarPago?: (pago: Pago) => Promise<void>
}

function Contenido({
  ruta,
  presupuesto,
  acciones,
}: {
  ruta: Ruta
  presupuesto: Presupuesto
  acciones: Acciones
}) {
  const { alPonerMonto, alAnotar, alMarcarPago } = acciones
  switch (ruta) {
    case 'mes':
      return <ElMes presupuesto={presupuesto} {...(alPonerMonto ? { alPonerMonto } : {})} />
    case 'deudas':
      return <Deudas presupuesto={presupuesto} />
    case 'metas':
      return <Metas presupuesto={presupuesto} />
    default:
      return (
        <MiSemana
          presupuesto={presupuesto}
          {...(alAnotar ? { alAnotar } : {})}
          {...(alMarcarPago ? { alMarcarPago } : {})}
        />
      )
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

/** Un mes que todavía no llega, o que no se pudo traer. */
function Mensaje({ titulo, cuerpo }: { titulo: string; cuerpo?: string }) {
  return (
    <main className="bg-gris text-texto font-sans grid min-h-dvh place-items-center p-gap">
      <div className="max-w-[38ch] text-center">
        <h1 className="font-serif text-h1">{titulo}</h1>
        {cuerpo && <p className="text-texto-2 text-dato mt-2 leading-[1.6]">{cuerpo}</p>}
      </div>
    </main>
  )
}

export function App() {
  const sesion = usarSesion()
  const [ruta, ir] = useRuta()

  // Sin servidor, la app enseña el mes del ejemplo. Con servidor, el mes en el
  // que está parado el usuario.
  const mes = useMemo(() => (usaServidor() ? mesActual() : MES_DEL_EJEMPLO), [])
  const usuarioId = sesion.estado === 'dentro' ? sesion.usuarioId : null
  const fuente = usarPresupuesto(mes, usuarioId)

  if (sesion.estado === 'cargando') return <Mensaje titulo="Un momento…" />
  // La configuración existe pero está mal puesta. Se dice aquí, con lo que hay
  // que hacer, en vez de dejar que reviente al mandar el correo.
  if (sesion.estado === 'mal_configurado')
    return <Mensaje titulo="La app no está bien conectada" cuerpo={sesion.motivo} />
  if (sesion.estado === 'fuera') return <Entrar />

  if (fuente.estado === 'cargando') return <Mensaje titulo="Un momento…" />
  if (fuente.estado === 'error')
    return <Mensaje titulo="No pudimos traer tu mes" cuerpo={fuente.mensaje} />

  // Cuenta nueva: todavía no hay mes. No es un error, es el principio.
  if (fuente.estado === 'sin_mes') {
    return (
      <PrimerMes
        mes={mes}
        alArmar={async (datos) => {
          const { armarPrimerMes } = await import('./servidor/repositorios/arranque')
          await armarPrimerMes(usuarioId!, mes, {
            frecuencia: datos.frecuencia,
            fechaAncla: fecha(datos.fechaAncla),
            diasPago: datos.diasPago,
            ingresoEsperadoCents:
              datos.ingresoEsperadoCents === null ? null : centavos(datos.ingresoEsperadoCents),
          })
          fuente.recargar()
        }}
      />
    )
  }

  const presupuesto = fuente.presupuesto

  // El aviso no es una pantalla de la app: es la notificación. Se ve entera,
  // sin barra ni navegación.
  if (ruta === 'aviso') return <Aviso presupuesto={presupuesto} />

  const enMovil = rutaMovil(ruta)
  const enEscritorio = rutaEscritorio(ruta)

  // Con datos de ejemplo no hay dónde guardar, y sin `mesId` tampoco: la
  // pantalla se ve igual pero sin botones que prometan algo que no pasa.
  const mesId = presupuesto.mesId
  const alPonerMonto = mesId
    ? async (categoriaId: string, montoCents: Centavos) => {
        const { ponerMontoMensual } = await import('./servidor/repositorios/presupuestar')
        await ponerMontoMensual(mesId, categoriaId, montoCents)
        fuente.recargar()
      }
    : undefined

  // Anotar cuelga del cheque en curso, no del mes: es lo que hace que un gasto
  // de hoy baje el dinero de esta semana.
  const puedeAnotar = presupuesto.hogarId && presupuesto.periodoActivoId && usuarioId
  const alAnotar = puedeAnotar
    ? async (categoriaId: string, montoCents: Centavos, descripcion: string) => {
        const { anotarGasto } = await import('./servidor/repositorios/anotar')
        await anotarGasto({
          hogarId: presupuesto.hogarId!,
          usuarioId,
          periodoId: presupuesto.periodoActivoId!,
          categoriaId,
          fecha: hoy(),
          montoCents,
          descripcion,
        })
        fuente.recargar()
      }
    : undefined

  // Marcar un pago es anotar el gasto completo; desmarcarlo es borrarlo.
  const alMarcarPago = puedeAnotar
    ? async (pago: Pago) => {
        const { anotarGasto, borrarMovimiento } = await import('./servidor/repositorios/anotar')
        if (pago.transaccionId) {
          await borrarMovimiento(pago.transaccionId)
        } else {
          await anotarGasto({
            hogarId: presupuesto.hogarId!,
            usuarioId,
            periodoId: presupuesto.periodoActivoId!,
            categoriaId: pago.id,
            fecha: hoy(),
            montoCents: pago.montoCents,
            descripcion: pago.nombre,
          })
        }
        fuente.recargar()
      }
    : undefined

  const acciones: Acciones = {
    ...(alPonerMonto ? { alPonerMonto } : {}),
    ...(alAnotar ? { alAnotar } : {}),
    ...(alMarcarPago ? { alMarcarPago } : {}),
  }

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
          <Contenido ruta={enMovil} presupuesto={presupuesto} acciones={acciones} />
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
              <Contenido ruta={enEscritorio} presupuesto={presupuesto} acciones={acciones} />
            )}
          </div>
        )}
      </div>
    </>
  )
}
