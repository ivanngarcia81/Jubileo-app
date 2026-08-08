import { useState } from 'react'
import type { Fondo, Presupuesto } from '../../datos/tipos'
import { type Centavos, centavos } from '../../lib/dinero'
import { FONDOS_GRATIS, puede } from '../../lib/membresia'
import { FilaAgregar, FilaFondo, ListaSeccion, Moneda, Seccion, Tarjeta } from '../base'
import { IconoMetas } from '../iconos'
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

const FONDOS = {
  columnas: 'minmax(0,1fr) 44px 84px',
  columnasPanel: 'minmax(150px,1fr) minmax(90px,300px) 140px',
}

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
    <div className="flex flex-col gap-3">
      <ListaSeccion
        titulo="Fondos de reserva"
        icono={<IconoMetas tam={15} />}
        dato={`${presupuesto.fondos.length} fondos`}
        encabezados={['Fondo', null, 'Llevas']}
        {...FONDOS}
      >
        {presupuesto.fondos.map((fondo) => (
          <FilaFondo
            key={fondo.id}
            nombre={fondo.nombre}
            acumuladoCents={fondo.acumuladoCents}
            metaCents={fondo.metaCents}
            {...(editable
              ? { alTocar: () => setEditando(fondo), etiqueta: `Editar ${fondo.nombre}` }
              : {})}
            cuando={
              <>
                {fondo.mesObjetivo} · faltan {meses(fondo.mesesQueFaltan)}
              </>
            }
          />
        ))}
        {puedeCrearMas ? (
          <FilaAgregar
            texto="Agregar un fondo"
            {...(editable ? { alTocar: () => setEditando(null) } : {})}
          />
        ) : (
          <p className="text-texto-2 px-[14px] py-3 text-[12.5px] leading-[1.55] panel:px-[18px]">
            El nivel gratis lleva {FONDOS_GRATIS} fondos. Con Premium no hay tope — y los que ya
            tienes se quedan como están.
          </p>
        )}
      </ListaSeccion>

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
    </div>
  )
}
