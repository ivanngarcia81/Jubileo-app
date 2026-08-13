import { useState } from 'react'
import { hoy as hoyDelUsuario } from '../../datos/fuente'
import type { Movimiento, Presupuesto } from '../../datos/tipos'
import { centavos } from '../../lib/dinero'
import { porDia } from '../../lib/mes/dias'
import {
  Casilla,
  CeldaCifra,
  CeldaNombre,
  ChipCategoria,
  Fila,
  FilaAgregar,
  Hoja,
  ListaSeccion,
  Moneda,
  Vacio,
} from '../base'
import { IconoMovimientos } from '../iconos'
import { type AlAnotar, Anotar } from './Anotar'
import type { AlCrearCategoria } from './NuevaCategoria'
import { cuantos, etiquetaDeDia, fechaLarga } from '../textos'

/**
 * Movimientos — todo lo que pasó en el mes, por día.
 *
 * Agrupados por día y no en una lista corrida: una lista corrida de sesenta
 * renglones no se lee, se escanea buscando el día. Cada día trae su encabezado
 * con lo que entró y lo que salió, que es la pregunta que trae al usuario aquí.
 *
 * Lo que el mockup dibuja y todavía no existe: la línea de "Débito · 4412",
 * que necesita la cuenta de donde salió el dinero y eso llega con la conexión
 * al banco. En su lugar va el cheque, que es el marco del producto y sí lo
 * sabemos.
 */

const COLUMNAS = {
  columnas: '30px minmax(0,1fr) 92px',
  columnasPanel: '30px minmax(150px,1fr) 190px 110px',
}

/**
 * El detalle de un movimiento. Uno solo para los dos lados: en la computadora
 * vive en el panel de la derecha y sigue a la fila escogida; en el teléfono
 * sube desde abajo en una hoja. Si fueran dos, se desparejarían.
 *
 * Lo que el mockup dibuja y no está: la etiqueta, la nota y el promedio de los
 * tres meses. Ninguno existe en la base todavía, y un campo que no se puede
 * llenar es peor que no tenerlo.
 */
function Detalle({
  movimiento: m,
  presupuesto,
  alRevisar,
}: {
  movimiento: Movimiento
  presupuesto: Presupuesto
  alRevisar?: ((revisado: boolean) => void) | undefined
}) {
  // El sobre se busca por llave y no por nombre: renombrar una categoría no
  // puede romper el enlace en silencio.
  const linea = [
    presupuesto.mayordomia,
    ...presupuesto.fijos,
    ...presupuesto.variables,
    ...presupuesto.lineasDeuda,
  ].find((l) => l.id === m.categoriaId)

  return (
    <>
      <div className="text-texto-2 flex items-baseline justify-between text-menor">
        <span>{fechaLarga(m.fecha)}</span>
        <span>{m.revisado ? 'Revisado' : 'Sin revisar'}</span>
      </div>
      <h4 className="font-serif mt-[7px] mb-[3px] text-cifra leading-[1.1] font-normal">
        {m.nombre}
      </h4>
      <div
        className={`font-serif mt-[2px] text-heroe leading-none [font-variant-numeric:tabular-nums] ${
          m.tipo === 'ingreso' ? 'text-teal-osc' : ''
        }`}
      >
        {m.tipo === 'ingreso' && '+'}
        <Moneda centavos={m.montoCents} redondo={false} />
      </div>

      <div className="border-linea mt-4 flex flex-col gap-3 border-t pt-[14px] text-menor">
        <div className="text-texto-2 flex items-center gap-3">
          <span className="w-[86px] shrink-0">Sobre</span>
          <ChipCategoria {...(m.asignado ? { clave: m.icono } : {})}>{m.categoria}</ChipCategoria>
        </div>
        {m.cheque !== null && (
          <div className="text-texto-2 flex items-center gap-3">
            <span className="w-[86px] shrink-0">Cheque</span>
            <span className="text-texto font-medium">Cheque {m.cheque}</span>
          </div>
        )}
        <div className="text-texto-2 flex items-center gap-3">
          <span className="w-[86px] shrink-0">Revisado</span>
          <Casilla
            marcada={m.revisado}
            etiqueta={`${m.nombre} como revisado`}
            {...(alRevisar ? { alCambiar: () => alRevisar(!m.revisado) } : {})}
          />
        </div>
      </div>

      {linea && linea.montoMensualCents > 0 && (
        <div className="border-linea mt-4 border-t pt-[13px]">
          <div className="text-texto-2 mb-[9px] text-rotulo font-semibold tracking-[.12em] uppercase">
            En este sobre, este mes
          </div>
          <div className="border-linea flex items-baseline justify-between border-b py-[6px] text-menor">
            <span className="text-texto-2">Gastado</span>
            <b className="font-semibold">
              <Moneda centavos={linea.gastadoCents} /> de{' '}
              <Moneda centavos={linea.montoMensualCents} />
            </b>
          </div>
          <div className="flex items-baseline justify-between py-[6px] text-menor">
            <span className="text-texto-2">
              {linea.gastadoCents > linea.montoMensualCents ? 'Te pasaste' : 'Te queda'}
            </span>
            <b
              className={`font-semibold ${
                linea.gastadoCents > linea.montoMensualCents ? 'text-rojo' : 'text-teal-osc'
              }`}
            >
              <Moneda
                centavos={centavos(Math.abs(linea.montoMensualCents - linea.gastadoCents))}
              />
            </b>
          </div>
        </div>
      )}
    </>
  )
}

