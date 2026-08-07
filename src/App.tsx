import { useMemo } from 'react'
import { MES_DEL_EJEMPLO, hoy, mesActual, usaServidor } from './datos/fuente'
import type { Pago, Presupuesto } from './datos/tipos'
import { usarPresupuesto } from './datos/usarPresupuesto'
import { usarSesion } from './datos/usarSesion'
import { Entrar } from './componentes/Entrar'
import { Membresia } from './componentes/Membresia'
import { Onboarding } from './componentes/Onboarding'
import { PrimerMes } from './componentes/PrimerMes'
import { BandaIndicadores, BarraSuperior, TarjetaEscritorio } from './componentes/escritorio/Panel'
import { Resumen } from './componentes/escritorio/Resumen'
import { Aviso } from './componentes/movil/Aviso'
import { Deudas } from './componentes/movil/Deudas'
import { ElMes } from './componentes/movil/ElMes'
import { Cabecera, Marco } from './componentes/movil/Marco'
import { Metas } from './componentes/movil/Metas'
import type { RespuestaCierre } from './componentes/movil/CerrarSemana'
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
  alRenombrar?: (categoriaId: string, nombre: string) => Promise<void>
  alQuitar?: (categoriaId: string) => Promise<void>
  alCrearCategoria?: (
    grupo: 'fijo' | 'variable',
    nombre: string,
    diaVencimiento: number | undefined,
  ) => Promise<void>
  alAnotar?: (categoriaId: string, montoCents: Centavos, descripcion: string) => Promise<void>
  alMarcarPago?: (pago: Pago) => Promise<void>
  alCerrarSemana?: (r: RespuestaCierre) => Promise<void>
  alCrearDeuda?: (
    nombre: string,
    saldoCents: Centavos,
    pagoMinimoCents: Centavos,
    tasa: number | null,
  ) => Promise<void>
  alGuardarSaldo?: (
    deudaId: string,
    saldoCents: Centavos,
    saldoInicialCents: Centavos,
  ) => Promise<void>
  alEnfocar?: (deudaId: string) => Promise<void>
  alBorrarDeuda?: (deudaId: string) => Promise<void>
  alCrearFondo?: (
    nombre: string,
    metaCents: Centavos,
    acumuladoCents: Centavos,
    fechaObjetivo: string | null,
  ) => Promise<void>
  alGuardarAcumulado?: (fondoId: string, acumuladoCents: Centavos) => Promise<void>
  alBorrarFondo?: (fondoId: string) => Promise<void>
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
  const {
    alPonerMonto,
    alRenombrar,
    alQuitar,
    alCrearCategoria,
    alAnotar,
    alMarcarPago,
    alCerrarSemana,
    alCrearDeuda,
    alGuardarSaldo,
    alEnfocar,
    alBorrarDeuda,
    alCrearFondo,
    alGuardarAcumulado,
    alBorrarFondo,
  } = acciones
  switch (ruta) {
    case 'mes':
      return (
        <ElMes
          presupuesto={presupuesto}
          {...(alPonerMonto ? { alPonerMonto } : {})}
          {...(alRenombrar ? { alRenombrar } : {})}
          {...(alQuitar ? { alQuitar } : {})}
          {...(alCrearCategoria ? { alCrearCategoria } : {})}
        />
      )
    case 'deudas':
      return (
        <Deudas
          presupuesto={presupuesto}
          {...(alCrearDeuda ? { alCrearDeuda } : {})}
          {...(alGuardarSaldo ? { alGuardarSaldo } : {})}
          {...(alEnfocar ? { alEnfocar } : {})}
          {...(alBorrarDeuda ? { alBorrarDeuda } : {})}
        />
      )
    case 'metas':
      return (
        <Metas
          presupuesto={presupuesto}
          {...(alCrearFondo ? { alCrearFondo } : {})}
          {...(alGuardarAcumulado ? { alGuardarAcumulado } : {})}
          {...(alBorrarFondo ? { alBorrarFondo } : {})}
        />
      )
    default:
      return (
        <MiSemana
          presupuesto={presupuesto}
          {...(alAnotar ? { alAnotar } : {})}
          {...(alMarcarPago ? { alMarcarPago } : {})}
          {...(alCerrarSemana ? { alCerrarSemana } : {})}
        />
      )
  }
}

