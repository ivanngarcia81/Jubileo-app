import { type ReactNode, useEffect, useMemo, useState } from "react";
import { MES_DEL_EJEMPLO, hoy, mesActual, usaServidor } from "./datos/fuente";
import type { Pago, Presupuesto } from "./datos/tipos";
import { usarPresupuesto } from "./datos/usarPresupuesto";
import { usarSesion } from "./datos/usarSesion";
import { ComoMePagan, type DatosDePago } from "./componentes/ComoMePagan";
import { Entrar } from "./componentes/Entrar";
import { Membresia } from "./componentes/Membresia";
import { Onboarding } from "./componentes/Onboarding";
import {
  IconoAjustes,
  IconoAviso,
  IconoDeudas,
  IconoEditar,
  IconoMas,
  IconoMetas,
  IconoMovimientos,
  IconoRegresar,
} from "./componentes/iconos";
import { TuAviso, TuNombre } from "./componentes/Preferencias";
import { type LoQueTrae, MesNuevo } from "./componentes/MesNuevo";
import { PrimerMes } from "./componentes/PrimerMes";
import {
  BandaIndicadores,
  BarraSuperior,
} from "./componentes/escritorio/Panel";
import { Resumen } from "./componentes/escritorio/Resumen";
import { Aviso } from "./componentes/movil/Aviso";
import { Deudas } from "./componentes/movil/Deudas";
import { ElMes } from "./componentes/movil/ElMes";
import { Cabecera, Marco } from "./componentes/movil/Marco";
import { Metas } from "./componentes/movil/Metas";
import { Movimientos } from "./componentes/movil/Movimientos";
import type { RespuestaCierre } from "./componentes/movil/CerrarSemana";
import { MiSemana } from "./componentes/movil/MiSemana";
import { useEsEscritorio } from "./componentes/pantalla";
import { mesYAnio } from "./componentes/textos";
import { simular } from "./lib/deudas";
import { type Centavos, centavos, suma } from "./lib/dinero";
import { fecha } from "./lib/fecha";
import type { MesObjetivo } from "./lib/periodos";
import { type Ruta, rutaEscritorio, rutaMovil, useRuta } from "./rutas";

type ComoMePaganCallback = (datos: DatosDePago) => Promise<void>;

/**
 * Un solo frontend responsivo para computadora y teléfono, como pide la
 * sección 4 del SPEC. Por debajo del ancho de escritorio manda el diseño de
 * `design/movil.html`; por encima, el de `design/escritorio.html`.
 */

function cabeceraDe(
  ruta: Ruta,
  presupuesto: Presupuesto,
  ir: (r: Ruta) => void,
) {
  const pendientes = presupuesto.deudas.filter((d) => d.saldoCents > 0).length;

  switch (ruta) {
    case "mes":
      return (
        <Cabecera
          avatar={<IconoRegresar />}
          alTocarAvatar={() => ir("semana")}
          titulo={presupuesto.mes.etiqueta}
          subtitulo={`${presupuesto.usuario.frecuencia} · ${presupuesto.periodos.length} cheques`}
          accion={<IconoEditar tam={16} />}
        />
      );
    case "deudas":
      return (
        <Cabecera
          avatar={<IconoDeudas />}
          titulo="Salir de deudas"
          subtitulo={`${pendientes} deudas pendientes`}
          accion={<IconoMas tam={16} />}
        />
      );
    case "metas":
      return (
        <Cabecera
          avatar={<IconoMetas />}
          titulo="Tus metas"
          subtitulo={`${presupuesto.fondos.length} fondos de reserva`}
          accion={<IconoMas tam={16} />}
        />
      );
    case "movimientos":
      return (
        <Cabecera
          avatar={<IconoRegresar />}
          alTocarAvatar={() => ir("semana")}
          titulo="Movimientos"
          subtitulo={`${presupuesto.mes.etiqueta} · ${presupuesto.movimientos.length} en total`}
          accion={<IconoMovimientos tam={16} />}
        />
      );
    case "ajustes":
      return (
        <Cabecera
          avatar={<IconoRegresar />}
          alTocarAvatar={() => ir("semana")}
          titulo="Ajustes"
          subtitulo={`${presupuesto.usuario.frecuencia} · ${presupuesto.periodos.length} cheques`}
          accion={<IconoAjustes tam={16} />}
        />
      );
    default:
      return (
        <Cabecera
          avatar={presupuesto.usuario.iniciales}
          // El avatar es la puerta a ajustes. En el teléfono no hay otra: la
          // píldora tiene cuatro destinos y así se queda.
          alTocarAvatar={() => ir("ajustes")}
          titulo={`Buenos días, ${presupuesto.usuario.nombre}`}
          subtitulo={
            presupuesto.usuario.nivel === "premium"
              ? "Cuenta Premium"
              : "Cuenta gratis"
          }
          accion={<IconoAviso tam={16} />}
          conAviso
        />
      );
  }
}

