import { useEffect, useRef, useState } from 'react'
import { hoy } from '../../datos/fuente'
import type { Presupuesto } from '../../datos/tipos'
import { type Centavos, formatear } from '../../lib/dinero'
import { type FechaCivil, diaDe, fecha, primerDiaDelMes, ultimoDiaDelMes } from '../../lib/fecha'
import { semanaDeFecha } from '../../lib/semanas'
import { FilaAgregar } from '../base'
import { type AlCrearCategoria, NuevaCategoria } from './NuevaCategoria'
import { aCentavos } from './PonerMonto'

/**
 * Anotar un gasto.
 *
 * Tres datos: cuánto, cuándo, y de qué sobre salió. La categoría **no** se
 * adivina nunca — es la regla de `CLAUDE.md`, y no es burocracia: presupuestar
 * es un acto, y el acto es decidir de dónde sale el dinero. Una app que lo
 * adivina convierte el presupuesto en un reporte.
 *
 * Los sobres se enseñan con lo que les queda, porque esa es la pregunta que
 * trae al usuario aquí: *¿de cuál me alcanza?*
 */

/** El día que se está anotando, y en qué semana del mes cae. */
function Cuando({
  presupuesto,
  valor,
  alCambiar,
  desactivado,
}: {
  presupuesto: Presupuesto
  valor: FechaCivil
  alCambiar: (f: FechaCivil) => void
  desactivado: boolean
}) {
  const { anio, mes } = presupuesto.mes
  const numero = semanaDeFecha(valor)
  const semana = presupuesto.semanas.find((s) => s.numero === numero)

  return (
    <>
      <div className="text-texto-2 mt-5 mb-2 text-menor font-bold tracking-[.06em] uppercase">
        ¿Cuándo fue?
      </div>
      {/* Se pregunta **el día**, no la semana. Elegir "Semana 2" obligaría a
          inventarle una fecha al movimiento; el día es el dato de verdad y la
          semana sale sola de él. Acotado al mes que se está mirando: un gasto
          de otro mes pertenece a otro presupuesto. */}
      <input
        type="date"
        value={valor}
        disabled={desactivado}
        min={primerDiaDelMes(anio, mes)}
        max={ultimoDiaDelMes(anio, mes)}
        onChange={(e) => e.target.value && alCambiar(fecha(e.target.value))}
        aria-label="Qué día fue el gasto"
        className="border-linea text-texto min-h-11 w-full rounded-btn border px-4 py-3 text-titulo focus:outline-none"
      />
      {semana && (
        <p className="text-texto-2 mt-2 text-menor leading-[1.5]">
          Cae en la semana {semana.numero} · del {diaDe(semana.fechaInicio)} al{' '}
          {diaDe(semana.fechaFin)}. Ahí es donde va a bajar el dinero.
        </p>
      )}
    </>
  )
}

/**
 * La firma de anotar, en un solo sitio.
 *
 * Estaba escrita a mano en cinco archivos, y al agregarle el día se quedaron
 * cuatro con tres parámetros. TypeScript no se queja —una función de menos
 * parámetros es asignable a una de más— así que el tipo mentía en silencio
 * mientras el código funcionaba.
 */
export type AlAnotar = (
  categoriaId: string,
  montoCents: Centavos,
  descripcion: string,
  cuando: FechaCivil,
) => Promise<void>

