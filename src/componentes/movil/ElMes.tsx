import { Fragment, useState } from 'react'
import type { LineaMes, Presupuesto, SemanaDelPresupuesto } from '../../datos/tipos'
import { type Centavos, centavos, formatearRedondo, suma } from '../../lib/dinero'
import { diaDe } from '../../lib/fecha'
import { alturas } from '../../lib/mes/barras'
import {
  ABIERTOS_POR_OMISION,
  alternar,
  escribirAbiertos,
  leerAbiertos,
  type ClaveGrupo,
} from '../../lib/mes/grupos'
import type { ClaveIcono } from '../../lib/iconos'
import type { Pago } from '../../datos/tipos'
import { semanaDeFijo } from '../../lib/semanas'
import { cuantos, nombreDeMes } from '../textos'
import {
  CeldaCifra,
  CeldaNombre,
  CeldasDeAvance,
  CeldasDeTresCifras,
  Casilla,
  ChipCategoria,
  Fila,
  FilaAgregar,
  FilaFondo,
  ListaSeccion,
  Moneda,
  Segmentado,
  Vacio,
} from '../base'
import { IconoAbrir, IconoDinero, IconoMetas } from '../iconos'
import { CerrarMes } from './CerrarMes'
import { NuevaCategoria } from './NuevaCategoria'
import { PonerMonto } from './PonerMonto'
import { PonerSemana } from './PonerSemana'

/**
 * El mes — presupuesto base cero, con la semana como eje.
 *
 * El control Semanas · Cheques · Mes elige el lente. En Semanas, las 4–5 del
 * calendario con su monto: adentro los fijos que caen por fecha (solo lectura)
 * y los sobres repartibles editables por semana. En Cheques, la vista derivada:
 * qué cubre cada uno, sin asignarse aparte. En Mes, el árbol de categorías de
 * siempre. Arriba, el selector de mes con barras y entra / sale / sobró.
 */

const VISTAS = ['Entra', 'Sale', 'Sobró'] as const

function SelectorDeMes({
  presupuesto,
  alVerMes,
}: {
  presupuesto: Presupuesto
  alVerMes?: (anio: number, mes: number) => void
}) {
  const [vista, setVista] = useState<string>('Sale')

  // Las barras enseñan lo mismo que el número de arriba. Cambiar de vista
  // cambia la escala, y así se compara lo que se está mirando y no otra cosa.
  const deCadaMes = presupuesto.mesesPasados.map((m) =>
    vista === 'Entra' ? m.entraCents : vista === 'Sale' ? m.saleCents : m.sobroCents,
  )
  const altos = alturas(deCadaMes)

  const sobra = presupuesto.sinRepartirCents
  const cifra =
    vista === 'Entra' ? presupuesto.entraCents : vista === 'Sale' ? presupuesto.saleCents : sobra

  return (
    <div className="bg-blanco rounded-card shadow-tarjeta px-[14px] pt-[15px] pb-3">
      <div className="mb-[14px] text-center">
        <div
          className={`font-serif text-heroe leading-none [font-variant-numeric:tabular-nums] ${
            vista === 'Sobró' && sobra !== 0 ? 'text-ambar' : 'text-teal-osc'
          }`}
        >
          {formatearRedondo(cifra)}
        </div>
        <div className="text-texto-2 mt-[3px] text-menor">
          {vista === 'Sobró'
            ? sobra === 0
              ? 'Sin repartir — tu presupuesto cuadra'
              : sobra > 0
                ? 'Sin repartir — todavía falta darle destino'
                : 'Te pasaste: repartiste más de lo que entra'
            : vista === 'Entra'
              ? `Entra este mes · ${cuantos(presupuesto.periodos.length, 'cheque', 'cheques')}`
              : 'Sale este mes · repartido en tus cheques'}
        </div>
      </div>

      <div className="flex h-[112px] items-end gap-2">
        {presupuesto.mesesPasados.map((m, i) => {
          const activo = m.anio === presupuesto.mes.anio && m.mes === presupuesto.mes.mes
          const sePuedeAbrir = Boolean(alVerMes) && !activo && m.alcanzable
          return (
            <button
              key={`${m.anio}-${m.mes}`}
              type="button"
              disabled={!sePuedeAbrir}
              onClick={() => alVerMes?.(m.anio, m.mes)}
              // El mes que no se alcanza sí se dibuja: enseña que hubo historia
              // y que hace falta premium para entrar, en vez de esconderla.
              aria-label={
                activo
                  ? `${m.etiqueta}, el que estás viendo`
                  : m.alcanzable
                    ? `Ver ${m.etiqueta}`
                    : `${m.etiqueta} — solo en premium`
              }
              aria-current={activo ? 'true' : undefined}
              className="flex h-full flex-1 flex-col items-center justify-end gap-[7px]"
            >
              <div className="bg-gris relative h-full w-full max-w-[24px] rounded-btn">
                <div
                  className={`absolute bottom-0 left-0 w-full rounded-btn ${
                    activo
                      ? 'bg-[linear-gradient(180deg,var(--color-teal),var(--color-teal-hondo))]'
                      : m.alcanzable
                        ? 'bg-tenue'
                        : 'bg-linea'
                  }`}
                  style={{ height: `${altos[i] ?? 0}%` }}
                />
              </div>
              <div className={`text-rotulo ${activo ? 'text-texto font-bold' : 'text-texto-2'}`}>
                {m.etiqueta}
              </div>
            </button>
          )
        })}
      </div>

      <Segmentado opciones={VISTAS} activa={vista} alElegir={setVista} className="mt-[14px]" />
    </div>
  )
}

