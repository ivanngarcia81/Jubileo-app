import { type ReactNode, useState } from 'react'
import type { Presupuesto } from '../../datos/tipos'
import type { Centavos } from '../../lib/dinero'
import { diaDe } from '../../lib/fecha'
import type { Destino, Ruta } from '../../rutas'
import { FAMILIAS, Hoja } from '../base'
import { IconoAnotar, IconoCerrar, IconoEntra, IconoGasto, IconoSemana } from '../iconos'
import { type AlAnotar, Anotar } from './Anotar'
import type { AlCrearCategoria } from './NuevaCategoria'
import { AnotarCheque } from './AnotarCheque'

/**
 * El botón flotante y su hoja de acción rápida.
 *
 * Nace de un reclamo concreto: *"no veo por ningún lado dónde se entran los
 * cheques y tampoco veo dónde se agregan gastos."* Y era cierto — no porque las
 * acciones estuvieran mal puestas, sino porque cada una vivía **dentro** de la
 * pantalla que le tocaba. Anotar un gasto estaba en Movimientos, repartir
 * estaba en el Presupuesto, y anotar un cheque no estaba en ninguna parte:
 * había que cerrar la semana entera para corregirlo.
 *
 * Aquí las tres se ven desde cualquier pantalla, con un toque, y cada una dice
 * qué pasa si la tocas en vez de solo cómo se llama.
 *
 * **Van en vertical y no en tres columnas.** Tres mosaicos lado a lado caben en
 * inglés —"Log expense", "Add income"— pero no en español, que ocupa como un
 * 20% más: "Anotar un gasto" en un tercio de un teléfono de 360px se parte en
 * tres renglones. En vertical entra el nombre completo y encima sobra sitio
 * para el dato que de verdad ayuda a elegir.
 */

interface Puerta {
  clave: string
  nombre: string
  /** Qué pasa si la tocas. No es el nombre otra vez. */
  dato: string
  icono: ReactNode
  familia: string
  /** Ausente cuando la acción no se puede hacer todavía. */
  alTocar?: (() => void) | undefined
}

function FilaDePuerta({ puerta }: { puerta: Puerta }) {
  const activa = puerta.alTocar !== undefined
  return (
    <button
      type="button"
      onClick={puerta.alTocar}
      disabled={!activa}
      className={`border-linea flex min-h-[62px] w-full items-center gap-3 rounded-btn border px-4 py-3 text-left ${
        activa ? '' : 'opacity-50'
      }`}
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-btn ${puerta.familia}`}>
        {puerta.icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-texto block text-cuerpo font-semibold">{puerta.nombre}</span>
        <span className="text-texto-2 mt-[1px] block text-menor leading-[1.4]">{puerta.dato}</span>
      </span>
    </button>
  )
}

export function AccionRapida({
  presupuesto,
  alAnotar,
  alAnotarCheque,
  alCrearCategoria,
  ir,
}: {
  presupuesto: Presupuesto
  alAnotar?: AlAnotar
  alAnotarCheque?: (montoCents: Centavos) => Promise<void>
  alCrearCategoria?: AlCrearCategoria
  ir: (destino: Ruta | Destino) => void
}) {
  const [abierta, setAbierta] = useState(false)
  const [hoja, setHoja] = useState<'gasto' | 'cheque' | null>(null)
  const hayHoja = abierta || hoja !== null

  const semana = presupuesto.semanas[presupuesto.semanaActiva]
  const cheque = presupuesto.periodos[presupuesto.periodoActivo]
  // Con datos de ejemplo no hay dónde guardar. La puerta se ve —enseña que la
  // acción existe— pero no se toca, que es lo mismo que ya hacen los chips del
  // Dashboard.
  const sinServidor = 'Con los datos de ejemplo no se puede guardar.'

  const puertas: Puerta[] = [
    {
      clave: 'gasto',
      nombre: 'Anotar un gasto',
      dato: alAnotar ? 'De qué sobre salió' : sinServidor,
      icono: <IconoGasto tam={18} />,
      familia: FAMILIAS.verde,
      alTocar: alAnotar
        ? () => {
            setAbierta(false)
            setHoja('gasto')
          }
        : undefined,
    },
    {
      clave: 'cheque',
      nombre: 'Anotar un cheque',
      dato: alAnotarCheque
        ? cheque
          ? `Lo que entró de verdad el ${diaDe(cheque.fechaPago)}`
          : 'Lo que entró de verdad'
        : sinServidor,
      icono: <IconoEntra tam={18} />,
      familia: FAMILIAS.teal,
      alTocar: alAnotarCheque
        ? () => {
            setAbierta(false)
            setHoja('cheque')
          }
        : undefined,
    },
    {
      clave: 'repartir',
      nombre: 'Repartir la semana',
      dato: semana
        ? `Semana ${semana.numero} · del ${diaDe(semana.fechaInicio)} al ${diaDe(semana.fechaFin)}`
        : 'Planea a qué le toca cada peso',
      icono: <IconoSemana tam={18} />,
      familia: FAMILIAS.azul,
      // Repartir no escribe desde aquí: lleva a donde se reparte. Por eso
      // funciona hasta con los datos de ejemplo.
      alTocar: () => {
        setAbierta(false)
        ir(semana ? { ruta: 'mes', semana: semana.numero } : 'mes')
      },
    },
  ]

  return (
    <>
      {/* Se esconde mientras haya una hoja abierta. Nido lo deja encima
          convertido en ✕ porque su hoja es de tres mosaicos y el botón cae en
          el hueco de abajo; la nuestra es de tres filas y el botón aterrizaba
          justo sobre "Anotar un cheque". La salida vive en la cabecera de la
          hoja, donde no puede tapar nada. */}
      {!hayHoja && (
        <button
          type="button"
          onClick={() => setAbierta(true)}
          aria-expanded={false}
          aria-label="Anotar o repartir"
          // Arriba de la píldora, no al lado: la píldora va centrada y en un
          // teléfono de 320px su borde derecho llega hasta donde empezaría el
          // botón. Apilados no hay ancho que los enfrente.
          className="bg-teal text-tinta-teal fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-chip shadow-hoja"
        >
          <IconoAnotar tam={26} />
        </button>
      )}

      {abierta && (
        <Hoja etiqueta="Acción rápida" alCerrar={() => setAbierta(false)}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-texto-2 text-rotulo font-semibold tracking-[.1em] uppercase">
                Acción rápida
              </div>
              <div className="text-texto font-serif mt-1 text-titulo leading-tight">
                ¿Qué quieres hacer?
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAbierta(false)}
              aria-label="Cerrar"
              className="border-linea text-texto-2 grid size-9 shrink-0 place-items-center rounded-chip border"
            >
              <IconoCerrar tam={18} />
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {puertas.map((p) => (
              <FilaDePuerta key={p.clave} puerta={p} />
            ))}
          </div>
        </Hoja>
      )}

      {hoja === 'gasto' && alAnotar && (
        <Anotar
          presupuesto={presupuesto}
          alAnotar={alAnotar}
          {...(alCrearCategoria ? { alCrearCategoria } : {})}
          alCerrar={() => setHoja(null)}
        />
      )}

      {hoja === 'cheque' && alAnotarCheque && (
        <AnotarCheque
          presupuesto={presupuesto}
          alAnotarCheque={alAnotarCheque}
          alCerrar={() => setHoja(null)}
        />
      )}
    </>
  )
}