function FilaMovimiento({
  movimiento: m,
  alRevisar,
  alEscoger,
  escogido,
  ocupada,
}: {
  movimiento: Movimiento
  alRevisar?: ((revisado: boolean) => void) | undefined
  alEscoger: () => void
  escogido: boolean
  ocupada: boolean
}) {
  const chip = (
    <ChipCategoria {...(m.asignado ? { clave: m.icono } : {})}>{m.categoria}</ChipCategoria>
  )
  return (
    // La fila no es el botón, como en las otras listas: aquí ya hay una casilla
    // adentro, y un botón dentro de otro botón no es HTML válido. El nombre es
    // el que abre el detalle, y la casilla sigue siendo suya.
    <Fila
      className={`relative ${escogido ? 'bg-brillo-teal before:bg-teal before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:content-[""]' : m.asignado ? '' : 'bg-gris'}`}
    >
      <Casilla
        marcada={m.revisado}
        etiqueta={`${m.nombre} como revisado`}
        ocupada={ocupada}
        {...(alRevisar ? { alCambiar: () => alRevisar(!m.revisado) } : {})}
      />
      <button
        type="button"
        onClick={alEscoger}
        aria-label={`Ver ${m.nombre}`}
        aria-pressed={escogido}
        className="min-w-0 text-left"
      >
        <CeldaNombre
          detalle={
            <span className="flex min-w-0 items-center gap-2">
              {/* En el teléfono no hay columna para la píldora: se va debajo
                  del nombre. Es la misma píldora, no otra. */}
              <span className="flex min-w-0 panel:hidden">{chip}</span>
              {m.cheque !== null && <span className="shrink-0">Cheque {m.cheque}</span>}
            </span>
          }
        >
          {m.nombre}
        </CeldaNombre>
      </button>
      <div className="hidden panel:block">{chip}</div>
      <CeldaCifra className={m.tipo === 'ingreso' ? 'text-teal-osc' : ''}>
        {m.tipo === 'ingreso' && '+'}
        <Moneda centavos={m.montoCents} redondo={false} />
      </CeldaCifra>
    </Fila>
  )
}