export function Anotar({
  presupuesto,
  alAnotar,
  alCrearCategoria,
  alCerrar,
}: {
  presupuesto: Presupuesto
  alAnotar: AlAnotar
  /**
   * Crear un sobre sin salir de aquí.
   *
   * Sin esto, quien anota un gasto de algo que todavía no tiene sobre tiene que
   * abandonar la hoja, ir al Presupuesto, crearlo y volver a empezar — y para
   * entonces ya se le olvidó cuánto era.
   */
  alCrearCategoria?: AlCrearCategoria
  alCerrar: () => void
}) {
  const [texto, setTexto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [cuando, setCuando] = useState<FechaCivil>(() => {
    // Hoy, salvo que se esté mirando otro mes: entonces, su último día. Un
    // `min`/`max` de agosto con el valor en septiembre deja el campo inválido y
    // el usuario no sabe por qué no lo deja guardar.
    const d = hoy()
    const primero = primerDiaDelMes(presupuesto.mes.anio, presupuesto.mes.mes)
    const ultimo = ultimoDiaDelMes(presupuesto.mes.anio, presupuesto.mes.mes)
    return d < primero ? primero : d > ultimo ? ultimo : d
  })
  const [creando, setCreando] = useState(false)
  // El nombre del sobre que se acaba de crear. Cuando aparece en la lista
  // —después de que el servidor responda y el mes se recargue— se elige solo:
  // quien lo creó desde aquí lo creó **para este gasto**.
  const [porNombre, setPorNombre] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => campo.current?.focus(), [])

  const recien = porNombre
    ? presupuesto.sobres.find((s) => s.nombre.trim().toLowerCase() === porNombre)
    : undefined
  if (recien) {
    setPorNombre(null)
    setCategoria(recien.id)
  }

  const monto = aCentavos(texto)
  const listo = monto !== null && monto > 0 && categoria !== null

  async function guardar() {
    if (!listo || monto === null || categoria === null) return
    setGuardando(true)
    setError(null)
    try {
      await alAnotar(categoria, monto, descripcion, cuando)
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anotar.')
      setGuardando(false)
    }
  }

  if (creando && alCrearCategoria) {
    return (
      <NuevaCategoria
        grupo="variable"
        alCrear={async (nombre, diaVencimiento, icono) => {
          await alCrearCategoria('variable', nombre, diaVencimiento, icono)
          setPorNombre(nombre.trim().toLowerCase())
          setCreando(false)
        }}
        alCerrar={() => setCreando(false)}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/45"
      onClick={alCerrar}
      role="presentation"
    >
      <div
        className="bg-blanco shadow-hoja max-h-[92dvh] w-full overflow-y-auto rounded-t-card px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Anotar un gasto"
      >
        {/* En qué mes se está escribiendo. Desde que el historial deja volver a
            un mes cerrado, "agosto" deja de ser obvio. */}
        <div className="text-texto-2 text-rotulo font-semibold tracking-[.1em] uppercase">
          {presupuesto.mes.etiqueta}
        </div>
        <div className="text-texto font-serif mt-1 text-titulo leading-tight">Anotar un gasto</div>

        <div className="border-linea mt-4 flex items-center gap-2 rounded-card border px-4">
          <span className="text-texto-2 font-serif text-cifra">$</span>
          <input
            ref={campo}
            type="text"
            inputMode="decimal"
            value={texto}
            disabled={guardando}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="0.00"
            aria-label="Cuánto gastaste"
            className="text-texto font-serif min-h-14 w-full bg-transparent text-cifra [font-variant-numeric:tabular-nums] placeholder:text-tenue focus:outline-none"
          />
        </div>

        <input
          type="text"
          value={descripcion}
          disabled={guardando}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="¿En qué? (opcional)"
          aria-label="En qué gastaste"
          // 17px y no 14: iOS hace zoom a la página al enfocar un campo de
          // menos de 16px, y salir de ese zoom es cosa del usuario. Todos los
          // campos de texto de la app van en `text-titulo` por lo mismo.
          className="border-linea text-texto mt-2 min-h-11 w-full rounded-btn border px-4 py-3 text-titulo placeholder:text-texto-claro-3 focus:outline-none"
        />

        <Cuando
          presupuesto={presupuesto}
          valor={cuando}
          alCambiar={setCuando}
          desactivado={guardando}
        />

        <div className="text-texto-2 mt-5 mb-2 text-menor font-bold tracking-[.06em] uppercase">
          ¿De qué sobre sale?
        </div>
        <div className="flex flex-col gap-2">
          {presupuesto.sobres.map((sobre) => {
            const queda = sobre.presupuestoCents - sobre.gastadoCents
            const elegido = categoria === sobre.id
            return (
              <button
                key={sobre.id}
                type="button"
                onClick={() => setCategoria(sobre.id)}
                aria-pressed={elegido}
                className={`flex min-h-11 items-center justify-between rounded-btn border px-4 py-3 text-left ${
                  elegido ? 'border-teal border-2' : 'border-linea'
                }`}
              >
                <span className="text-texto text-cuerpo">{sobre.nombre}</span>
                <span
                  className={`text-menor [font-variant-numeric:tabular-nums] ${
                    queda < 0 ? 'text-rojo' : 'text-texto-2'
                  }`}
                >
                  {queda < 0 ? 'te pasaste ' : 'quedan '}
                  {formatear(Math.abs(queda) as Centavos)}
                </span>
              </button>
            )
          })}
        </div>

        {alCrearCategoria && (
          <FilaAgregar texto="Crear un sobre nuevo" alTocar={() => setCreando(true)} />
        )}

        {presupuesto.sobres.length === 0 && !alCrearCategoria && (
          <p className="text-texto-2 text-menor leading-[1.55]">
            Todavía no tienes sobres con dinero. Ve a Presupuesto mensual y reparte tus semanas
            primero.
          </p>
        )}

        {error && (
          <p className="text-ambar mt-3 text-menor leading-[1.5]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={alCerrar}
            disabled={guardando}
            className="border-linea text-texto-2 min-h-11 flex-1 rounded-btn border text-cuerpo font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={!listo || guardando}
            className="bg-teal min-h-11 flex-[1.6] rounded-btn text-cuerpo font-bold text-tinta-teal disabled:opacity-50"
          >
            {guardando ? 'Anotando…' : 'Anotar'}
          </button>
        </div>
      </div>
    </div>
  )
}
