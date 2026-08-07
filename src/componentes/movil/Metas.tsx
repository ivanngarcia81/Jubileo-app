import { useState } from 'react'
import type { Fondo, Presupuesto } from '../../datos/tipos'
import { type Centavos, centavos } from '../../lib/dinero'
import { FONDOS_GRATIS, puede } from '../../lib/membresia'
import { FilaFondo, Moneda, Seccion, Tarjeta } from '../base'
import { meses } from '../textos'
import { EditarFondo } from './EditarFondo'

/**
 * Metas — los fondos de reserva.
 *
 * El mockup de teléfono no dibuja esta pantalla, pero sí la incluye en la
 * navegación. Se arma con la tarjeta de fondos de reserva que el contrato ya
 * define — la del panel de escritorio, con su barra y sus cifras — sin
 * inventar nada nuevo.
 */
export function Metas({
  presupuesto,
  alCrearFondo,
  alGuardarAcumulado,
  alBorrarFondo,
}: {
  presupuesto: Presupuesto
  /** Ausentes con los datos de ejemplo: la demostración se ve pero no se toca. */
  alCrearFondo?: (
    nombre: string,
    metaCents: Centavos,
    acumuladoCents: Centavos,
    fechaObjetivo: string | null,
  ) => Promise<void>
  alGuardarAcumulado?: (fondoId: string, acumuladoCents: Centavos) => Promise<void>
  alBorrarFondo?: (fondoId: string) => Promise<void>
}) {
  const [editando, setEditando] = useState<Fondo | null | undefined>(undefined)
  const editable = Boolean(alCrearFondo && alGuardarAcumulado && alBorrarFondo)
  // La única regla de la membresía que se aplica de verdad hoy. Los que ya
  // existen no se tocan: bajar de nivel no borra datos (sección 10).
  const puedeCrearMas =
    puede(presupuesto.usuario.nivel, 'fondos_ilimitados') ||
    presupuesto.fondos.length < FONDOS_GRATIS
  const apartadoPorCheque = centavos(
    presupuesto.fondos.reduce((total, f) => total + f.porChequeCents, 0),
  )

  return (
    <>
      <Seccion dato={`${presupuesto.fondos.length} fondos`}>Fondos de reserva</Seccion>
      <Tarjeta>
        {presupuesto.fondos.map((fondo) => (
          <div
            key={fondo.id}
            {...(editable
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': `Editar ${fondo.nombre}`,
                  onClick: () => setEditando(fondo),
                  onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && setEditando(fondo),
                }
              : {})}
          >
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
          </div>
        ))}
        {puedeCrearMas ? (
          <button
            type="button"
            onClick={editable ? () => setEditando(null) : undefined}
            disabled={!editable}
            className="border-linea text-texto-2 mt-[14px] min-h-11 w-full rounded-[11px] border py-[10px] text-[12.5px] font-semibold disabled:opacity-50"
          >
            Agregar un fondo
          </button>
        ) : (
          <p className="text-texto-2 mt-[14px] text-[12.5px] leading-[1.55]">
            El nivel gratis lleva {FONDOS_GRATIS} fondos. Con Premium no hay tope — y los que ya
            tienes se quedan como están.
          </p>
        )}
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
      {editando !== undefined && editable && (
        <EditarFondo
          fondo={editando}
          alCrear={alCrearFondo!}
          alGuardarAcumulado={(a) => alGuardarAcumulado!(editando!.id, a)}
          alBorrar={() => alBorrarFondo!(editando!.id)}
          alCerrar={() => setEditando(undefined)}
        />
      )}

    </>
  )
}
