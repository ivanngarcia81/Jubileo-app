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
  ListaSeccion,
  Moneda,
} from '../base'
import { IconoMovimientos } from '../iconos'
import { etiquetaDeDia } from '../textos'

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
  columnas: '21px minmax(0,1fr) 92px',
  columnasPanel: '21px minmax(150px,1fr) 190px 110px',
}

function FilaMovimiento({
  movimiento: m,
  alRevisar,
  ocupada,
}: {
  movimiento: Movimiento
  alRevisar?: ((revisado: boolean) => void) | undefined
  ocupada: boolean
}) {
  const chip = (
    <ChipCategoria {...(m.asignado ? { clave: m.icono } : {})}>{m.categoria}</ChipCategoria>
  )
  return (
    <Fila className={m.asignado ? '' : 'bg-gris'}>
      <Casilla
        marcada={m.revisado}
        etiqueta={`${m.nombre} como revisado`}
        ocupada={ocupada}
        {...(alRevisar ? { alCambiar: () => alRevisar(!m.revisado) } : {})}
      />
      <CeldaNombre
        detalle={
          <span className="flex min-w-0 items-center gap-2">
            {/* En el teléfono no hay columna para la píldora: se va debajo del
                nombre. Es la misma píldora, no otra. */}
            <span className="flex min-w-0 panel:hidden">{chip}</span>
            {m.cheque !== null && <span className="shrink-0">Cheque {m.cheque}</span>}
          </span>
        }
      >
        {m.nombre}
      </CeldaNombre>
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
}: {
  presupuesto: Presupuesto
  /** Ausente con los datos de ejemplo: la demostración se ve pero no se toca. */
  alRevisar?: (ids: readonly string[], revisado: boolean) => Promise<void>
}) {
  // El hoy del calendario del usuario, no el de UTC.
  const hoy = hoyDelUsuario()
  const [ocupados, setOcupados] = useState<readonly string[]>([])
  const dias = porDia(presupuesto.movimientos)
  const sinRevisar = presupuesto.movimientos.filter((m) => !m.revisado)

  const marcar = (ids: readonly string[], revisado: boolean) => {
    if (!alRevisar) return
    setOcupados(ids)
    void alRevisar(ids, revisado).finally(() => setOcupados([]))
  }

  return (
    <ListaSeccion
      titulo={`Movimientos de ${presupuesto.mes.etiqueta.toLowerCase()}`}
      icono={<IconoMovimientos tam={15} />}
      dato={`${presupuesto.movimientos.length} movimientos`}
      {...COLUMNAS}
    >
      {/* La barra solo aparece cuando hay algo que hacer. Una que diga
          "0 pendientes" es ruido permanente. */}
      {sinRevisar.length > 0 && (
        <div className="bg-brillo-teal border-linea flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-[12px] py-[9px] text-[12.5px] panel:px-[18px]">
          <span>
            <b className="font-semibold">
              {sinRevisar.length === 1 ? '1 movimiento' : `${sinRevisar.length} movimientos`}
            </b>{' '}
            sin revisar
          </span>
          {alRevisar && (
            <button
              type="button"
              onClick={() => marcar(sinRevisar.map((m) => m.id), true)}
              disabled={ocupados.length > 0}
              className="bg-teal ml-auto min-h-11 rounded-full px-[14px] text-[11.5px] font-bold text-[#043432] disabled:opacity-50"
            >
              {sinRevisar.length === 1
                ? 'Marcarlo como revisado'
                : `Marcar los ${sinRevisar.length} como revisados`}
            </button>
          )}
        </div>
      )}

      {dias.length === 0 ? (
        <p className="text-texto-2 px-[12px] py-6 text-center text-[13px] leading-[1.55] panel:px-[18px]">
          Todavía no hay nada anotado este mes.
          <br />
          Lo que anotes en Mi semana aparece aquí.
        </p>
      ) : (
        dias.map((dia) => (
          <div key={dia.fecha}>
            <div className="text-texto-2 flex items-baseline justify-between px-[12px] pt-[14px] pb-[7px] text-[10.5px] font-semibold tracking-[.12em] uppercase panel:px-[18px]">
              <span>{etiquetaDeDia(dia.fecha, hoy)}</span>
              <span className="text-texto text-[12px] font-semibold tracking-normal normal-case">
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
                ocupada={ocupados.includes(m.id)}
                {...(alRevisar ? { alRevisar: (v: boolean) => marcar([m.id], v) } : {})}
              />
            ))}
          </div>
        ))
      )}
    </ListaSeccion>
  )
}