/**
 * Las columnas de las listas de esta pantalla. Se declaran aquí y no dentro de
 * cada fila: es lo que hace que los montos de todas las categorías caigan en la
 * misma vertical y se puedan comparar de un vistazo.
 */
const CATEGORIAS = {
  columnas: 'minmax(0,1fr) 36px 84px',
  columnasPanel: 'minmax(150px,1fr) 88px minmax(90px,300px) 88px',
}
const FONDOS = {
  columnas: 'minmax(0,1fr) 36px 84px',
  columnasPanel: 'minmax(150px,1fr) minmax(90px,300px) 140px',
}

/**
 * La sangría de una fila hija, con el hilo que la cuelga de su grupo: una línea
 * vertical desde arriba hasta la mitad de la fila y una horizontal que entra al
 * icono. Sin el hilo, una fila sangrada se lee como una fila mal alineada.
 */
const HILO =
  'relative pl-[14px] panel:pl-[27px]' +
  " before:absolute before:left-[5px] before:top-[-50%] before:bottom-1/2 before:w-px before:bg-linea before:content-['']" +
  " after:absolute after:left-[5px] after:top-1/2 after:h-px after:w-[6px] after:bg-linea after:content-['']" +
  ' panel:before:left-[11px] panel:after:left-[11px] panel:after:w-[9px]'

/**
 * Las tres cifras de las vistas por semana y por cheque.
 *
 * En el panel caben las tres con su barra: nombre · Planeado · barra ·
 * Gastado · Queda. En el teléfono no —tres columnas de dinero en 380px le
 * dejan cuarenta píxeles al nombre—, así que ahí van la barra y Queda con
 * Planeado de referencia debajo. Las columnas que sobran salen de la rejilla
 * con `display:none`; ver `CeldasDeTresCifras`.
 */
const TRES_CIFRAS = {
  columnas: 'minmax(0,1fr) 36px 104px',
  columnasPanel: 'minmax(150px,1fr) 92px minmax(80px,240px) 92px 100px',
}

/** Una cifra suelta de fila hija: va en la columna de Queda, no en la primera. */
const EN_LA_ULTIMA = 'col-start-3 panel:col-start-5'

