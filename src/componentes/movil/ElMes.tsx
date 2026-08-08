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
import { semanaDeFijo } from '../../lib/semanas'
import { nombreDeMes } from '../textos'
import {
  CeldaCifra,
  CeldaNombre,
  CeldasDeAvance,
  ChipCategoria,
  Fila,
  FilaAgregar,
  FilaFondo,
  ListaSeccion,
  Moneda,
  Segmentado,
  Vacio,
} from '../base'
import { IconoAbrir, IconoDeClave, IconoDinero, IconoMetas } from '../iconos'
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
    <div className="bg-blanco border-linea rounded-[15px] border px-[14px] pt-[15px] pb-3">
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
              ? `Entra este mes · ${presupuesto.periodos.length} cheques`
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
              <div className="bg-gris relative h-full w-full max-w-[24px] rounded-[7px]">
                <div
                  className={`absolute bottom-0 left-0 w-full rounded-[7px] ${
                    activo
                      ? 'bg-[linear-gradient(180deg,#0ABBB4,#0A847F)]'
                      : m.alcanzable
                        ? 'bg-[#B9C2BF]'
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

/** Las dos columnas de las vistas por semana y por cheque: nombre y cifra. */
const DOS_COLUMNAS = {
  columnas: 'minmax(0,1fr) 104px',
  columnasPanel: 'minmax(150px,1fr) 150px',
}

/** El eje que se está mirando, recordado entre visitas. */
const EJES = ['Semanas', 'Cheques', 'Mes'] as const
type Eje = (typeof EJES)[number]
const LLAVE_EJE = 'jubileo:eje-de-el-mes'

function useEje(): [Eje, (nuevo: Eje) => void] {
  const [eje, setEje] = useState<Eje>(() => {
    try {
      const guardado = localStorage.getItem(LLAVE_EJE)
      return (EJES as readonly string[]).includes(guardado ?? '') ? (guardado as Eje) : 'Semanas'
    } catch {
      return 'Semanas'
    }
  })
  return [
    eje,
    (nuevo) => {
      setEje(nuevo)
      try {
        localStorage.setItem(LLAVE_EJE, nuevo)
      } catch {
        // Se queda en esta visita y ya.
      }
    },
  ]
}

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
  alRenombrar,
  alQuitar,
  alCrearCategoria,
  alCerrarMes,
  alVerMes,
}: {
  presupuesto: Presupuesto
  /** Ausentes con los datos de ejemplo: la demostración se ve pero no se edita. */
  alPonerMonto?: (categoriaId: string, montoCents: Centavos) => Promise<void>
  alPonerSemana?: (categoriaId: string, semana: number, montoCents: Centavos) => Promise<void>
  alRenombrar?: (categoriaId: string, nombre: string) => Promise<void>
  alQuitar?: (categoriaId: string) => Promise<void>
  alCrearCategoria?: (
    grupo: 'fijo' | 'variable',
    nombre: string,
    diaVencimiento: number | undefined,
  ) => Promise<void>
  alCerrarMes?: () => Promise<void>
  alVerMes?: (anio: number, mes: number) => void
}) {
  const [editando, setEditando] = useState<LineaMes | null>(null)
  const [editandoSemana, setEditandoSemana] = useState<{
    sobre: LineaMes
    semana: SemanaDelPresupuesto
  } | null>(null)
  const [creando, setCreando] = useState<'fijo' | 'variable' | null>(null)
  const [abiertos, setAbiertos] = useAbiertos()
  const [eje, setEje] = useEje()
  // La semana en curso nace abierta: es a la que se viene.
  const [semanasAbiertas, setSemanasAbiertas] = useState<number[]>(() => [
    presupuesto.semanas[presupuesto.semanaActiva]?.numero ?? 1,
  ])
  const editable = Boolean(alPonerMonto && presupuesto.mesId)
  // Los cheques extra no se reparten: lo que caiga ahí es de más, no del mes.
  const chequesQueSeReparten = presupuesto.periodos.filter((p) => !p.esExtra).length

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
        icono={<IconoDeClave clave={linea.icono} tam={13} />}
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
          dato={`${presupuesto.semanas.length} semanas`}
          encabezados={['Semana', 'Monto']}
          {...DOS_COLUMNAS}
        >
          {presupuesto.semanas.map((semana) => {
            const abierta = semanasAbiertas.includes(semana.numero)
            const fijosDeLaSemana = fijosYDeudas.filter(
              (l) => semanaDeFijo(l.diaVencimiento, presupuesto.semanas) === semana.numero,
            )
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
                  className="bg-[#FBFCFB]"
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
                  <CeldaCifra>
                    <Moneda centavos={semana.totalCents} />
                    <div className="text-texto-2 text-rotulo font-normal">
                      gastado <Moneda centavos={semana.gastadoCents} />
                    </div>
                  </CeldaCifra>
                </Fila>

                {/* Lo fijo cae por fecha: se ve, no se toca. */}
                {abierta &&
                  fijosDeLaSemana.map((linea) => (
                    <Fila key={`f-${linea.id}`}>
                      <CeldaNombre
                        className={HILO}
                        icono={<IconoDeClave clave={linea.icono} tam={13} />}
                        {...(linea.detalle ? { detalle: linea.detalle } : {})}
                      >
                        {linea.nombre}
                      </CeldaNombre>
                      <CeldaCifra apagada>
                        <Moneda centavos={linea.montoMensualCents} />
                      </CeldaCifra>
                    </Fila>
                  ))}

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
                          icono={<IconoDeClave clave={sobre.icono} tam={13} />}
                          detalle={`de ${formatearRedondo(sobre.montoMensualCents)} al mes`}
                        >
                          {sobre.nombre}
                        </CeldaNombre>
                        <CeldaCifra>
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
          dato={`${presupuesto.periodos.length} cheques`}
          encabezados={['Cheque', 'Le queda']}
          {...DOS_COLUMNAS}
        >
          {presupuesto.periodos.map((periodo, i) => (
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
                    Llega el {diaDe(periodo.fechaPago)} · cubre{' '}
                    {formatearRedondo(presupuesto.cubrePorPeriodoCents[i] ?? centavos(0))}
                  </div>
                </div>
              </div>
              <CeldaCifra
                className={(presupuesto.libreporPeriodoCents[i] ?? 0) < 0 ? 'text-rojo' : ''}
              >
                <Moneda centavos={presupuesto.libreporPeriodoCents[i] ?? centavos(0)} />
              </CeldaCifra>
            </Fila>
          ))}
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
        dato={`${cuantasCategorias} categorías`}
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
                className="bg-[#FBFCFB]"
              >
                <div className="flex min-w-0 items-center gap-[9px]">
                  <IconoAbrir
                    tam={14}
                    className={`text-texto-2 shrink-0 ${abierto ? 'rotate-90' : ''}`}
                  />
                  <span className="bg-gris border-linea text-texto-2 grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-[5px] border px-[5px] text-rotulo font-bold">
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
          cheques={chequesQueSeReparten}
          alGuardar={(monto) => alPonerMonto(editando.id, monto)}
          {...(alRenombrar ? { alRenombrar: (n: string) => alRenombrar(editando.id, n) } : {})}
          {...(alQuitar ? { alQuitar: () => alQuitar(editando.id) } : {})}
          alCerrar={() => setEditando(null)}
        />
      )}

      {creando && alCrearCategoria && (
        <NuevaCategoria
          grupo={creando}
          alCrear={(nombre, dia) => alCrearCategoria(creando, nombre, dia)}
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
