import { useState } from 'react'
import type { Presupuesto } from '../datos/tipos'
import { simular } from '../lib/deudas'
import { type Centavos, centavos, formatearRedondo, suma } from '../lib/dinero'
import { diaDe, diasEntre } from '../lib/fecha'
import { hoy } from '../datos/fuente'
import { ritmoDelPlan } from '../lib/semanas'
import type { Destino, Ruta } from '../rutas'
import {
  Barra,
  ChipCategoria,
  FilaFondo,
  IconoDeCategoria,
  ListaSeccion,
  Moneda,
  Vacio,
  claseDeQueda,
  colorDeSobre,
} from './base'
import {
  IconoAnotar,
  IconoCoach,
  IconoDeudas,
  IconoDinero,
  IconoEnfoque,
  IconoMetas,
  IconoMovimientos,
  IconoPalomita,
  IconoReloj,
} from './iconos'
import { type AlAnotar, Anotar } from './movil/Anotar'
import type { AlCrearCategoria } from './movil/NuevaCategoria'
import { CerrarSemana, type RespuestaCierre } from './movil/CerrarSemana'
import { Hero } from './HeroeDeLaSemana'
import { cuantos, mesYAnio, nombreDeMes } from './textos'

/**
 * El Dashboard — la pantalla de inicio. Resume y despacha.
 *
 * Antes el inicio era Mi semana: una pantalla de **ejecución** hecha casa. La
 * diferencia no es de estilo. Una pantalla de ejecución contesta una pregunta
 * ("¿cuánto me queda?") y para todo lo demás hay que irse a buscar; un
 * dashboard contesta "¿cómo voy?" y te suelta en el sitio donde se arregla.
 *
 * Lo que **no** se hizo, a propósito: abrirlo con el patrimonio neto, que es
 * como abren casi todas las apps de finanzas. El patrimonio neto es una cifra
 * que cambia una vez al mes y sobre la que hoy no se puede hacer nada; quien
 * vive cheque a cheque no abre la app para saber cuánto vale, la abre para
 * saber si le alcanza hasta el viernes. Por eso lo primero es la semana en
 * curso con sus chips: la acción de todos los días se queda en **un toque**,
 * que era lo único bueno que tenía la pantalla anterior y lo único que no se
 * podía perder en la mudanza.
 *
 * Cada tarjeta lleva a su sección. El Dashboard no edita nada que no se pueda
 * deshacer desde donde se ve.
 */

/** Cuántos días hacia adelante mira "Lo que viene". */
const HORIZONTE = 14

/** Cuántos movimientos recientes caben sin volverse la pantalla de Movimientos. */
const CUANTOS_POR_REVISAR = 4

function Tarjeta({
  icono,
  titulo,
  derecha,
  children,
}: {
  icono: React.ReactNode
  titulo: string
  derecha?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="bg-blanco rounded-card shadow-tarjeta flex h-full flex-col p-[15px] panel:p-[18px]">
      <div className="mb-[13px] flex items-center gap-[10px]">
        <div className="bg-carbon text-teal font-serif grid size-7 shrink-0 place-items-center rounded-btn text-cuerpo">
          {icono}
        </div>
        <h3 className="font-serif min-w-0 flex-1 truncate text-titulo font-normal">{titulo}</h3>
        {derecha}
      </div>
      {children}
    </section>
  )
}

/** El enlace al pie de una tarjeta: a dónde se va a hacer algo con esto. */
function Lleva({ texto, alTocar }: { texto: string; alTocar: () => void }) {
  return (
    <button
      type="button"
      onClick={alTocar}
      // `mt-auto` es lo que empareja la fila: el enlace se va al fondo de su
      // tarjeta, así que los de dos tarjetas vecinas quedan a la misma altura.
      // Sin esto, una tarjeta con un renglón y otra con cinco terminan en
      // sitios distintos y el hueco de abajo se lee como algo sin cargar.
      className="text-teal-osc mt-auto flex min-h-11 w-full items-center justify-center gap-[6px] pt-[11px] text-menor font-semibold"
    >
      {texto} →
    </button>
  )
}

/**
 * 1. La semana en curso.
 *
 * El héroe es el mismo componente que tenía Mi semana, no una copia. Los chips
 * viven **dentro** de la tarjeta y no en una banda aparte: sacarlos de aquí
 * convertiría anotar un gasto en dos toques, y anotar es lo que se hace todos
 * los días.
 */