/**
 * El eje que se está mirando. **Lo decide la puerta por la que entraste**, no
 * lo que miraste la última vez.
 *
 * Esta pantalla tiene dos entradas y dos propósitos, y confundirlos era el
 * problema:
 *
 * - **Presupuesto mensual**, el destino del menú, es para *mirar*: cuánto se
 *   fue en comida en todo el mes, cuánto en gasolina, cuánto queda de cada
 *   sobre. Abre en **Mes**.
 * - **Una semana del riel** (`?semana=3`) es el lugar de *trabajo*: ahí se
 *   reparte el dinero y se marcan los pagos. Abre en **Semanas**, con esa
 *   semana desplegada.
 *
 * Antes las dos abrían en Semanas y el eje se recordaba en `localStorage`, así
 * que quien acababa de repartir una semana y tocaba "Presupuesto mensual"
 * volvía a caer en el reparto — el destino del menú no llevaba a ningún sitio
 * distinto del que ya estaba. La memoria servía a la pantalla y le estorbaba
 * al usuario.
 *
 * El segmentado sigue ahí para cambiar de eje una vez dentro. Lo que ya no
 * hace es decidir a dónde llegas.
 */
const EJES = ['Semanas', 'Cheques', 'Mes'] as const
type Eje = (typeof EJES)[number]

/** Qué grupos están abiertos, recordado entre visitas. */
const LLAVE = 'jubileo:grupos-de-el-mes'

function useAbiertos(): [ClaveGrupo[], (nuevos: ClaveGrupo[]) => void] {
  // Con `useState(fn)` la lectura pasa una sola vez, en el primer render, y no
  // en cada uno. En un navegador sin `localStorage` —Safari privado de hace
  // unos años— leer truena, y una preferencia de cómo se mira no puede tumbar
  // la pantalla del presupuesto.
  const [abiertos, setAbiertos] = useState<ClaveGrupo[]>(() => {
    try {
      return leerAbiertos(localStorage.getItem(LLAVE))
    } catch {
      return [...ABIERTOS_POR_OMISION]
    }
  })
  return [
    abiertos,
    (nuevos) => {
      setAbiertos(nuevos)
      try {
        localStorage.setItem(LLAVE, escribirAbiertos(nuevos))
      } catch {
        // Se queda abierto en esta visita y ya. No hay nada que avisarle.
      }
    },
  ]
}

