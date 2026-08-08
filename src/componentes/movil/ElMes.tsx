import { Fragment, useState } from 'react'
import type { LineaMes, Presupuesto } from '../../datos/tipos'
import { type Centavos, centavos, formatearRedondo, suma } from '../../lib/dinero'
import { alturas } from '../../lib/mes/barras'
import {
  ABIERTOS_POR_OMISION,
  alternar,
  escribirAbiertos,
  leerAbiertos,
  type ClaveGrupo,
} from '../../lib/mes/grupos'
import { nombreDeMes } from '../textos'
import {
  CeldaNombre,
  CeldasDeAvance,
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

/**
 * El mes — presupuesto base cero.
 *
 * Primero mayordomía, luego los fijos con su día de vencimiento y el cheque
 * que les toca, y al final los fondos de reserva. Arriba, el selector de mes
 * con barras y el control segmentado de entra / sale / sobró.
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
  alRenombrar,
  alQuitar,
  alCrearCategoria,
  alCerrarMes,
  alVerMes,
}: {
  presupuesto: Presupuesto
  /** Ausentes con los datos de ejemplo: la demostración se ve pero no se edita. */
  alPonerMonto?: (categoriaId: string, montoCents: Centavos) => Promise<void>
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
  const [creando, setCreando] = useState<'fijo' | 'variable' | null>(null)
  const [abiertos, setAbiertos] = useAbiertos()
  const editable = Boolean(alPonerMonto && presupuesto.mesId)
  // Los cheques extra no se reparten: lo que caiga ahí es de más, no del mes.
  const chequesQueSeReparten = presupuesto.periodos.filter((p) => !p.esExtra).length

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

  return (
    <div className="flex flex-col gap-3">
      <SelectorDeMes presupuesto={presupuesto} {...(alVerMes ? { alVerMes } : {})} />

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