function LaSemanaEnCurso({
  presupuesto,
  alAbrirAnotar,
  alAbrirPagos,
  alAbrirCierre,
  alVerSemana,
}: {
  presupuesto: Presupuesto
  alAbrirAnotar: (() => void) | undefined
  alAbrirPagos: () => void
  alAbrirCierre: (() => void) | undefined
  alVerSemana: () => void
}) {
  const pendientes = presupuesto.pagos.filter((p) => !p.pagado).length
  // "Pagué" no abre una hoja: lleva al detalle de la semana, que es donde vive
  // la checklist. Tener las dos habría sido la misma lista escrita dos veces —y
  // dos listas del mismo dato terminan diciendo cosas distintas—. De paso se
  // gana algo: ahí el pago se marca viendo lo demás que pesa esa semana, en vez
  // de en una lista suelta.
  const CHIPS: { Icono: (p: { tam?: number }) => React.ReactNode; texto: string; alTocar?: () => void }[] = [
    { Icono: IconoAnotar, texto: 'Anotar', ...(alAbrirAnotar ? { alTocar: alAbrirAnotar } : {}) },
    { Icono: IconoPalomita, texto: 'Pagué', alTocar: alAbrirPagos },
    // El documento del Dashboard pide dos chips. Va un tercero porque **cerrar
    // la semana** se quedaba sin ninguna puerta: es un verbo del vocabulario
    // (`CLAUDE.md`) y un flujo de tres preguntas que vivía en el chip "Semana"
    // de la pantalla anterior. Perderlo en la mudanza no era una opción, y
    // ninguna de las seis tarjetas es su sitio.
    { Icono: IconoReloj, texto: 'Cerrar', ...(alAbrirCierre ? { alTocar: alAbrirCierre } : {}) },
  ]
  return (
    <section className="bg-blanco rounded-card shadow-tarjeta flex h-full flex-col p-[15px] panel:p-[18px]">
      <Hero presupuesto={presupuesto} />
      <div className="mt-[13px] flex gap-[7px]">
        {CHIPS.map(({ Icono, texto, alTocar }) => (
          <button
            key={texto}
            type="button"
            onClick={alTocar}
            disabled={!alTocar}
            className="bg-blanco border-linea flex min-h-11 flex-1 items-center justify-center gap-[6px] rounded-chip border px-1 py-[9px] text-menor font-semibold disabled:opacity-50"
          >
            <span className="bg-teal grid size-[20px] shrink-0 place-items-center rounded-chip text-tinta-teal">
              <Icono tam={12} />
            </span>
            {texto}
            {texto === 'Pagué' && pendientes > 0 && (
              <ChipCategoria tono="ambar">{pendientes}</ChipCategoria>
            )}
          </button>
        ))}
      </div>
      <Lleva texto="Ver la semana en el presupuesto" alTocar={alVerSemana} />
    </section>
  )
}

/**
 * 2. Cómo va el reparto.
 *
 * Dos líneas y una píldora: lo gastado contra **el ritmo del plan**, no contra
 * el plan a secas. "Llevas $180 de $300" no dice nada; en martes va fatal y en
 * domingo va perfecto. La cuenta vive en `lib/semanas/ritmo`, pura y con
 * pruebas, porque es de las que se equivocan en silencio.
 */
