import type { Movimiento, Presupuesto } from '../../datos/tipos'
import { centavos } from '../../lib/dinero'
import { hoy as hoyDelUsuario } from '../../datos/fuente'
import { porDia } from '../../lib/mes/dias'
import { CeldaCifra, CeldaNombre, ChipCategoria, Fila, ListaSeccion, Moneda } from '../base'
import { IconoMovimientos } from '../iconos'
import { etiquetaDeDia } from '../textos'

/**
 * Movimientos — todo lo que pasó en el mes, por día.
 *
 * Agrupados por día y no en una lista corrida: una lista corrida de sesenta
 * renglones no se lee, se escanea buscando el día. Cada día trae su encabezado
 * con lo que entró y lo que salió, que es la pregunta que trae al usuario aquí.
 *
 * Lo que el mockup dibuja y todavía no existe: la casilla de revisado —es el
 * paso que sigue— y la línea de "Débito · 4412", que necesita la cuenta de
 * donde salió el dinero y eso llega con la conexión al banco. En su lugar va el
 * cheque, que es el marco del producto y sí lo sabemos.
 */

const COLUMNAS = {
  columnas: 'minmax(0,1fr) 92px',
  columnasPanel: 'minmax(150px,1fr) 190px 110px',
}

function FilaMovimiento({ movimiento: m }: { movimiento: Movimiento }) {
  const chip = (
    <ChipCategoria {...(m.asignado ? { clave: m.icono } : {})}>{m.categoria}</ChipCategoria>
  )
  return (
    <Fila className={m.asignado ? '' : 'bg-gris'}>
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

export function Movimientos({ presupuesto }: { presupuesto: Presupuesto }) {
  // El hoy del calendario del usuario, no el de UTC.
  const hoy = hoyDelUsuario()
  const dias = porDia(presupuesto.movimientos)
  const sinAsignar = presupuesto.movimientos.filter((m) => !m.asignado).length

  return (
    <ListaSeccion
      titulo={`Movimientos de ${presupuesto.mes.etiqueta.toLowerCase()}`}
      icono={<IconoMovimientos tam={15} />}
      dato={
        sinAsignar > 0
          ? `${sinAsignar} sin sobre`
          : `${presupuesto.movimientos.length} movimientos`
      }
      {...COLUMNAS}
    >
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
                {dia.salioCents > 0 && <Moneda centavos={centavos(dia.salioCents)} redondo={false} />}
              </span>
            </div>
            {dia.movimientos.map((m) => (
              <FilaMovimiento key={m.id} movimiento={m} />
            ))}
          </div>
        ))
      )}
    </ListaSeccion>
  )
}