/** Lo que la pantalla puede escribir. Ausente con datos de ejemplo. */
interface Acciones {
  alPonerMonto?: (categoriaId: string, montoCents: Centavos) => Promise<void>;
  alPonerSemana?: (
    categoriaId: string,
    semana: number,
    montoCents: Centavos,
  ) => Promise<void>;
  alRenombrar?: (categoriaId: string, nombre: string) => Promise<void>;
  alQuitar?: (categoriaId: string) => Promise<void>;
  alCrearCategoria?: (
    grupo: "fijo" | "variable",
    nombre: string,
    diaVencimiento: number | undefined,
  ) => Promise<void>;
  alAnotar?: (
    categoriaId: string,
    montoCents: Centavos,
    descripcion: string,
  ) => Promise<void>;
  alMarcarPago?: (pago: Pago) => Promise<void>;
  alCerrarSemana?: (r: RespuestaCierre) => Promise<void>;
  alCerrarMes?: () => Promise<void>;
  alVerMes?: (anio: number, mes: number) => void;
  alVerMovimientos?: () => void;
  alRevisar?: (ids: readonly string[], revisado: boolean) => Promise<void>;
  alCrearDeuda?: (
    nombre: string,
    saldoCents: Centavos,
    pagoMinimoCents: Centavos,
    tasa: number | null,
  ) => Promise<void>;
  alGuardarSaldo?: (
    deudaId: string,
    saldoCents: Centavos,
    saldoInicialCents: Centavos,
  ) => Promise<void>;
  alEnfocar?: (deudaId: string) => Promise<void>;
  alBorrarDeuda?: (deudaId: string) => Promise<void>;
  alCrearFondo?: (
    nombre: string,
    metaCents: Centavos,
    acumuladoCents: Centavos,
    fechaObjetivo: string | null,
  ) => Promise<void>;
  alGuardarAcumulado?: (
    fondoId: string,
    acumuladoCents: Centavos,
  ) => Promise<void>;
  alBorrarFondo?: (fondoId: string) => Promise<void>;
}

function Contenido({
  ruta,
  presupuesto,
  acciones,
}: {
  ruta: Ruta;
  presupuesto: Presupuesto;
  acciones: Acciones;
}) {
  const {
    alPonerMonto,
    alPonerSemana,
    alRenombrar,
    alQuitar,
    alCrearCategoria,
    alAnotar,
    alMarcarPago,
    alCerrarSemana,
    alCerrarMes,
    alVerMes,
    alVerMovimientos,
    alRevisar,
    alCrearDeuda,
    alGuardarSaldo,
    alEnfocar,
    alBorrarDeuda,
    alCrearFondo,
    alGuardarAcumulado,
    alBorrarFondo,
  } = acciones;
  switch (ruta) {
    case "mes":
      return (
        <ElMes
          presupuesto={presupuesto}
          {...(alPonerMonto ? { alPonerMonto } : {})}
          {...(alPonerSemana ? { alPonerSemana } : {})}
          {...(alRenombrar ? { alRenombrar } : {})}
          {...(alQuitar ? { alQuitar } : {})}
          {...(alCrearCategoria ? { alCrearCategoria } : {})}
          {...(alCerrarMes ? { alCerrarMes } : {})}
          {...(alVerMes ? { alVerMes } : {})}
        />
      );
    case "deudas":
      return (
        <Deudas
          presupuesto={presupuesto}
          {...(alCrearDeuda ? { alCrearDeuda } : {})}
          {...(alGuardarSaldo ? { alGuardarSaldo } : {})}
          {...(alEnfocar ? { alEnfocar } : {})}
          {...(alBorrarDeuda ? { alBorrarDeuda } : {})}
        />
      );
    case "movimientos":
      return (
        <Movimientos
          presupuesto={presupuesto}
          {...(alRevisar ? { alRevisar } : {})}
        />
      );
    case "metas":
      return (
        <Metas
          presupuesto={presupuesto}
          {...(alCrearFondo ? { alCrearFondo } : {})}
          {...(alGuardarAcumulado ? { alGuardarAcumulado } : {})}
          {...(alBorrarFondo ? { alBorrarFondo } : {})}
        />
      );
    default:
      return (
        <MiSemana
          presupuesto={presupuesto}
          {...(alAnotar ? { alAnotar } : {})}
          {...(alMarcarPago ? { alMarcarPago } : {})}
          {...(alCerrarSemana ? { alCerrarSemana } : {})}
          {...(alVerMovimientos ? { alVerMovimientos } : {})}
        />
      );
  }
}