function ComoVaElReparto({
  presupuesto,
  alVerSemana,
}: {
  presupuesto: Presupuesto
  alVerSemana: () => void
}) {
  const semana = presupuesto.semanas[presupuesto.semanaActiva]
  if (!semana || semana.totalCents <= 0) {
    return (
      <Tarjeta icono={<IconoDinero tam={16} />} titulo="Cómo va el reparto">
        <Vacio>
          Esta semana todavía no tiene nada repartido. Cuando le des trabajo al dinero, aquí
          aparece si vas al ritmo del plan o te estás adelantando.
        </Vacio>
        <Lleva texto="Repartir esta semana" alTocar={alVerSemana} />
      </Tarjeta>
    )
  }

  // El día en curso dentro de la semana, contando el primero como 1. Fuera del
  // mes en curso —mirando agosto en octubre— la semana ya terminó: cuenta
  // entera, que es lo que de verdad pasó.
  const transcurrido = diasEntre(semana.fechaInicio, hoy()) + 1
  const dia = Math.min(Math.max(transcurrido, 0), semana.dias)
  const { esperadoCents, diferenciaCents } = ritmoDelPlan(
    semana.totalCents,
    semana.gastadoCents,
    dia,
    semana.dias,
  )
  const porEncima = diferenciaCents > 0
  const queda = centavos(semana.totalCents - semana.gastadoCents)

  return (
    <Tarjeta
      icono={<IconoDinero tam={16} />}
      titulo="Cómo va el reparto"
      derecha={
        <span
          className={`shrink-0 rounded-chip px-[9px] py-[4px] text-rotulo font-bold ${
            porEncima ? 'bg-brillo-ambar text-ambar-osc' : 'bg-brillo-teal text-teal-osc'
          }`}
        >
          {porEncima ? '+' : '−'}
          {formatearRedondo(centavos(Math.abs(diferenciaCents)))}{' '}
          {porEncima ? 'sobre el ritmo' : 'bajo el ritmo'}
        </span>
      }
    >
      <div className="flex flex-col gap-[13px]">
        <Linea
          rotulo="Llevas gastado"
          valorCents={semana.gastadoCents}
          deCents={semana.totalCents}
          color={colorDeSobre(semana.gastadoCents, semana.totalCents)}
        />
        <Linea
          rotulo={`Al ritmo del plan, día ${dia} de ${semana.dias}`}
          valorCents={esperadoCents}
          deCents={semana.totalCents}
          color="var(--color-carbon-3)"
        />
      </div>
      <div className="border-linea mt-[13px] flex items-baseline justify-between border-t pt-[11px] text-menor">
        <span className="text-texto-2">Te queda de la semana</span>
        <b className={`font-semibold ${claseDeQueda(semana.gastadoCents, semana.totalCents)}`}>
          <Moneda centavos={queda} />
        </b>
      </div>
      <Lleva texto="Ver el reparto de la semana" alTocar={alVerSemana} />
    </Tarjeta>
  )
}

function Linea({
  rotulo,
  valorCents,
  deCents,
  color,
}: {
  rotulo: string
  valorCents: Centavos
  deCents: Centavos
  color: string
}) {
  const parte = deCents > 0 ? Math.round((valorCents / deCents) * 100) : 0
  return (
    <div>
      <div className="mb-[6px] flex items-baseline justify-between gap-2 text-menor">
        <span className="text-texto-2 min-w-0 truncate">{rotulo}</span>
        <b className="shrink-0 font-semibold [font-variant-numeric:tabular-nums]">
          <Moneda centavos={valorCents} /> <span className="text-texto-2 font-normal">de</span>{' '}
          <Moneda centavos={deCents} />
        </b>
      </div>
      <Barra porcentaje={parte} color={color} />
    </div>
  )
}

/**
 * 3. Por revisar.
 *
 * Los movimientos que todavía no ha visto nadie. Con captura manual va a estar
 * vacía casi siempre, y por eso el vacío tenía que decir algo de verdad en vez
 * de quedarse en blanco: "todo revisado" es información, y es la que se busca.
 */