export function ElMes({
  presupuesto,
  alPonerMonto,
  alPonerSemana,
  alMarcarPago,
  alRenombrar,
  alQuitar,
  alCrearCategoria,
  alCambiarIcono,
  alCerrarMes,
  alVerMes,
  semanaPedida,
}: {
  presupuesto: Presupuesto
  /** Ausentes con los datos de ejemplo: la demostración se ve pero no se edita. */
  alPonerMonto?: (categoriaId: string, montoCents: Centavos) => Promise<void>
  alPonerSemana?: (categoriaId: string, semana: number, montoCents: Centavos) => Promise<void>
  alMarcarPago?: (pago: Pago) => Promise<void>
  alRenombrar?: (categoriaId: string, nombre: string) => Promise<void>
  alQuitar?: (categoriaId: string) => Promise<void>
  alCrearCategoria?: (
    grupo: 'fijo' | 'variable',
    nombre: string,
    diaVencimiento: number | undefined,
    icono: ClaveIcono | null,
  ) => Promise<void>
  alCambiarIcono?: (categoriaId: string, icono: ClaveIcono) => Promise<void>
  alCerrarMes?: () => Promise<void>
  alVerMes?: (anio: number, mes: number) => void
  /**
   * La semana que hay que dejar abierta, si alguien lo pidió — el rail del
   * sidebar manda `#/mes?semana=3`. Fuerza también el eje de Semanas: quien
   * toca una semana viene a verla, no a que le enseñen el árbol del mes.
   */
  semanaPedida?: number | undefined
}) {
  const [editando, setEditando] = useState<LineaMes | null>(null)
  const [editandoSemana, setEditandoSemana] = useState<{
    sobre: LineaMes
    semana: SemanaDelPresupuesto
  } | null>(null)
  const [creando, setCreando] = useState<'fijo' | 'variable' | null>(null)
  // Cuál casilla está esperando al servidor. Se marca al volver, no al tocar:
  // una palomita que aparece y se deshace sola es peor que una que tarda.
  const [pagando, setPagando] = useState<string | null>(null)
  const [abiertos, setAbiertos] = useAbiertos()
  const [eje, setEje] = useState<Eje>(semanaPedida === undefined ? 'Mes' : 'Semanas')
  // La semana en curso nace abierta: es a la que se viene. Si vienes del rail
  // del sidebar, la que pediste.
  const [semanasAbiertas, setSemanasAbiertas] = useState<number[]>(() => [
    semanaPedida ?? presupuesto.semanas[presupuesto.semanaActiva]?.numero ?? 1,
  ])

  // La puerta manda **también cuando la pantalla ya está montada**. Ir del riel
  // al destino del menú no la vuelve a montar —solo cambia el fragmento— así
  // que `useState` no se entera y el eje se quedaba donde estaba: quien acababa
  // de repartir una semana y tocaba "Presupuesto mensual" seguía viendo el
  // reparto. Se comprueba en las dos direcciones.
  const [ultimaPedida, setUltimaPedida] = useState(semanaPedida)
  if (semanaPedida !== ultimaPedida) {
    setUltimaPedida(semanaPedida)
    setEje(semanaPedida === undefined ? 'Mes' : 'Semanas')
    if (semanaPedida !== undefined && !semanasAbiertas.includes(semanaPedida)) {
      setSemanasAbiertas([...semanasAbiertas, semanaPedida])
    }
  }
  const editable = Boolean(alPonerMonto && presupuesto.mesId)

  // Lo que se reparte por semana: la mayordomía y los sobres variables. Los
  // fijos y las deudas no — caen solos en la semana de su vencimiento.
  const repartibles = [presupuesto.mayordomia, ...presupuesto.variables]
  const fijosYDeudas = [...presupuesto.fijos, ...presupuesto.lineasDeuda]
  const asignadoEn = (categoriaId: string, semana: number): Centavos =>
    centavos(
      suma(
        presupuesto.planSemanal
          .filter((a) => a.categoriaId === categoriaId && a.semana === semana)
          .map((a) => a.montoCents),
      ),
    )

  // La fila entera es el botón, como en el mockup: no hay controles sueltos
  // dentro del renglón. Antes el monto era un botón con borde de 44px de alto
  // que se comía la mitad de la fila.
  const filaHija = (linea: LineaMes, editableAqui: boolean) => (
    <Fila
      key={linea.id}
      {...(editableAqui
        ? { alTocar: () => setEditando(linea), etiqueta: `Poner el monto de ${linea.nombre}` }
        : {})}
    >
      <CeldaNombre
        className={HILO}
        clave={linea.icono}
        {...(linea.detalle ? { detalle: linea.detalle } : {})}
      >
        {linea.nombre}
      </CeldaNombre>
      <CeldasDeAvance
        gastadoCents={linea.gastadoCents}
        delMesCents={linea.montoMensualCents}
      />
    </Fila>
  )

  // Los cuatro grupos que suman lo que sale del mes. Los fondos de reserva no
  // están aquí: hoy no tienen categoría, así que su dinero no entra en el
  // reparto — van en su propia lista, abajo, para no decir que sí.
  const grupos = [
    {
      clave: 'mayordomia' as const,
      titulo: 'Mayordomía',
      lineas: [presupuesto.mayordomia],
      vacio: 'Lo primero que sale, antes que todo lo demás.',
    },
    {
      clave: 'fijo' as const,
      titulo: 'Gastos fijos',
      lineas: presupuesto.fijos,
      agregar: 'Agregar un gasto fijo',
      vacio: 'La renta, la luz, el seguro: lo que llega todos los meses con fecha.',
    },
    {
      clave: 'variable' as const,
      titulo: 'Sobres variables',
      lineas: presupuesto.variables,
      agregar: 'Agregar un sobre',
      vacio: 'Comida, gasolina, gastos personales: lo que cambia de mes a mes.',
    },
    // Las deudas se ven y no se tocan desde aquí: su monto mensual cuelga de la
    // deuda, y cambiarlo por un lado sin el otro las deja diciendo cosas
    // distintas. Se editan en su pantalla.
    {
      clave: 'deuda' as const,
      titulo: 'Deudas',
      lineas: presupuesto.lineasDeuda,
      vacio: 'Sin deudas por ahora. Las que agregues en Deudas aparecen aquí.',
    },
  ]
  const cuantasCategorias = grupos.reduce((n, g) => n + g.lineas.length, 0)

  const nombreDelMes = nombreDeMes(presupuesto.mes.mes).toLowerCase()

  return (
    <div className="flex flex-col gap-3">
      <SelectorDeMes presupuesto={presupuesto} {...(alVerMes ? { alVerMes } : {})} />

      <Segmentado opciones={EJES} activa={eje} alElegir={(v) => setEje(v as Eje)} />

      {eje === 'Semanas' && (
        <ListaSeccion
          titulo={`Semanas de ${nombreDelMes}`}
          icono={<IconoDinero tam={15} />}
          dato={cuantos(presupuesto.semanas.length, 'semana', 'semanas')}
          encabezados={['Semana', null, 'Queda']}
          encabezadosPanel={['Semana', 'Planeado', null, 'Gastado', 'Queda']}
          {...TRES_CIFRAS}
        >
          {presupuesto.semanas.map((semana, i) => {
            const abierta = semanasAbiertas.includes(semana.numero)
            const fijosDeLaSemana = fijosYDeudas.filter(
              (l) => semanaDeFijo(l.diaVencimiento, presupuesto.semanas) === semana.numero,
            )
            const pagosDeLaSemana = presupuesto.pagosPorSemana[i] ?? []
            return (
              <Fragment key={semana.numero}>
                <Fila
                  abierta={abierta}
                  alTocar={() =>
                    setSemanasAbiertas(
                      abierta
                        ? semanasAbiertas.filter((n) => n !== semana.numero)
                        : [...semanasAbiertas, semana.numero],
                    )
                  }
                  etiqueta={`${abierta ? 'Cerrar' : 'Abrir'} la semana ${semana.numero}`}
                  className="bg-blanco-2"
                >
                  <div className="flex min-w-0 items-center gap-[9px]">
                    <IconoAbrir
                      tam={14}
                      className={`text-texto-2 shrink-0 ${abierta ? 'rotate-90' : ''}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-cuerpo font-semibold">
                          Semana {semana.numero}
                        </span>
                        {/* Hasta aquí se vence más de lo que ha llegado. Informa, no bloquea. */}
                        {semana.apretada && <ChipCategoria tono="ambar">Apretada</ChipCategoria>}
                      </div>
                      <div className="text-texto-2 mt-[1px] text-rotulo">
                        Del {diaDe(semana.fechaInicio)} al {diaDe(semana.fechaFin)}
                      </div>
                    </div>
                  </div>
                  <CeldasDeTresCifras
                    planeadoCents={semana.totalCents}
                    gastadoCents={semana.gastadoCents}
                    gastadoEnMovil={abierta}
                  />
                </Fila>

                {/*
                  Lo fijo cae por fecha: su semana no se escoge. Lo que sí se
                  hace aquí es **marcarlo pagado** — la checklist se mudó desde
                  la pantalla de inicio, y este es su sitio: junto al resto de
                  lo que pesa esa semana, no en una lista aparte que solo
                  enseñaba la semana de hoy.
                */}
                {abierta &&
                  fijosDeLaSemana.map((linea) => {
                    const pago = pagosDeLaSemana.find((p) => p.id === linea.id)
                    return (
                      <Fila key={`f-${linea.id}`}>
                        <CeldaNombre
                          className={HILO}
                          clave={linea.icono}
                          detalle={
                            pago?.pagado
                              ? `Venció el ${pago.diaVencimiento} · pagado`
                              : (linea.detalle ?? '')
                          }
                        >
                          {linea.nombre}
                        </CeldaNombre>
                        {pago && (
                          <div className="col-start-2 flex justify-end panel:col-start-4">
                            <Casilla
                              marcada={pago.pagado}
                              etiqueta={pago.nombre}
                              ocupada={pagando === pago.id}
                              {...(alMarcarPago
                                ? {
                                    alCambiar: () => {
                                      setPagando(pago.id)
                                      void alMarcarPago(pago).finally(() => setPagando(null))
                                    },
                                  }
                                : {})}
                            />
                          </div>
                        )}
                        <CeldaCifra
                          apagada
                          className={`${EN_LA_ULTIMA} ${pago?.pagado ? 'line-through' : ''}`}
                        >
                          <Moneda centavos={linea.montoMensualCents} />
                        </CeldaCifra>
                      </Fila>
                    )
                  })}

                {/* Los sobres sí se presupuestan por semana: aquí se decide. */}
                {abierta &&
                  repartibles.map((sobre) => {
                    const asignado = asignadoEn(sobre.id, semana.numero)
                    const sePuede = Boolean(alPonerSemana && presupuesto.mesId)
                    return (
                      <Fila
                        key={`s-${sobre.id}`}
                        {...(sePuede
                          ? {
                              alTocar: () => setEditandoSemana({ sobre, semana }),
                              etiqueta: `Poner ${sobre.nombre} en la semana ${semana.numero}`,
                            }
                          : {})}
                      >
                        <CeldaNombre
                          className={HILO}
                          clave={sobre.icono}
                          detalle={`de ${formatearRedondo(sobre.montoMensualCents)} al mes`}
                        >
                          {sobre.nombre}
                        </CeldaNombre>
                        <CeldaCifra className={EN_LA_ULTIMA}>
                          <Moneda centavos={asignado} />
                        </CeldaCifra>
                      </Fila>
                    )
                  })}
              </Fragment>
            )
          })}
        </ListaSeccion>
      )}

      {eje === 'Cheques' && (
        <ListaSeccion
          titulo={`Cheques de ${nombreDelMes}`}
          icono={<IconoDinero tam={15} />}
          dato={cuantos(presupuesto.periodos.length, 'cheque', 'cheques')}
          // Para un cheque las tres cifras se llaman distinto porque miden
          // otra cosa: lo que entra, lo que ya tiene comprometido y lo que le
          // sobra. La aritmética es la misma —Entra − Cubre = Queda— y por eso
          // usan la misma pieza.
          encabezados={['Cheque', null, 'Queda']}
          encabezadosPanel={['Cheque', 'Entra', null, 'Cubre', 'Queda']}
          {...TRES_CIFRAS}
        >
          {presupuesto.periodos.map((periodo, i) => {
            // Lo que entra se reconstruye de las dos cifras que el mapeo ya
            // publica —`libre = entra − cubre`— en vez de volver a leer el
            // ingreso del periodo. Así Entra − Cubre = Queda no es una promesa
            // de la vista: es cómo se armó el número.
            const cubre = presupuesto.cubrePorPeriodoCents[i] ?? centavos(0)
            const queda = presupuesto.libreporPeriodoCents[i] ?? centavos(0)
            return (
            <Fila key={periodo.numero}>
              <div className="flex min-w-0 items-center gap-2 py-[7px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-cuerpo font-medium">
                      Cheque {periodo.numero}
                    </span>
                    {periodo.esExtra && <ChipCategoria tono="teal">Extra</ChipCategoria>}
                  </div>
                  <div className="text-texto-2 mt-[1px] truncate text-rotulo">
                    Llega el {diaDe(periodo.fechaPago)}
                  </div>
                </div>
              </div>
              <CeldasDeTresCifras
                planeadoCents={centavos(cubre + queda)}
                gastadoCents={cubre}
              />
            </Fila>
            )
          })}
          <Vacio>
            Esta vista se deriva sola de las fechas: cada cheque cubre lo que se vence hasta que
            llega el siguiente, y el extra llega entero. Lo que se presupuesta son las semanas.
          </Vacio>
        </ListaSeccion>
      )}

      {eje === 'Mes' && (
      <ListaSeccion
        titulo={`Categorías de ${nombreDeMes(presupuesto.mes.mes).toLowerCase()}`}
        icono={<IconoDinero tam={15} />}
        dato={cuantos(cuantasCategorias, 'categoría', 'categorías')}
        encabezados={['Categoría', null, 'Gastado']}
        encabezadosPanel={['Categoría', 'Gastado', null, 'Del mes']}
        {...CATEGORIAS}
      >
        {grupos.map((grupo) => {
          const abierto = abiertos.includes(grupo.clave)
          const total = centavos(suma(grupo.lineas.map((l) => l.montoMensualCents)))
          const gastado = centavos(suma(grupo.lineas.map((l) => l.gastadoCents)))
          const puedeEditar = editable && grupo.clave !== 'deuda'
          return (
            <Fragment key={grupo.clave}>
              <Fila
                abierta={abierto}
                alTocar={() => setAbiertos(alternar(abiertos, grupo.clave))}
                etiqueta={`${abierto ? 'Cerrar' : 'Abrir'} ${grupo.titulo}`}
                className="bg-blanco-2"
              >
                <div className="flex min-w-0 items-center gap-[9px]">
                  <IconoAbrir
                    tam={14}
                    className={`text-texto-2 shrink-0 ${abierto ? 'rotate-90' : ''}`}
                  />
                  <span className="bg-gris border-linea text-texto-2 grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-chip border px-[5px] text-rotulo font-bold">
                    {grupo.lineas.length}
                  </span>
                  <span className="truncate text-cuerpo font-semibold">{grupo.titulo}</span>
                </div>
                <CeldasDeAvance gastadoCents={gastado} delMesCents={total} />
              </Fila>
              {abierto && grupo.lineas.length === 0 && <Vacio>{grupo.vacio}</Vacio>}
              {abierto && grupo.lineas.map((l) => filaHija(l, puedeEditar))}
              {abierto && grupo.agregar && alCrearCategoria && (
                <FilaAgregar
                  texto={grupo.agregar}
                  alTocar={() => setCreando(grupo.clave === 'fijo' ? 'fijo' : 'variable')}
                />
              )}
            </Fragment>
          )
        })}
      </ListaSeccion>
      )}

      {editandoSemana && alPonerSemana && (
        <PonerSemana
          sobre={editandoSemana.sobre}
          semana={editandoSemana.semana}
          asignadoCents={asignadoEn(editandoSemana.sobre.id, editandoSemana.semana.numero)}
          alGuardar={(monto) =>
            alPonerSemana(editandoSemana.sobre.id, editandoSemana.semana.numero, monto)
          }
          alCerrar={() => setEditandoSemana(null)}
        />
      )}

      {editando && alPonerMonto && (
        <PonerMonto
          linea={editando}
          diasPorSemana={presupuesto.semanas.map((s) => s.dias)}
          alGuardar={(monto) => alPonerMonto(editando.id, monto)}
          {...(alRenombrar ? { alRenombrar: (n: string) => alRenombrar(editando.id, n) } : {})}
          {...(alCambiarIcono
            ? { alCambiarIcono: (i: ClaveIcono) => alCambiarIcono(editando.id, i) }
            : {})}
          {...(alQuitar ? { alQuitar: () => alQuitar(editando.id) } : {})}
          alCerrar={() => setEditando(null)}
        />
      )}

      {creando && alCrearCategoria && (
        <NuevaCategoria
          grupo={creando}
          alCrear={(nombre, dia, icono) => alCrearCategoria(creando, nombre, dia, icono)}
          alCerrar={() => setCreando(null)}
        />
      )}

      <ListaSeccion
        titulo="Fondos de reserva"
        icono={<IconoMetas tam={15} />}
        encabezados={['Fondo', null, 'Llevas']}
        {...FONDOS}
      >
        {presupuesto.fondos.length === 0 && (
          <Vacio>
            Un fondo de reserva es dinero apartado para lo que ya sabes que
            viene: las llantas, la Navidad, el viaje.
          </Vacio>
        )}
        {presupuesto.fondos.slice(0, 2).map((fondo) => (
          <FilaFondo
            key={fondo.id}
            nombre={fondo.nombre}
            acumuladoCents={fondo.acumuladoCents}
            metaCents={fondo.metaCents}
            cuando={
              <>
                {fondo.mesObjetivo} · <Moneda centavos={fondo.porChequeCents} /> por cheque
              </>
            }
          />
        ))}
      </ListaSeccion>

      {alCerrarMes && <CerrarMes presupuesto={presupuesto} alCerrar={alCerrarMes} />}
    </div>
  )
}