export function Movimientos({
  presupuesto,
  alRevisar,
  alAnotar,
  alCrearCategoria,
}: {
  presupuesto: Presupuesto
  /** Ausente con los datos de ejemplo: la demostración se ve pero no se toca. */
  alRevisar?: (ids: readonly string[], revisado: boolean) => Promise<void>
  /**
   * Anotar un gasto desde aquí.
   *
   * Existía solo como chip del Dashboard, y esta —la lista de gastos— era la
   * única pantalla del producto donde se ven gastos y no se podía agregar uno.
   * Quien viene a buscar dónde se anota, viene aquí.
   */
  alAnotar?: AlAnotar
  alCrearCategoria?: AlCrearCategoria
}) {
  const [anotando, setAnotando] = useState(false)
  // El hoy del calendario del usuario, no el de UTC.
  const hoy = hoyDelUsuario()
  const [ocupados, setOcupados] = useState<readonly string[]>([])
  const [escogidoId, setEscogido] = useState<string | null>(null)
  const dias = porDia(presupuesto.movimientos)
  const sinRevisar = presupuesto.movimientos.filter((m) => !m.revisado)
  // Por llave y no por objeto: al recargar el mes los objetos son otros, y un
  // detalle amarrado al objeto viejo se quedaría enseñando lo de antes.
  const escogido = presupuesto.movimientos.find((m) => m.id === escogidoId) ?? null

  const marcar = (ids: readonly string[], revisado: boolean) => {
    if (!alRevisar) return
    setOcupados(ids)
    void alRevisar(ids, revisado).finally(() => setOcupados([]))
  }

  const detalle = escogido && (
    <Detalle
      movimiento={escogido}
      presupuesto={presupuesto}
      {...(alRevisar ? { alRevisar: (v: boolean) => marcar([escogido.id], v) } : {})}
    />
  )

  const lista = (
    <ListaSeccion
      titulo={`Movimientos de ${presupuesto.mes.etiqueta.toLowerCase()}`}
      icono={<IconoMovimientos tam={15} />}
      dato={cuantos(presupuesto.movimientos.length, 'movimiento', 'movimientos')}
      {...COLUMNAS}
    >
      {alAnotar && <FilaAgregar texto="Anotar un gasto" alTocar={() => setAnotando(true)} />}
      {/* La barra solo aparece cuando hay algo que hacer. Una que diga
          "0 pendientes" es ruido permanente. */}
      {sinRevisar.length > 0 && (
        <div className="bg-brillo-teal border-linea flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-[12px] py-[9px] text-menor panel:px-[18px]">
          <span>
            <b className="font-semibold">
              {cuantos(sinRevisar.length, 'movimiento', 'movimientos')}
            </b>{' '}
            sin revisar
          </span>
          {alRevisar && (
            <button
              type="button"
              onClick={() => marcar(sinRevisar.map((m) => m.id), true)}
              disabled={ocupados.length > 0}
              className="bg-teal ml-auto min-h-11 rounded-chip px-[14px] text-menor font-bold text-tinta-teal disabled:opacity-50"
            >
              {sinRevisar.length === 1
                ? 'Marcarlo como revisado'
                : `Marcar los ${sinRevisar.length} como revisados`}
            </button>
          )}
        </div>
      )}

      {dias.length === 0 ? (
        <Vacio>
          Todavía no hay nada anotado este mes. Lo que anotes en el Dashboard
          aparece aquí, con su sobre y su cheque.
        </Vacio>
      ) : (
        dias.map((dia) => (
          <div key={dia.fecha}>
            <div className="text-texto-2 flex items-baseline justify-between px-[12px] pt-[14px] pb-[7px] text-rotulo font-semibold tracking-[.12em] uppercase panel:px-[18px]">
              <span>{etiquetaDeDia(dia.fecha, hoy)}</span>
              <span className="text-texto text-menor font-semibold tracking-normal normal-case">
                {dia.entroCents > 0 && (
                  <span className="text-teal-osc">
                    +<Moneda centavos={centavos(dia.entroCents)} redondo={false} />
                  </span>
                )}
                {dia.entroCents > 0 && dia.salioCents > 0 && ' · '}
                {dia.salioCents > 0 && (
                  <Moneda centavos={centavos(dia.salioCents)} redondo={false} />
                )}
              </span>
            </div>
            {dia.movimientos.map((m) => (
              <FilaMovimiento
                key={m.id}
                movimiento={m}
                escogido={m.id === escogidoId}
                alEscoger={() => setEscogido(m.id === escogidoId ? null : m.id)}
                ocupada={ocupados.includes(m.id)}
                {...(alRevisar ? { alRevisar: (v: boolean) => marcar([m.id], v) } : {})}
              />
            ))}
          </div>
        ))
      )}
    </ListaSeccion>
  )

  const hojaDeAnotar = anotando && alAnotar && (
    <Anotar
      presupuesto={presupuesto}
      alAnotar={alAnotar}
      {...(alCrearCategoria ? { alCrearCategoria } : {})}
      alCerrar={() => setAnotando(false)}
    />
  )

  return (
    <>
      {hojaDeAnotar}
      {/* En la computadora el detalle es una columna que sigue a la fila
          escogida; en el teléfono no cabe, y sube desde abajo como todas las
          demás decisiones que tocan dinero. */}
      <div className="grid items-start gap-4 panel:grid-cols-[minmax(0,1fr)_340px]">
        {lista}
        {detalle && (
          <aside className="bg-blanco border-linea hidden rounded-card border p-[18px] panel:block">
            {detalle}
          </aside>
        )}
      </div>

      {detalle && (
        <div className="panel:hidden">
          <Hoja etiqueta={escogido.nombre} alCerrar={() => setEscogido(null)}>
            {detalle}
            <button
              type="button"
              onClick={() => setEscogido(null)}
              className="border-linea text-texto-2 mt-5 min-h-11 w-full rounded-btn border text-cuerpo font-semibold"
            >
              Cerrar
            </button>
          </Hoja>
        </div>
      )}
    </>
  )
}