function Ajustes({
  presupuesto,
  mes,
  recargar,
  alCambiarComoMePagan,
  alGuardarNombre,
  alGuardarAviso,
}: {
  presupuesto: Presupuesto;
  mes: MesObjetivo;
  recargar: () => void;
  alCambiarComoMePagan?: ComoMePaganCallback;
  alGuardarNombre?: (nombre: string) => Promise<void>;
  alGuardarAviso?: (horaLocal: string, activo: boolean) => Promise<void>;
}) {
  return (
    // Cada tarjeta de aquí es independiente de las demás, así que en pantalla
    // ancha van en dos columnas: es la que mejor aguanta el cambio sin tocarle
    // nada por dentro. `items-start` para que no se estiren a la altura de la
    // más alta.
    <div className="flex flex-col gap-3 ancho:grid ancho:grid-cols-2 ancho:items-start ancho:gap-4">
      {alCambiarComoMePagan && (
        <ComoMePagan
          presupuesto={presupuesto}
          mes={mes}
          alGuardar={alCambiarComoMePagan}
        />
      )}
      {alGuardarNombre && (
        <TuNombre presupuesto={presupuesto} alGuardar={alGuardarNombre} />
      )}
      {alGuardarAviso && (
        <TuAviso presupuesto={presupuesto} alGuardar={alGuardarAviso} />
      )}
      <Membresia
        nivel={presupuesto.usuario.nivel}
        venceEn={presupuesto.usuario.nivelVenceEn}
        alPagar={async (plan) => {
          const { irAPagar } =
            await import("./servidor/repositorios/membresia");
          await irAPagar(plan);
        }}
        alAdministrar={async () => {
          const { irAlPortal } =
            await import("./servidor/repositorios/membresia");
          await irAlPortal();
        }}
        alCanjear={async (codigo) => {
          const { canjearCodigo } =
            await import("./servidor/repositorios/membresia");
          await canjearCodigo(codigo);
          recargar();
        }}
      />
    </div>
  );
}

/**
 * Sin mes: ¿cuenta nueva, o el mes que sigue?
 *
 * Se distinguen por una sola cosa —si hay un mes anterior en la base— y esa
 * pregunta se le hace al servidor, no se adivina. A una cuenta nueva le toca el
 * onboarding entero; a quien ya lleva meses aquí, un botón.
 */
function ArmarElMes({
  mes,
  usuarioId,
  recargar,
  primerMes,
}: {
  mes: MesObjetivo;
  usuarioId: string;
  recargar: () => void;
  primerMes: ReactNode;
}) {
  const [trae, setTrae] = useState<LoQueTrae | null | undefined>(undefined);

  useEffect(() => {
    let vigente = true;
    void import("./servidor/repositorios/mesNuevo")
      .then((m) => m.loQueTraeElMesNuevo(mes))
      .then((r) => vigente && setTrae(r))
      // Si no se puede preguntar, se cae al onboarding: preguntar de más es
      // molesto, pero dejar a alguien sin manera de armar su mes es peor.
      .catch(() => vigente && setTrae(null));
    return () => {
      vigente = false;
    };
  }, [mes]);

  if (trae === undefined) return <Mensaje titulo="Un momento…" />;
  if (trae === null) return <>{primerMes}</>;

  return (
    <MesNuevo
      mes={mes}
      trae={trae}
      alAbrir={async () => {
        const { abrirElMes } = await import("./servidor/repositorios/mesNuevo");
        await abrirElMes(usuarioId, mes);
        recargar();
      }}
    />
  );
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
      className="bg-ambar fixed inset-x-0 top-0 z-40 px-4 py-[6px] text-center text-menor font-semibold text-[#3A2A08]"
    >
      Sin conexión — estás viendo tu última copia guardada
    </div>
  );
}

