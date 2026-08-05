import type { Presupuesto } from '../../datos/tipos'
import { centavos } from '../../lib/dinero'
import { FilaFondo, Moneda, Seccion, Tarjeta } from '../base'
import { meses } from '../textos'

/**
 * Metas — los fondos de reserva.
 *
 * El mockup de teléfono no dibuja esta pantalla, pero sí la incluye en la
 * navegación. Se arma con la tarjeta de fondos de reserva que el contrato ya
 * define — la del panel de escritorio, con su barra y sus cifras — sin
 * inventar nada nuevo.
 */
export function Metas({ presupuesto }: { presupuesto: Presupuesto }) {
  const apartadoPorCheque = centavos(
    presupuesto.fondos.reduce((total, f) => total + f.porChequeCents, 0),
  )

  return (
    <>
      <Seccion dato={`${presupuesto.fondos.length} fondos`}>Fondos de reserva</Seccion>
      <Tarjeta>
        {presupuesto.fondos.map((fondo) => (
          <FilaFondo
            key={fondo.id}
            nombre={fondo.nombre}
            acumuladoCents={fondo.acumuladoCents}
            metaCents={fondo.metaCents}
            cifras
            cuando={
              <>
                {fondo.mesObjetivo} · faltan <b className="text-teal-osc font-semibold">{meses(fondo.mesesQueFaltan)}</b>
              </>
            }
          />
        ))}
        <button
          type="button"
          className="border-linea text-texto-2 mt-[14px] min-h-11 w-full rounded-[11px] border py-[10px] text-[12.5px] font-semibold"
        >
          Agregar un fondo
        </button>
      </Tarjeta>

      <Seccion>Lo que apartas</Seccion>
      <Tarjeta>
        <div className="text-texto-2 text-[12.5px] leading-[1.5]">
          De cada cheque apartas{' '}
          <b className="text-texto font-semibold">
            <Moneda centavos={apartadoPorCheque} />
          </b>{' '}
          para tus fondos de reserva.
        </div>
      </Tarjeta>
    </>
  )
}