function Ajustes({
  presupuesto,
  recargar,
}: {
  presupuesto: Presupuesto
  recargar: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Membresia
        nivel={presupuesto.usuario.nivel}
        venceEn={presupuesto.usuario.nivelVenceEn}
        alPagar={async (plan) => {
          const { irAPagar } = await import('./servidor/repositorios/membresia')
          await irAPagar(plan)
        }}
        alAdministrar={async () => {
          const { irAlPortal } = await import('./servidor/repositorios/membresia')
          await irAlPortal()
        }}
        alCanjear={async (codigo) => {
          const { canjearCodigo } = await import('./servidor/repositorios/membresia')
          await canjearCodigo(codigo)
          recargar()
        }}
      />
      <TarjetaEscritorio icono="⚙" titulo="Lo demás">
        <p className="text-texto-2 text-[13px] leading-[1.6]">
          Cambiar tu frecuencia de pago y la hora de tu aviso todavía no está construido.
        </p>
      </TarjetaEscritorio>
    </div>
  )
}

/**
 * La franja de "esto es una copia".
 *
 * No es un error: la app funciona y los números son los últimos que se supieron.
 * Lo que no se puede es dejar creer que son de hoy.
 */
function SinConexion() {
  return (
    <div
      role="status"
      className="bg-ambar fixed inset-x-0 top-0 z-40 px-4 py-[6px] text-center text-[12px] font-semibold text-[#3A2A08]"
    >
      Sin conexión — estás viendo tu última copia guardada
    </div>
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
          if (datos.nombre.trim()) {
            const { guardarNombre } = await import('./servidor/repositorios/onboarding')
            await guardarNombre(usuarioId!, datos.nombre)
          }
          fuente.recargar()
        }}
      />
    )
  }

  const presupuesto = fuente.presupuesto
  // Sin decirlo, el usuario decidiría si le alcanza con números que quizá ya
  // no son los de hoy. Con decirlo, sabe qué está viendo y por qué.
  const sinConexion = fuente.desdeLaCopia

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

  const hogarId = presupuesto.hogarId
  const alRenombrar = mesId
    ? async (categoriaId: string, nombre: string) => {
        const { renombrarCategoria } = await import('./servidor/repositorios/categorias')
        await renombrarCategoria(categoriaId, nombre)
        fuente.recargar()
      }
    : undefined

  const alQuitar = mesId
    ? async (categoriaId: string) => {
        const { quitarDelMes } = await import('./servidor/repositorios/categorias')
        await quitarDelMes(categoriaId, mesId)
        fuente.recargar()
      }
    : undefined

  const alCrearCategoria =
    mesId && hogarId
      ? async (
          grupo: 'fijo' | 'variable',
          nombre: string,
          diaVencimiento: number | undefined,
        ) => {
          const { crearCategoria } = await import('./servidor/repositorios/categorias')
          // Se pone al final de su grupo, que es donde uno espera lo recién hecho.
          const cuantas =
            grupo === 'fijo' ? presupuesto.fijos.length : presupuesto.variables.length
          await crearCategoria({
            hogarId,
            nombre,
            grupo,
            ...(diaVencimiento === undefined ? {} : { diaVencimiento }),
            orden: 10 + cuantas,
          })
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

  const alCerrarSemana =
    puedeAnotar && hogarId
      ? async (r: RespuestaCierre) => {
          const { cerrarSemana } = await import('./servidor/repositorios/cerrar')
          await cerrarSemana({
            hogarId,
            usuarioId,
            periodoId: presupuesto.periodoActivoId!,
            fecha: hoy(),
            ingresoRealCents: r.ingresoRealCents,
            sobres: r.sobres,
            pagosHechos: r.pagosHechos,
          })
          fuente.recargar()
        }
      : undefined

  // Deudas y fondos cuelgan del hogar, no del mes: sobreviven a que se acabe
  // agosto, que es justamente de lo que se tratan.
  const metas = hogarId
    ? {
        alCrearDeuda: async (
          nombre: string,
          saldoCents: Centavos,
          pagoMinimoCents: Centavos,
          tasaInteres: number | null,
        ) => {
          const { crearDeuda } = await import('./servidor/repositorios/metas')
          await crearDeuda({ hogarId, nombre, saldoCents, pagoMinimoCents, tasaInteres })
          fuente.recargar()
        },
        alGuardarSaldo: async (
          deudaId: string,
          saldoCents: Centavos,
          saldoInicialCents: Centavos,
        ) => {
          const { actualizarSaldo } = await import('./servidor/repositorios/metas')
          await actualizarSaldo(deudaId, saldoCents, saldoInicialCents)
          fuente.recargar()
        },
        alEnfocar: async (deudaId: string) => {
          const { ponerEnfoque } = await import('./servidor/repositorios/metas')
          await ponerEnfoque(hogarId, deudaId)
          fuente.recargar()
        },
        alBorrarDeuda: async (deudaId: string) => {
          const { borrarDeuda } = await import('./servidor/repositorios/metas')
          await borrarDeuda(deudaId)
          fuente.recargar()
        },
        alCrearFondo: async (
          nombre: string,
          metaCents: Centavos,
          acumuladoCents: Centavos,
          cuando: string | null,
        ) => {
          const { crearFondo } = await import('./servidor/repositorios/metas')
          await crearFondo({
            hogarId,
            nombre,
            metaCents,
            acumuladoCents,
            fechaObjetivo: cuando ? fecha(cuando) : null,
          })
          fuente.recargar()
        },
        alGuardarAcumulado: async (fondoId: string, acumuladoCents: Centavos) => {
          const { actualizarAcumulado } = await import('./servidor/repositorios/metas')
          await actualizarAcumulado(fondoId, acumuladoCents)
          fuente.recargar()
        },
        alBorrarFondo: async (fondoId: string) => {
          const { borrarFondo } = await import('./servidor/repositorios/metas')
          await borrarFondo(fondoId)
          fuente.recargar()
        },
      }
    : {}

  const acciones: Acciones = {
    ...metas,
    ...(alPonerMonto ? { alPonerMonto } : {}),
    ...(alRenombrar ? { alRenombrar } : {}),
    ...(alQuitar ? { alQuitar } : {}),
    ...(alCrearCategoria ? { alCrearCategoria } : {}),
    ...(alAnotar ? { alAnotar } : {}),
    ...(alMarcarPago ? { alMarcarPago } : {}),
    ...(alCerrarSemana ? { alCerrarSemana } : {}),
  }

  // El onboarding quedó a medias: se vuelve a donde se quedó en vez de caer a
  // una app sin fijos, sin deudas y sin aviso, que se vería vacía por culpa
  // nuestra y no del usuario.
  if (
    !presupuesto.usuario.onboardingTerminado &&
    alPonerMonto &&
    alCrearCategoria &&
    metas.alCrearDeuda &&
    usuarioId
  ) {
    return (
      <Onboarding
        presupuesto={presupuesto}
        alPonerMonto={alPonerMonto}
        alCrearCategoria={alCrearCategoria}
        alCrearDeuda={metas.alCrearDeuda}
        alGuardarAviso={async (horaLocal, activo) => {
          const { guardarAviso, guardarZonaHoraria } = await import(
            './servidor/repositorios/onboarding'
          )
          // La zona sale del navegador: es el único lugar que la sabe de verdad.
          const zona = Intl.DateTimeFormat().resolvedOptions().timeZone
          if (zona) await guardarZonaHoraria(usuarioId, zona)
          await guardarAviso(usuarioId, horaLocal, activo)
        }}
        alTerminar={async () => {
          const { terminarOnboarding } = await import('./servidor/repositorios/onboarding')
          await terminarOnboarding(usuarioId)
          fuente.recargar()
        }}
      />
    )
  }

  const extraActual = centavos(
    suma(presupuesto.deudas.map((d) => d.pagoActualCents)) -
      suma(presupuesto.deudas.map((d) => d.pagoMinimoCents)),
  )
  const plan = simular(presupuesto.deudas, extraActual, presupuesto.inicioDeudas)
  const fechaLibertad = plan.fechaLibertad ? mesYAnio(plan.fechaLibertad) : 'sin fecha'

  return (
    <>
      {sinConexion && <SinConexion />}

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
              <Ajustes presupuesto={presupuesto} recargar={fuente.recargar} />
            ) : (
              <Contenido ruta={enEscritorio} presupuesto={presupuesto} acciones={acciones} />
            )}
          </div>
        )}
      </div>
    </>
  )
}