function PorRevisar({
  presupuesto,
  alRevisar,
  alVerMovimientos,
}: {
  presupuesto: Presupuesto
  alRevisar?: ((ids: readonly string[], revisado: boolean) => Promise<void>) | undefined
  alVerMovimientos: () => void
}) {
  const [ocupado, setOcupado] = useState(false)
  const sinRevisar = presupuesto.movimientos.filter((m) => !m.revisado)

  return (
    <Tarjeta
      icono={<IconoMovimientos tam={16} />}
      titulo="Por revisar"
      derecha={
        sinRevisar.length > 0 && alRevisar ? (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              setOcupado(true)
              void alRevisar(
                sinRevisar.map((m) => m.id),
                true,
              ).finally(() => setOcupado(false))
            }}
            className="border-linea text-texto-2 shrink-0 rounded-btn border px-[10px] py-[6px] text-menor font-semibold disabled:opacity-50"
          >
            {ocupado
              ? 'Marcando…'
              : `Marcar ${sinRevisar.length === 1 ? 'el 1' : `los ${sinRevisar.length}`} como ${
                  sinRevisar.length === 1 ? 'revisado' : 'revisados'
                }`}
          </button>
        ) : undefined
      }
    >
      {sinRevisar.length === 0 ? (
        <Vacio>
          Todo revisado. Lo que anotes aparece aquí hasta que lo confirmes, para que nada se
          quede en el sobre equivocado.
        </Vacio>
      ) : (
        <div className="flex flex-col">
          {sinRevisar.slice(0, CUANTOS_POR_REVISAR).map((m) => (
            <div
              key={m.id}
              className="border-linea flex items-center gap-[10px] border-b py-[9px] last:border-b-0"
            >
              <IconoDeCategoria clave={m.icono} size="size-[26px]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-menor font-medium">{m.nombre}</div>
                <div className="text-texto-2 mt-[1px] truncate text-rotulo">{m.categoria}</div>
              </div>
              <span className="shrink-0 text-menor font-semibold [font-variant-numeric:tabular-nums]">
                {m.tipo === 'ingreso' ? '+' : ''}
                {formatearRedondo(m.montoCents)}
              </span>
            </div>
          ))}
          {sinRevisar.length > CUANTOS_POR_REVISAR && (
            <p className="text-texto-2 pt-[9px] text-rotulo">
              y {cuantos(sinRevisar.length - CUANTOS_POR_REVISAR, 'más', 'más')}.
            </p>
          )}
        </div>
      )}
      <Lleva texto="Ver todos los movimientos" alTocar={alVerMovimientos} />
    </Tarjeta>
  )
}

/**
 * 4. Lo que viene.
 *
 * Los pagos de los próximos catorce días. Es el mismo contenido del aviso del
 * domingo, y que se repita está bien: uno llega solo cuando no lo pediste, el
 * otro se consulta cuando ya te acordaste. Que dos cosas digan lo mismo no es
 * duplicar; duplicar sería que lo calcularan por su cuenta.
 */
function LoQueViene({
  presupuesto,
  alVerMes,
}: {
  presupuesto: Presupuesto
  alVerMes: () => void
}) {
  // El día en el calendario del usuario, no en UTC: a las nueve de la noche en
  // California, `getUTCDate` ya dice mañana y "lo que viene" se saltaría un pago.
  const hoyDia = diaDe(hoy())
  const proximos = presupuesto.pagos
    .filter((p) => !p.pagado && p.diaVencimiento >= hoyDia && p.diaVencimiento - hoyDia <= HORIZONTE)
    .sort((a, b) => a.diaVencimiento - b.diaVencimiento)
  const total = centavos(suma(proximos.map((p) => p.montoCents)))

  return (
    <Tarjeta
      icono={<IconoReloj tam={16} />}
      titulo="Lo que viene"
      derecha={
        proximos.length > 0 ? (
          <b className="shrink-0 text-menor font-semibold [font-variant-numeric:tabular-nums]">
            <Moneda centavos={total} />
          </b>
        ) : undefined
      }
    >
      {proximos.length === 0 ? (
        <Vacio>
          Nada vence en los próximos {HORIZONTE} días. Los gastos fijos con día de vencimiento
          aparecen aquí cuando se acercan.
        </Vacio>
      ) : (
        <div className="flex flex-col">
          {proximos.map((p) => (
            <div
              key={p.id}
              className="border-linea flex items-center gap-[10px] border-b py-[9px] text-menor last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.nombre}</div>
                <div className="text-texto-2 mt-[1px] text-rotulo">
                  Vence el {p.diaVencimiento} de {nombreDeMes(presupuesto.mes.mes).toLowerCase()}
                </div>
              </div>
              {p.esEnfoque && <ChipCategoria tono="teal">enfoque</ChipCategoria>}
              <span className="shrink-0 font-semibold [font-variant-numeric:tabular-nums]">
                <Moneda centavos={p.montoCents} />
              </span>
            </div>
          ))}
        </div>
      )}
      <Lleva texto="Ver el mes completo" alTocar={alVerMes} />
    </Tarjeta>
  )
}