/** Un mes que todavía no llega, o que no se pudo traer. */
function Mensaje({ titulo, cuerpo }: { titulo: string; cuerpo?: string }) {
  return (
    <main className="bg-gris text-texto font-sans grid min-h-dvh place-items-center p-gap">
      <div className="max-w-[38ch] text-center">
        <h1 className="font-serif text-cifra">{titulo}</h1>
        {cuerpo && (
          <p className="text-texto-2 text-cuerpo mt-2 leading-[1.6]">{cuerpo}</p>
        )}
      </div>
    </main>
  );
}

export function App() {
  const sesion = usarSesion();
  const [ruta, ir] = useRuta();
  // Arriba del todo: los ganchos van antes de cualquier retorno temprano, y
  // abajo hay varios —cargando, fuera, armar el mes—.
  const esEscritorio = useEsEscritorio();

  // Sin servidor, la app enseña el mes del ejemplo. Con servidor, el mes en el
  // que está parado el usuario — que ahora puede moverse: desde que los meses
  // se acumulan, el selector de barras deja volver a uno cerrado.
  const inicial = useMemo(
    () => (usaServidor() ? mesActual() : MES_DEL_EJEMPLO),
    [],
  );
  const [mes, verMes] = useState<MesObjetivo>(inicial);
  const usuarioId = sesion.estado === "dentro" ? sesion.usuarioId : null;
  const fuente = usarPresupuesto(mes, usuarioId);

  if (sesion.estado === "cargando") return <Mensaje titulo="Un momento…" />;
  // La configuración existe pero está mal puesta. Se dice aquí, con lo que hay
  // que hacer, en vez de dejar que reviente al mandar el correo.
  if (sesion.estado === "mal_configurado")
    return (
      <Mensaje titulo="La app no está bien conectada" cuerpo={sesion.motivo} />
    );
  if (sesion.estado === "fuera") return <Entrar />;

  if (fuente.estado === "cargando") return <Mensaje titulo="Un momento…" />;
  if (fuente.estado === "error")
    return <Mensaje titulo="No pudimos traer tu mes" cuerpo={fuente.mensaje} />;

  // No hay mes. Puede ser el principio de una cuenta nueva, o el primero de
  // septiembre para alguien que lleva meses aquí — y no son lo mismo.
  if (fuente.estado === "sin_mes") {
    return (
      <ArmarElMes
        mes={mes}
        usuarioId={usuarioId!}
        recargar={fuente.recargar}
        primerMes={
          <PrimerMes
            mes={mes}
            alArmar={async (datos) => {
              const { armarPrimerMes } =
                await import("./servidor/repositorios/arranque");
              await armarPrimerMes(usuarioId!, mes, {
                frecuencia: datos.frecuencia,
                fechaAncla: fecha(datos.fechaAncla),
                diasPago: datos.diasPago,
                ingresoEsperadoCents:
                  datos.ingresoEsperadoCents === null
                    ? null
                    : centavos(datos.ingresoEsperadoCents),
              });
              if (datos.nombre.trim()) {
                const { guardarNombre } =
                  await import("./servidor/repositorios/onboarding");
                await guardarNombre(usuarioId!, datos.nombre);
              }
              fuente.recargar();
            }}
          />
        }
      />
    );
  }

  const presupuesto = fuente.presupuesto;
  // Sin decirlo, el usuario decidiría si le alcanza con números que quizá ya
  // no son los de hoy. Con decirlo, sabe qué está viendo y por qué.
  const sinConexion = fuente.desdeLaCopia;

  // El aviso no es una pantalla de la app: es la notificación. Se ve entera,
  // sin barra ni navegación.
  if (ruta === "aviso") return <Aviso presupuesto={presupuesto} />;

  const enMovil = rutaMovil(ruta);
  const enEscritorio = rutaEscritorio(ruta);

  // Con datos de ejemplo no hay dónde guardar, y sin `mesId` tampoco: la
  // pantalla se ve igual pero sin botones que prometan algo que no pasa.
  const mesId = presupuesto.mesId;
  const alPonerMonto = mesId
    ? async (categoriaId: string, montoCents: Centavos) => {
        const { ponerMontoMensual } =
          await import("./servidor/repositorios/presupuestar");
        await ponerMontoMensual(mesId, categoriaId, montoCents);
        fuente.recargar();
      }
    : undefined;

  const alPonerSemana = mesId
    ? async (categoriaId: string, semana: number, montoCents: Centavos) => {
        const { ponerMontoDeSemana } =
          await import("./servidor/repositorios/semanas");
        await ponerMontoDeSemana(mesId, categoriaId, semana, montoCents);
        fuente.recargar();
      }
    : undefined;

  const hogarId = presupuesto.hogarId;
  const alRenombrar = mesId
    ? async (categoriaId: string, nombre: string) => {
        const { renombrarCategoria } =
          await import("./servidor/repositorios/categorias");
        await renombrarCategoria(categoriaId, nombre);
        fuente.recargar();
      }
    : undefined;

  const alRevisar = mesId
    ? async (ids: readonly string[], revisado: boolean) => {
        const { marcarRevisados } =
          await import("./servidor/repositorios/anotar");
        await marcarRevisados(ids, revisado);
        fuente.recargar();
      }
    : undefined;

  const alCerrarMes = mesId
    ? async () => {
        const { cerrarMes } = await import("./servidor/repositorios/mes");
        await cerrarMes(mesId);
        fuente.recargar();
      }
    : undefined;

  const alGuardarNombre = usuarioId
    ? async (nombre: string) => {
        const { guardarNombre } =
          await import("./servidor/repositorios/onboarding");
        await guardarNombre(usuarioId, nombre);
        fuente.recargar();
      }
    : undefined;

  const alGuardarAvisoDesdeAjustes = usuarioId
    ? async (horaLocal: string, activo: boolean) => {
        const { guardarAviso, guardarZonaHoraria } =
          await import("./servidor/repositorios/onboarding");
        // La zona se vuelve a guardar aquí porque es la única que sabe el
        // navegador, y alguien que se mudó cambia su hora justamente aquí.
        const zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (zona) await guardarZonaHoraria(usuarioId, zona);
        await guardarAviso(usuarioId, horaLocal, activo);
        fuente.recargar();
      }
    : undefined;

  // Volver a un mes cerrado. No escribe nada: solo cambia lo que se mira.
  const alVerMes = (anio: number, m: number) => verMes({ anio, mes: m });

  const alQuitar = mesId
    ? async (categoriaId: string) => {
        const { quitarDelMes } =
          await import("./servidor/repositorios/categorias");
        await quitarDelMes(categoriaId, mesId);
        fuente.recargar();
      }
    : undefined;

  const alCrearCategoria =
    mesId && hogarId
      ? async (
          grupo: "fijo" | "variable",
          nombre: string,
          diaVencimiento: number | undefined,
        ) => {
          const { crearCategoria } =
            await import("./servidor/repositorios/categorias");
          // Se pone al final de su grupo, que es donde uno espera lo recién hecho.
          const cuantas =
            grupo === "fijo"
              ? presupuesto.fijos.length
              : presupuesto.variables.length;
          await crearCategoria({
            hogarId,
            nombre,
            grupo,
            ...(diaVencimiento === undefined ? {} : { diaVencimiento }),
            orden: 10 + cuantas,
          });
          fuente.recargar();
        }
      : undefined;

  // Anotar cuelga del cheque en curso, no del mes: es lo que hace que un gasto
  // de hoy baje el dinero de esta semana.
  const puedeAnotar =
    presupuesto.hogarId && presupuesto.periodoActivoId && usuarioId;
  const alAnotar = puedeAnotar
    ? async (
        categoriaId: string,
        montoCents: Centavos,
        descripcion: string,
      ) => {
        const { anotarGasto } = await import("./servidor/repositorios/anotar");
        await anotarGasto({
          hogarId: presupuesto.hogarId!,
          usuarioId,
          periodoId: presupuesto.periodoActivoId!,
          categoriaId,
          fecha: hoy(),
          montoCents,
          descripcion,
        });
        fuente.recargar();
      }
    : undefined;

  // Marcar un pago es anotar el gasto completo; desmarcarlo es borrarlo.
  const alMarcarPago = puedeAnotar
    ? async (pago: Pago) => {
        const { anotarGasto, borrarMovimiento } =
          await import("./servidor/repositorios/anotar");
        if (pago.transaccionId) {
          await borrarMovimiento(pago.transaccionId);
        } else {
          await anotarGasto({
            hogarId: presupuesto.hogarId!,
            usuarioId,
            periodoId: presupuesto.periodoActivoId!,
            categoriaId: pago.id,
            fecha: hoy(),
            montoCents: pago.montoCents,
            descripcion: pago.nombre,
          });
        }
        fuente.recargar();
      }
    : undefined;

  // Cambiar cómo te pagan rehace los cheques del mes, no el presupuesto: los
  // montos mensuales se quedan y solo se reparten distinto. Regla 3 de la
  // sección 6.
  const alCambiarComoMePagan: ComoMePaganCallback | undefined =
    mesId && hogarId && usuarioId
      ? async (datos) => {
          const { cambiarComoMePagan } =
            await import("./servidor/repositorios/comoMePagan");
          await cambiarComoMePagan(usuarioId, mesId, hogarId, mes, {
            frecuencia: datos.frecuencia,
            fechaAncla: fecha(datos.fechaAncla),
            diasPago: datos.diasPago,
            ingresoEsperadoCents: datos.ingresoEsperadoCents,
          });
          fuente.recargar();
        }
      : undefined;

  const alCerrarSemana =
    puedeAnotar && hogarId
      ? async (r: RespuestaCierre) => {
          const { cerrarSemana } =
            await import("./servidor/repositorios/cerrar");
          await cerrarSemana({
            hogarId,
            usuarioId,
            periodoId: presupuesto.periodoActivoId!,
            fecha: hoy(),
            ingresoRealCents: r.ingresoRealCents,
            sobres: r.sobres,
            pagosHechos: r.pagosHechos,
          });
          fuente.recargar();
        }
      : undefined;

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
          const { crearDeuda } = await import("./servidor/repositorios/metas");
          await crearDeuda({
            hogarId,
            nombre,
            saldoCents,
            pagoMinimoCents,
            tasaInteres,
          });
          fuente.recargar();
        },
        alGuardarSaldo: async (
          deudaId: string,
          saldoCents: Centavos,
          saldoInicialCents: Centavos,
        ) => {
          const { actualizarSaldo } =
            await import("./servidor/repositorios/metas");
          await actualizarSaldo(deudaId, saldoCents, saldoInicialCents);
          fuente.recargar();
        },
        alEnfocar: async (deudaId: string) => {
          const { ponerEnfoque } =
            await import("./servidor/repositorios/metas");
          await ponerEnfoque(hogarId, deudaId);
          fuente.recargar();
        },
        alBorrarDeuda: async (deudaId: string) => {
          const { borrarDeuda } = await import("./servidor/repositorios/metas");
          await borrarDeuda(deudaId);
          fuente.recargar();
        },
        alCrearFondo: async (
          nombre: string,
          metaCents: Centavos,
          acumuladoCents: Centavos,
          cuando: string | null,
        ) => {
          const { crearFondo } = await import("./servidor/repositorios/metas");
          await crearFondo({
            hogarId,
            nombre,
            metaCents,
            acumuladoCents,
            fechaObjetivo: cuando ? fecha(cuando) : null,
          });
          fuente.recargar();
        },
        alGuardarAcumulado: async (
          fondoId: string,
          acumuladoCents: Centavos,
        ) => {
          const { actualizarAcumulado } =
            await import("./servidor/repositorios/metas");
          await actualizarAcumulado(fondoId, acumuladoCents);
          fuente.recargar();
        },
        alBorrarFondo: async (fondoId: string) => {
          const { borrarFondo } = await import("./servidor/repositorios/metas");
          await borrarFondo(fondoId);
          fuente.recargar();
        },
      }
    : {};

  const acciones: Acciones = {
    ...metas,
    ...(alPonerMonto ? { alPonerMonto } : {}),
    ...(alPonerSemana ? { alPonerSemana } : {}),
    ...(alRenombrar ? { alRenombrar } : {}),
    ...(alQuitar ? { alQuitar } : {}),
    ...(alCrearCategoria ? { alCrearCategoria } : {}),
    ...(alAnotar ? { alAnotar } : {}),
    ...(alMarcarPago ? { alMarcarPago } : {}),
    ...(alCerrarSemana ? { alCerrarSemana } : {}),
    ...(alCerrarMes ? { alCerrarMes } : {}),
    ...(usaServidor() ? { alVerMes } : {}),
    alVerMovimientos: () => ir("movimientos"),
    ...(alRevisar ? { alRevisar } : {}),
  };

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
          const { guardarAviso, guardarZonaHoraria } =
            await import("./servidor/repositorios/onboarding");
          // La zona sale del navegador: es el único lugar que la sabe de verdad.
          const zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (zona) await guardarZonaHoraria(usuarioId, zona);
          await guardarAviso(usuarioId, horaLocal, activo);
        }}
        alTerminar={async () => {
          const { terminarOnboarding } =
            await import("./servidor/repositorios/onboarding");
          await terminarOnboarding(usuarioId);
          fuente.recargar();
        }}
      />
    );
  }

  const extraActual = centavos(
    suma(presupuesto.deudas.map((d) => d.pagoActualCents)) -
      suma(presupuesto.deudas.map((d) => d.pagoMinimoCents)),
  );
  const plan = simular(
    presupuesto.deudas,
    extraActual,
    presupuesto.inicioDeudas,
  );
  const fechaLibertad = plan.fechaLibertad
    ? mesYAnio(plan.fechaLibertad)
    : "sin fecha";

  return (
    <>
      {sinConexion && <SinConexion />}

      {!esEscritorio && (
        <Marco
          cabecera={cabeceraDe(enMovil, presupuesto, ir)}
          activa={enMovil}
          ir={ir}
        >
          {enMovil === "ajustes" ? (
            <Ajustes
              presupuesto={presupuesto}
              mes={mes}
              recargar={fuente.recargar}
              {...(alCambiarComoMePagan ? { alCambiarComoMePagan } : {})}
              {...(alGuardarNombre ? { alGuardarNombre } : {})}
              {...(alGuardarAvisoDesdeAjustes
                ? { alGuardarAviso: alGuardarAvisoDesdeAjustes }
                : {})}
            />
          ) : (
            <Contenido
              ruta={enMovil}
              presupuesto={presupuesto}
              acciones={acciones}
            />
          )}
        </Marco>
      )}

      {/* El mockup dibuja la ventana de escritorio dentro de `.win`, de 1420px
          centrada. Eso no era el marco del documento: era el ancho del
          contenido, y al pasarlo a React se perdió. Sin él, en un monitor
          grande la columna central crece sin límite mientras las laterales
          siguen en 262px, y el texto de 13px queda en renglones larguísimos.

          El árbol se escoge con lógica y no con `hidden`: ver `pantalla.ts`. */}
      {esEscritorio && (
      <div className="bg-gris text-texto font-sans block min-h-dvh">
        <BarraSuperior
          presupuesto={presupuesto}
          activa={enEscritorio}
          ir={ir}
        />
        <BandaIndicadores
          presupuesto={presupuesto}
          fechaLibertad={fechaLibertad}
        />

        {enEscritorio === "resumen" ? (
          <Resumen
            presupuesto={presupuesto}
            alVerMovimientos={() => ir("movimientos")}
          />
        ) : (
          // 720px era la mitad del ancho disponible. Estas tres pantallas
          // siguen siendo las del teléfono —darles composición propia de
          // escritorio es otro trabajo— pero al menos respiran.
          <div className="mx-auto max-w-[980px] p-[22px]">
            {enEscritorio === "ajustes" ? (
              <Ajustes
                presupuesto={presupuesto}
                mes={mes}
                recargar={fuente.recargar}
                {...(alCambiarComoMePagan ? { alCambiarComoMePagan } : {})}
                {...(alGuardarNombre ? { alGuardarNombre } : {})}
                {...(alGuardarAvisoDesdeAjustes
                  ? { alGuardarAviso: alGuardarAvisoDesdeAjustes }
                  : {})}
              />
            ) : (
              <Contenido
                ruta={enEscritorio}
                presupuesto={presupuesto}
                acciones={acciones}
              />
            )}
          </div>
        )}
      </div>
      )}
    </>
  );
}