/** 5. Salir de deudas: saldo total, la de enfoque y la fecha de libertad. */
function SalirDeDeudas({
  presupuesto,
  alVerDeudas,
}: {
  presupuesto: Presupuesto
  alVerDeudas: () => void
}) {
  const deudas = presupuesto.deudas
  if (deudas.length === 0) {
    return (
      <Tarjeta icono={<IconoDeudas tam={16} />} titulo="Salir de deudas">
        {/* Sin deudas no se felicita ni se recuerda: se dice qué es esto por si
            algún día hace falta, y ya. */}
        <Vacio>Sin deudas por ahora. Las que agregues aparecen aquí con su fecha de libertad.</Vacio>
        <Lleva texto="Ir a Deudas" alTocar={alVerDeudas} />
      </Tarjeta>
    )
  }
  const extra = centavos(
    suma(deudas.map((d) => d.pagoActualCents)) - suma(deudas.map((d) => d.pagoMinimoCents)),
  )
  const plan = simular(deudas, extra, presupuesto.inicioDeudas)
  const enfoque = deudas.find((d) => d.esEnfoque) ?? deudas[0]!
  const total = centavos(suma(deudas.map((d) => d.saldoCents)))
  const pagado = Math.max(0, enfoque.saldoInicialCents - enfoque.saldoCents)

  return (
    <Tarjeta
      icono={<IconoDeudas tam={16} />}
      titulo="Salir de deudas"
      derecha={
        <span className="font-serif shrink-0 text-titulo">
          {plan.fechaLibertad ? mesYAnio(plan.fechaLibertad) : 'Sin fecha'}
        </span>
      }
    >
      <div className="flex items-baseline justify-between text-menor">
        <span className="text-texto-2">Debes en total</span>
        <b className="font-serif text-cifra [font-variant-numeric:tabular-nums]">
          <Moneda centavos={total} />
        </b>
      </div>
      <div className="mt-[13px]">
        <div className="mb-[6px] flex items-baseline justify-between gap-2 text-menor">
          <span className="min-w-0 truncate">
            <b className="font-semibold">{enfoque.nombre}</b>{' '}
            <ChipCategoria tono="teal">enfoque</ChipCategoria>
          </span>
          <span className="text-texto-2 shrink-0 [font-variant-numeric:tabular-nums]">
            <Moneda centavos={enfoque.saldoCents} />
          </span>
        </div>
        {/* La barra mide lo pagado, no lo que falta: es el único número de esta
            app que sube cuando las cosas van bien. */}
        <Barra
          porcentaje={
            enfoque.saldoInicialCents > 0
              ? Math.round((pagado / enfoque.saldoInicialCents) * 100)
              : 0
          }
          color="var(--teal)"
        />
      </div>
      <Lleva texto="Ver todas tus deudas" alTocar={alVerDeudas} />
    </Tarjeta>
  )
}

/** 6. Fondos de reserva. */
function Fondos({
  presupuesto,
  alVerMetas,
}: {
  presupuesto: Presupuesto
  alVerMetas: () => void
}) {
  const fondos = presupuesto.fondos.slice(0, 3)
  return (
    <Tarjeta icono={<IconoMetas tam={16} />} titulo="Fondos de reserva">
      {fondos.length === 0 ? (
        <Vacio>
          Todavía no tienes fondos. Un fondo de reserva es dinero con nombre y fecha: el
          depósito del carro, las vacaciones, el mes de emergencia.
        </Vacio>
      ) : (
        <ListaSeccion columnas="minmax(0,1fr) 40px 76px">
          {fondos.map((fondo) => (
            <FilaFondo
              key={fondo.id}
              nombre={fondo.nombre}
              acumuladoCents={fondo.acumuladoCents}
              metaCents={fondo.metaCents}
              cuando={
                fondo.mesesQueFaltan > 0
                  ? `${fondo.mesObjetivo} · faltan ${cuantos(fondo.mesesQueFaltan, 'mes', 'meses')}`
                  : fondo.mesObjetivo
              }
            />
          ))}
        </ListaSeccion>
      )}
      <Lleva texto="Ver todas tus metas" alTocar={alVerMetas} />
    </Tarjeta>
  )
}

/**
 * Las dos piezas que traía el panel de escritorio y que no caben en ninguna de
 * las seis tarjetas: la invitación a premium y el coach.
 *
 * No se borraron al retirar el panel porque no son adorno — una es cómo se
 * vende la membresía y la otra es un servicio que alguien ya está pagando. Van
 * al final y **condicionadas**: la invitación solo si la cuenta es gratis, el
 * coach solo si lo hay. Una cuenta premium con coach no ve ninguna de las dos
 * y su Dashboard son las seis tarjetas del documento, ni una más.
 */
function Premium() {
  return (
    <div className="bg-carbon rounded-card p-[18px] text-white">
      <div className="bg-teal mb-3 grid size-[26px] place-items-center rounded-btn text-menor text-tinta-teal">
        <IconoEnfoque tam={12} />
      </div>
      <h4 className="font-serif mb-2 text-titulo leading-[1.15] font-normal">Conecta tu banco</h4>
      <p className="text-texto-claro-3 mb-[13px] text-menor leading-[1.5]">
        La app trae tus gastos y tú solo los mandas a su sobre. Incluye avisos al teléfono y modo
        pareja.
      </p>
      <button
        type="button"
        className="bg-teal min-h-11 rounded-btn px-[15px] py-[10px] text-menor font-bold text-tinta-teal"
      >
        Hazte Premium
      </button>
      <div className="text-texto-claro-3 mt-[9px] text-rotulo">$8 al mes · o $79 al año</div>
    </div>
  )
}

function Coach({ coach }: { coach: NonNullable<Presupuesto['coach']> }) {
  return (
    <Tarjeta icono={<IconoCoach tam={16} />} titulo="Tu coach">
      <div className="flex items-center gap-[11px]">
        <div className="bg-carbon text-teal font-serif grid size-[38px] shrink-0 place-items-center rounded-chip text-titulo">
          {coach.iniciales}
        </div>
        <div>
          <div className="text-menor font-semibold">{coach.titulo}</div>
          <div className="text-texto-2 mt-[2px] text-menor">{coach.detalle}</div>
        </div>
      </div>
    </Tarjeta>
  )
}

export function Dashboard({
  presupuesto,
  ir,
  alAnotar,
  alCerrarSemana,
  alRevisar,
  alCrearCategoria,
}: {
  presupuesto: Presupuesto
  ir: (destino: Ruta | Destino) => void
  /** Ausentes con los datos de ejemplo: la demostración se ve pero no se toca. */
  alAnotar?: AlAnotar | undefined
  alCrearCategoria?: AlCrearCategoria | undefined
  alCerrarSemana?: ((r: RespuestaCierre) => Promise<void>) | undefined
  alRevisar?: ((ids: readonly string[], revisado: boolean) => Promise<void>) | undefined
}) {
  const [anotando, setAnotando] = useState(false)
  const [cerrando, setCerrando] = useState(false)

  const semanaActual = presupuesto.semanas[presupuesto.semanaActiva]?.numero
  const verSemana = () =>
    ir(semanaActual === undefined ? { ruta: 'mes' } : { ruta: 'mes', semana: semanaActual })

  return (
    <>
      {/*
        Una columna en el teléfono y dos a partir del corte, con la semana en
        curso cruzando las dos: es la tarjeta que trae el héroe y los chips, y
        partida a la mitad el número grande dejaría de serlo.
      */}
      <div className="grid gap-3 panel:grid-cols-2">
        <div className="panel:col-span-2">
          <LaSemanaEnCurso
            presupuesto={presupuesto}
            alAbrirAnotar={alAnotar ? () => setAnotando(true) : undefined}
            alAbrirPagos={verSemana}
            alAbrirCierre={alCerrarSemana ? () => setCerrando(true) : undefined}
            alVerSemana={verSemana}
          />
        </div>
        <ComoVaElReparto presupuesto={presupuesto} alVerSemana={verSemana} />
        <PorRevisar
          presupuesto={presupuesto}
          alRevisar={alRevisar}
          alVerMovimientos={() => ir('movimientos')}
        />
        <LoQueViene presupuesto={presupuesto} alVerMes={() => ir('mes')} />
        <SalirDeDeudas presupuesto={presupuesto} alVerDeudas={() => ir('deudas')} />
        <div className="panel:col-span-2">
          <Fondos presupuesto={presupuesto} alVerMetas={() => ir('metas')} />
        </div>
        {presupuesto.usuario.nivel !== 'premium' && <Premium />}
        {presupuesto.coach && <Coach coach={presupuesto.coach} />}
      </div>

      {anotando && alAnotar && (
        <Anotar
          presupuesto={presupuesto}
          alAnotar={alAnotar}
          {...(alCrearCategoria ? { alCrearCategoria } : {})}
          alCerrar={() => setAnotando(false)}
        />
      )}
      {cerrando && alCerrarSemana && (
        <CerrarSemana
          presupuesto={presupuesto}
          alCerrarSemana={alCerrarSemana}
          alCerrar={() => setCerrando(false)}
        />
      )}
    </>
  )
}
