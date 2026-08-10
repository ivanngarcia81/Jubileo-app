import type { CSSProperties, ReactNode } from 'react'
import { type Centavos, centavos, formatear, formatearRedondo } from '../lib/dinero'
import { IconoDeClave, type ClaveIcono } from './iconos'

/**
 * Piezas compartidas, extraídas del CSS de `design/`. Los colores y las
 * tipografías salen de los tokens; las medidas exactas (13px de radio,
 * 14.5px de texto) salen del mockup, que es el contrato visual.
 */

/** Todo número de dinero lleva cifras de ancho fijo. Regla 1 de los tokens. */
export function Moneda({
  centavos: monto,
  redondo = true,
  className = '',
}: {
  centavos: Centavos
  redondo?: boolean
  className?: string
}) {
  return (
    <span className={`[font-variant-numeric:tabular-nums] tracking-[-.01em] ${className}`}>
      {redondo ? formatearRedondo(monto) : formatear(monto)}
    </span>
  )
}

export function Tarjeta({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-blanco rounded-card shadow-tarjeta p-[13px_14px] ${className}`}>
      {children}
    </div>
  )
}

/** Encabezado de sección: etiqueta en mayúsculas y, a la derecha, un dato. */
export function Seccion({ children, dato }: { children: ReactNode; dato?: ReactNode }) {
  return (
    <div className="text-texto-2 mt-5 mb-[9px] flex items-center justify-between text-rotulo font-semibold tracking-[.12em] uppercase">
      <span>{children}</span>
      {dato !== undefined && (
        <span className="text-teal-osc text-menor font-medium tracking-normal normal-case">
          {dato}
        </span>
      )}
    </div>
  )
}

/**
 * Barra de progreso. Va en su propia columna de la lista, con el mismo carril
 * en todas las filas: sin eso no se puede comparar un renglón con otro.
 */
export function Barra({ porcentaje, color }: { porcentaje: number; color: string }) {
  return (
    <div className="bg-gris h-[5px] overflow-hidden rounded-chip">
      <div
        className="h-full rounded-chip"
        style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%`, background: color }}
      />
    </div>
  )
}

/**
 * El color de un sobre según lo gastado.
 *
 * Regla 4 de los tokens: el rojo aparece solo cuando el usuario **ya se pasó**,
 * nunca como advertencia preventiva. Para "cuidado" va el ámbar.
 *
 * Los tres estados, tal como los dibuja `design/listas.html`:
 *
 * - **teal** — vas bien, o cuadraste. La renta pagada completa llega al 100% y
 *   sale teal en el mockup, no en rojo: gastar exactamente lo presupuestado no
 *   es pasarse, es acertar. Ponerlo en rojo convertiría el rojo en una alarma
 *   que suena todos los meses y no significa nada, que es justo lo que la regla
 *   4 prohíbe.
 * - **ámbar** — del 80% para arriba y todavía sin llegar: ahí sí hay que cuidar.
 * - **rojo** — pasado el 100%. Solo ahí.
 */
export function colorDeSobre(gastado: Centavos, presupuesto: Centavos): string {
  if (presupuesto <= 0) return 'var(--teal)'
  const parte = gastado / presupuesto
  if (parte > 1) return 'var(--rojo)'
  if (parte >= 0.8 && parte < 1) return 'var(--ambar)'
  return 'var(--teal)'
}

/**
 * El color de la cifra que **queda**, derivado del de la barra.
 *
 * Se deriva y no se escribe aparte a propósito: son la misma regla dicha en
 * dos lenguajes —la barra pinta en `var(--…)`, el texto en clase de Tailwind—
 * y dos copias de un umbral acaban discrepando el día que alguien mueve el
 * 80%. Aquí solo puede cambiar en un sitio.
 *
 * Queda es la única cifra de la fila que lleva color. Planeado y Gastado se
 * quedan en el color de texto normal: dos cifras de color en un renglón
 * compiten y ninguna gana, y la que la persona busca de verdad es esta.
 */
export function claseDeQueda(gastado: Centavos, planeado: Centavos): string {
  const color = colorDeSobre(gastado, planeado)
  if (color === 'var(--rojo)') return 'text-rojo'
  if (color === 'var(--ambar)') return 'text-ambar'
  return 'text-teal-osc'
}

export function porcentaje(parte: Centavos, total: Centavos): number {
  if (total <= 0) return 0
  return Math.round((parte / total) * 100)
}

/**
 * La píldora de categoría — una sola pieza, igual en la lista, en el detalle y
 * en el panel. Ver `design/listas.html`.
 *
 * El tono sale de la clave del icono y no de quien la dibuja: si cada pantalla
 * escogiera su color, la misma categoría saldría de un color en la lista y de
 * otro en el detalle, y el color dejaría de querer decir algo.
 *
 * **El mockup trae un cuarto tono en rojo y no se copió.** El rojo es del
 * sobregiro —regla 4 de los tokens— y una categoría pintada de rojo porque sí
 * le enseña al usuario que el rojo no significa nada. Cuando de verdad se pase,
 * ya no lo va a leer.
 */
export type TonoChip = 'teal' | 'ambar' | 'neutro'

/**
 * Los tonos de **estado**: los que fuerza quien dibuja la píldora para decir
 * algo que no es la categoría — "Extra", "Apretada", "enfoque", el conteo de
 * pagos pendientes. Siguen siendo tres, y ámbar sigue queriendo decir cuidado.
 */
const TONOS: Record<TonoChip, string> = {
  teal: 'bg-chip-teal text-chip-teal-texto',
  ambar: 'bg-brillo-ambar text-ambar-osc',
  neutro: 'bg-chip-neutro text-chip-neutro-texto',
}

/**
 * Los colores de **categoría**: ocho familias, para reconocer de un vistazo en
 * una lista larga. Es otra cosa que los tonos de arriba, y por eso viven
 * aparte: uno dice *qué es*, el otro *cómo va*.
 *
 * Aquí no hay ámbar ni rojo. Son colores de estado —cuidado y te pasaste— y
 * una categoría pintada de ámbar dejaría a la bandera de apretada sin querer
 * decir nada. Es la regla 4 de los tokens, aplicada al revés de lo habitual:
 * no se trata de no usar el rojo de más, sino de no gastar su tinta en otra
 * cosa.
 *
 * Las que más aparecen en una lista de movimientos tienen familia propia
 * —comida, transporte, los recibos, salud, la casa—; la cola larga comparte.
 * Dieciséis colores distintos no se distinguen entre sí y volverían la lista
 * un arcoíris, que era justo el miedo de la versión de tres tonos. La
 * respuesta no era quedarse en tres: era agrupar.
 */
type Familia =
  | 'teal'
  | 'verde'
  | 'azul'
  | 'indigo'
  | 'violeta'
  | 'rosa'
  | 'pizarra'
  | 'neutro'

export const FAMILIAS: Record<Familia, string> = {
  teal: 'bg-chip-teal text-chip-teal-texto',
  verde: 'bg-chip-verde text-chip-verde-texto',
  azul: 'bg-chip-azul text-chip-azul-texto',
  indigo: 'bg-chip-indigo text-chip-indigo-texto',
  violeta: 'bg-chip-violeta text-chip-violeta-texto',
  rosa: 'bg-chip-rosa text-chip-rosa-texto',
  pizarra: 'bg-chip-pizarra text-chip-pizarra-texto',
  neutro: 'bg-chip-neutro text-chip-neutro-texto',
}

export const FAMILIA_POR_CLAVE: Record<ClaveIcono, Familia> = {
  // Lo que entra y lo que se aparta: el teal de la marca.
  mayordomia: 'teal',
  ingreso: 'teal',
  ahorro: 'teal',
  // El gasto de todos los días, el que más renglones ocupa.
  comida: 'verde',
  transporte: 'azul',
  // Los recibos que llegan solos cada mes.
  servicios: 'indigo',
  telefono: 'indigo',
  salud: 'violeta',
  // La vida personal: la cola larga, que comparte familia a propósito.
  regalo: 'rosa',
  ninos: 'rosa',
  mascota: 'rosa',
  ropa: 'rosa',
  personal: 'rosa',
  // Lo estructural: el techo, lo que lo protege, y lo que se debe.
  casa: 'pizarra',
  seguro: 'pizarra',
  deuda: 'pizarra',
  tarjeta: 'pizarra',
  // Sin categoría propia todavía: mandan su grupo.
  gasto: 'neutro',
  fijo: 'neutro',
  variable: 'neutro',
}

export function ChipCategoria({
  clave,
  tono,
  children,
}: {
  /** La categoría. Sin ella la píldora va sin icono, como el rótulo "enfoque". */
  clave?: ClaveIcono
  /** Para forzarlo. Normalmente lo decide la clave. */
  tono?: TonoChip
  children: ReactNode
}) {
  const clases = tono
    ? TONOS[tono]
    : clave
      ? FAMILIAS[FAMILIA_POR_CLAVE[clave]]
      : FAMILIAS.neutro
  return (
    // La píldora se encoge antes que lo que va a su lado: un nombre de
    // categoría largo se corta dentro de ella en vez de empujar al cheque
    // fuera de la fila.
    <span
      className={`inline-flex h-[21px] min-w-0 items-center gap-[5px] rounded-chip px-2 text-rotulo font-bold tracking-[.06em] uppercase ${clases}`}
    >
      {clave !== undefined && <IconoDeClave clave={clave} tam={11} className="shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  )
}

/** Control segmentado: Entra · Sale · Sobró, o Semana · Cheque · Mes. */
export function Segmentado({
  opciones,
  activa,
  alElegir,
  className = '',
}: {
  opciones: readonly string[]
  activa: string
  alElegir: (opcion: string) => void
  className?: string
}) {
  return (
    <div className={`bg-gris flex gap-[2px] rounded-chip p-[3px] ${className}`}>
      {opciones.map((opcion) => {
        const activo = opcion === activa
        return (
          <button
            key={opcion}
            type="button"
            onClick={() => alElegir(opcion)}
            aria-pressed={activo}
            className={`flex-1 rounded-chip px-[13px] py-[6px] text-menor ${
              activo
                ? 'bg-blanco text-texto font-semibold shadow-[0_1px_3px_rgba(0,0,0,.09)]'
                : 'text-texto-2 font-medium'
            }`}
          >
            {opcion}
          </button>
        )
      })}
    </div>
  )
}

/** Casilla de marcado de los pagos del periodo. */
export function Casilla({
  marcada,
  etiqueta,
  alCambiar,
  ocupada = false,
}: {
  marcada: boolean
  etiqueta: string
  /** Ausente en la demostración: se ve, no se toca. */
  alCambiar?: (() => void) | undefined
  /** Esperando al servidor. */
  ocupada?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      aria-busy={ocupada}
      disabled={!alCambiar || ocupada}
      aria-label={marcada ? `Desmarcar ${etiqueta}` : `Marcar ${etiqueta} como pagado`}
      onClick={alCambiar}
      className={`relative size-[30px] shrink-0 rounded-btn border-[1.5px] before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] ${
        ocupada ? 'opacity-50' : ''
      } ${marcada ? 'bg-teal border-teal' : 'border-linea'}`}
    >
      {marcada && (
        <span className="absolute top-[3px] left-[6px] h-[10px] w-[6px] rotate-[40deg] border-r-2 border-b-2 border-white" />
      )}
    </button>
  )
}

/* ---------------------------------------------------------------------------
 * El sistema de listas — ver `design/listas.html`
 * ---------------------------------------------------------------------------
 *
 * La tarjeta dejó de ser el **renglón** y pasó a ser la **sección**. Antes cada
 * línea del presupuesto era su propia `<Tarjeta>`, con su borde, su relleno y
 * su sombra: nada quedaba alineado entre renglones, cada barra tenía su propio
 * ancho, y en una pantalla cabían seis líneas donde caben dieciséis. Ahora hay
 * un panel blanco por sección y adentro filas en grid separadas por una línea
 * de 1px.
 *
 * Las columnas se declaran **una sola vez, en la sección**, y las filas las
 * heredan por la variable `--cols`. Esa es toda la mecánica de la alineación:
 * si cada fila pudiera declarar las suyas, se irían separando de a poquito y
 * volveríamos al principio. Por eso `Fila` no recibe columnas.
 *
 * El teléfono y el escritorio no caben en las mismas columnas —el mockup es un
 * documento de 1420px y la app arranca en 320— así que la sección acepta dos
 * juegos: el de teléfono y, desde el corte `panel`, el del mockup.
 */

function estiloDeColumnas(columnas: string, columnasPanel: string | undefined) {
  return {
    '--cols': columnas,
    '--cols-panel': columnasPanel ?? columnas,
  } as CSSProperties
}

/**
 * El alto mínimo de una fila. 44px es el objetivo táctil de un dedo.
 *
 * Sin el `display`: quien la usa pone `grid` o el par `hidden panel:grid`, y
 * así el que sí está en una media query siempre le gana al que no. Con `grid`
 * aquí adentro, `hidden` y `grid` quedarían los dos sin variante y quién gana
 * dependería del orden en que Tailwind los escribe, no del código.
 */
const FILA = 'min-h-11 items-center gap-x-[10px] px-[12px] panel:gap-x-[14px] panel:px-[18px]'
const COLUMNAS = 'grid-cols-[var(--cols)] panel:grid-cols-[var(--cols-panel)]'

function Encabezados({
  rotulos,
  className,
}: {
  rotulos: readonly (string | null)[]
  className: string
}) {
  // El primer rótulo que existe va a la izquierda —es el de la columna del
  // nombre, aunque antes venga una casilla sin rótulo— y los demás a la
  // derecha, encima de sus cifras.
  const primero = rotulos.findIndex((r) => r !== null)
  return (
    <div
      className={`${className} ${FILA} ${COLUMNAS} border-linea text-texto-2 min-h-0 border-b pb-2 text-rotulo font-semibold tracking-[.12em] uppercase`}
    >
      {rotulos.map((rotulo, i) => (
        <span key={i} className={i === primero ? '' : 'text-right'}>
          {rotulo}
        </span>
      ))}
    </div>
  )
}

export function ListaSeccion({
  titulo,
  icono,
  dato,
  columnas,
  columnasPanel,
  encabezados,
  encabezadosPanel,
  children,
  className = '',
}: {
  /** El título del panel. Sin él, el panel va pelón: solo las filas. */
  titulo?: string
  icono?: ReactNode
  /** El dato de la derecha del encabezado: un conteo, un total. */
  dato?: ReactNode
  /** `grid-template-columns` en el teléfono. */
  columnas: string
  /** Y desde 880px, cuando cambia. */
  columnasPanel?: string
  /** Rótulos de columna. El primero a la izquierda, los demás a la derecha. */
  encabezados?: readonly (string | null)[]
  /** Y los del escritorio, cuando las columnas no son las mismas. */
  encabezadosPanel?: readonly (string | null)[]
  children: ReactNode
  className?: string
}) {
  return (
    <section
      style={estiloDeColumnas(columnas, columnasPanel)}
      className={`bg-blanco border-linea overflow-hidden rounded-card border ${className}`}
    >
      {titulo !== undefined && (
        <div className="flex items-center gap-[11px] px-[14px] pt-[15px] pb-[13px] panel:px-[18px]">
          {icono !== undefined && (
            <div className="bg-carbon text-teal grid size-7 shrink-0 place-items-center rounded-btn">
              {icono}
            </div>
          )}
          <h3 className="font-serif min-w-0 flex-1 truncate text-titulo font-normal">{titulo}</h3>
          {dato !== undefined && <div className="text-texto-2 text-menor">{dato}</div>}
        </div>
      )}
      {encabezados !== undefined && (
        <Encabezados
          rotulos={encabezados}
          className={encabezadosPanel ? 'grid panel:hidden' : 'grid'}
        />
      )}
      {encabezadosPanel !== undefined && (
        <Encabezados rotulos={encabezadosPanel} className="hidden panel:grid" />
      )}
      {children}
    </section>
  )
}

/**
 * Una fila de la lista. Hereda las columnas de su `ListaSeccion`.
 *
 * Con `etiqueta` la fila entera es el botón —como en el mockup, donde no hay
 * controles sueltos dentro del renglón— y esa etiqueta es su nombre accesible:
 * un botón sin nombre no existe para quien navega con lector. Con etiqueta pero
 * sin `alTocar` sale desactivada, que es como se ve la demostración: se mira,
 * no se toca.
 */
export function Fila({
  children,
  alTocar,
  etiqueta,
  abierta,
  className = '',
}: {
  children: ReactNode
  alTocar?: (() => void) | undefined
  etiqueta?: string
  /** Solo en las filas que abren y cierran un grupo. */
  abierta?: boolean
  className?: string
}) {
  const comun = `grid ${FILA} ${COLUMNAS} border-linea w-full border-b text-left last:border-b-0 ${className}`
  if (etiqueta === undefined) return <div className={comun}>{children}</div>
  return (
    <button
      type="button"
      onClick={alTocar}
      disabled={!alTocar}
      aria-label={etiqueta}
      aria-expanded={abierta}
      className={`${comun} enabled:hover:bg-blanco-2 disabled:opacity-60`}
    >
      {children}
    </button>
  )
}

/**
 * Una lista vacía.
 *
 * Un panel en blanco con su encabezado y nada adentro se lee como un error de
 * carga. Aquí va una frase que diga qué falta y por qué vale la pena — no
 * "sin datos", que es lo que dice un sistema, no una app.
 */
export function Vacio({ children }: { children: ReactNode }) {
  return (
    <p className="text-texto-2 px-[12px] py-7 text-center text-menor leading-[1.6] text-balance panel:px-[18px]">
      {children}
    </p>
  )
}

/** La última fila de una lista: la que la hace crecer. */
export function FilaAgregar({
  texto,
  alTocar,
}: {
  texto: string
  alTocar?: (() => void) | undefined
}) {
  return (
    <Fila {...(alTocar ? { alTocar } : {})} etiqueta={texto}>
      <div className="text-texto-2 flex min-w-0 items-center gap-2 py-2 text-menor">
        <span className="text-teal-osc shrink-0 text-titulo leading-none">+</span>
        <span className="truncate">{texto}</span>
      </div>
    </Fila>
  )
}

/** La celda del nombre: icono opcional, el nombre que se corta, y su detalle. */
/**
 * El icono de una categoría, en el color de su familia.
 *
 * Existe para que el icono y su color no puedan discrepar: son el mismo dato
 * —la clave— leído dos veces, y separarlos era pedir que un día la comida
 * saliera con el tenedor verde en una pantalla y con el tenedor gris en otra.
 *
 * Y para que el color **llegue a las listas**. La píldora de categoría solo
 * sale donde hay sitio para su nombre —Movimientos, el detalle—; en el árbol
 * de El mes el nombre ya está en la fila y la píldora sobraría. Ahí el color
 * viaja en el icono, que es donde la referencia lo pone también.
 */
export function IconoDeCategoria({
  clave,
  tam = 13,
  size = 'size-6',
}: {
  clave: ClaveIcono
  tam?: number
  /** La caja. Las listas usan 24px; las filas sueltas, 26. */
  size?: string
}) {
  return (
    <div
      className={`${size} ${FAMILIAS[FAMILIA_POR_CLAVE[clave]]} grid shrink-0 place-items-center rounded-btn`}
    >
      <IconoDeClave clave={clave} tam={tam} />
    </div>
  )
}

export function CeldaNombre({
  clave,
  icono,
  children,
  detalle,
  className = '',
}: {
  /** La categoría: su icono sale en el color de su familia. */
  clave?: ClaveIcono
  /** Para un icono que no es de categoría. Con `clave` no hace falta. */
  icono?: ReactNode
  children: ReactNode
  detalle?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex min-w-0 items-center gap-[9px] py-[7px] ${className}`}>
      {clave !== undefined ? (
        <IconoDeCategoria clave={clave} />
      ) : (
        icono !== undefined && (
          <div className="bg-gris border-linea text-texto-2 grid size-6 shrink-0 place-items-center rounded-btn border">
            {icono}
          </div>
        )
      )}
      <div className="min-w-0">
        <div className="truncate text-cuerpo font-medium">{children}</div>
        {detalle !== undefined && (
          <div className="text-texto-2 mt-[1px] truncate text-rotulo">{detalle}</div>
        )}
      </div>
    </div>
  )
}

/** Una cifra a la derecha. `apagada` es para el dato de referencia, no el principal. */
export function CeldaCifra({
  children,
  apagada = false,
  className = '',
}: {
  children: ReactNode
  apagada?: boolean
  className?: string
}) {
  return (
    <div
      className={`text-right whitespace-nowrap [font-variant-numeric:tabular-nums] ${
        apagada ? 'text-texto-2 text-menor' : 'text-cuerpo font-semibold'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Las tres celdas de la derecha de una fila de presupuesto: lo gastado, la
 * barra en su carril, y el monto del mes.
 *
 * `design/listas.html` es un documento de 1420px y les da una columna a cada
 * una. En un teléfono de 320 no caben: al nombre le quedarían cuarenta píxeles.
 * Ahí la columna de "gastado" desaparece y las dos cifras se apilan en una
 * sola. No son dos filas distintas —eso se despareja en tres meses— son las
 * mismas celdas, y las que sobran salen con `display:none`, que además las
 * saca de la rejilla. Por eso el orden en el código es el del escritorio.
 */
export function CeldasDeAvance({
  gastadoCents,
  delMesCents,
}: {
  gastadoCents: Centavos
  delMesCents: Centavos
}) {
  const avance = porcentaje(gastadoCents, delMesCents)
  const color = colorDeSobre(gastadoCents, delMesCents)
  const pasado = gastadoCents > delMesCents
  return (
    <>
      <CeldaCifra className={`hidden panel:block ${pasado ? 'text-rojo' : ''}`}>
        <Moneda centavos={gastadoCents} />
      </CeldaCifra>
      <Barra porcentaje={avance} color={color} />
      <CeldaCifra apagada className="hidden panel:block">
        <Moneda centavos={delMesCents} />
      </CeldaCifra>
      <CeldaCifra className={`panel:hidden ${pasado ? 'text-rojo' : ''}`}>
        <Moneda centavos={gastadoCents} />
        <div className="text-texto-2 text-rotulo font-normal">
          de <Moneda centavos={delMesCents} />
        </div>
      </CeldaCifra>
    </>
  )
}

/**
 * Las tres cifras de una fila de semana o de cheque: **Planeado, Gastado y
 * Queda**, con la barra en su carril.
 *
 * La vista por semanas —la que más se va a usar— daba una sola cifra, cuando
 * el árbol del mes ya daba dos. Con una sola, la pregunta que la persona trae
 * ("¿me alcanza?") se contesta restando de cabeza.
 *
 * En el teléfono no caben tres columnas de dinero en 380px: ahí salen Queda
 * grande y Planeado como referencia debajo, con la barra. **Gastado aparece
 * al abrir el renglón** (`gastadoEnMovil`), donde ya hay espacio porque el
 * renglón se desplegó. No son dos filas distintas — eso se despareja en tres
 * meses— son las mismas celdas, y las que sobran salen con `display:none`.
 * Por eso el orden en el código es el del escritorio.
 *
 * Queda no se recibe: se calcula aquí, de Planeado − Gastado. Recibirla
 * abriría la puerta a que una pantalla mande tres números que no se restan
 * entre sí, y una app de presupuesto que no cuadra en la pantalla no vale
 * nada.
 */
export function CeldasDeTresCifras({
  planeadoCents,
  gastadoCents,
  gastadoEnMovil = false,
}: {
  planeadoCents: Centavos
  gastadoCents: Centavos
  /** En el teléfono, enseñar también lo gastado. Se usa al abrir el renglón. */
  gastadoEnMovil?: boolean
}) {
  const queda = centavos(planeadoCents - gastadoCents)
  const claseQueda = claseDeQueda(gastadoCents, planeadoCents)
  return (
    <>
      <CeldaCifra apagada className="hidden panel:block">
        <Moneda centavos={planeadoCents} />
      </CeldaCifra>
      <Barra porcentaje={porcentaje(gastadoCents, planeadoCents)} color={colorDeSobre(gastadoCents, planeadoCents)} />
      <CeldaCifra apagada className="hidden panel:block">
        <Moneda centavos={gastadoCents} />
      </CeldaCifra>
      <CeldaCifra className={`hidden panel:block ${claseQueda}`}>
        <Moneda centavos={queda} />
      </CeldaCifra>
      <CeldaCifra className={`panel:hidden ${claseQueda}`}>
        <Moneda centavos={queda} />
        <div className="text-texto-2 text-rotulo font-normal">
          {gastadoEnMovil && (
            <>
              gastado <Moneda centavos={gastadoCents} /> ·{' '}
            </>
          )}
          de <Moneda centavos={planeadoCents} />
        </div>
      </CeldaCifra>
    </>
  )
}

/**
 * Un fondo de reserva: nombre y fecha objetivo, la barra en su carril, y lo
 * que lleva juntado de lo que necesita. Va dentro de una `ListaSeccion` de tres
 * columnas.
 */
export function FilaFondo({
  nombre,
  acumuladoCents,
  metaCents,
  cuando,
  alTocar,
  etiqueta,
}: {
  nombre: string
  acumuladoCents: Centavos
  metaCents: Centavos
  cuando: ReactNode
  alTocar?: (() => void) | undefined
  etiqueta?: string
}) {
  const avance = porcentaje(acumuladoCents, metaCents)
  return (
    <Fila {...(alTocar ? { alTocar, etiqueta } : {})}>
      <CeldaNombre detalle={cuando}>{nombre}</CeldaNombre>
      <Barra porcentaje={avance} color="var(--teal)" />
      <CeldaCifra>
        <Moneda centavos={acumuladoCents} />
        <div className="text-texto-2 text-rotulo font-normal">
          de <Moneda centavos={metaCents} />
        </div>
      </CeldaCifra>
    </Fila>
  )
}

/**
 * El marco de una hoja que sube desde abajo.
 *
 * Todas las decisiones que tocan dinero se toman en una de estas, y todas
 * comparten lo mismo: fondo oscuro que cierra al tocarlo, esquinas redondeadas
 * arriba, y espacio para la barra del teléfono. Tenerlo en un solo lugar evita
 * que se vayan separando de a poquito, que es como los diseños se rompen.
 */
export function Hoja({
  etiqueta,
  alCerrar,
  children,
}: {
  etiqueta: string
  alCerrar: () => void
  children: ReactNode
}) {
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
        aria-label={etiqueta}
      >
        {children}
      </div>
    </div>
  )
}

/** Campo de dinero: el signo fijo y el número en serif, como las cifras héroe. */
export function CampoDinero({
  valor,
  alCambiar,
  etiqueta,
  autoFoco = false,
  desactivado = false,
}: {
  valor: string
  alCambiar: (v: string) => void
  etiqueta: string
  autoFoco?: boolean
  desactivado?: boolean
}) {
  return (
    <div className="border-linea mt-2 flex items-center gap-2 rounded-card border px-4">
      <span className="text-texto-2 font-serif text-cifra">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={valor}
        autoFocus={autoFoco}
        disabled={desactivado}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder="0.00"
        aria-label={etiqueta}
        className="text-texto font-serif min-h-14 w-full bg-transparent text-cifra [font-variant-numeric:tabular-nums] placeholder:text-tenue focus:outline-none"
      />
    </div>
  )
}

/** Los dos botones del pie de una hoja. */
export function PieDeHoja({
  alCancelar,
  alConfirmar,
  confirmar,
  cancelar = 'Cancelar',
  listo,
  ocupado = false,
}: {
  alCancelar: () => void
  alConfirmar: () => void
  confirmar: string
  cancelar?: string
  listo: boolean
  ocupado?: boolean
}) {
  return (
    <div className="mt-5 flex gap-3">
      <button
        type="button"
        onClick={alCancelar}
        disabled={ocupado}
        className="border-linea text-texto-2 min-h-11 flex-1 rounded-btn border text-cuerpo font-semibold"
      >
        {cancelar}
      </button>
      <button
        type="button"
        onClick={alConfirmar}
        disabled={!listo || ocupado}
        className="bg-teal min-h-11 flex-[1.6] rounded-btn text-cuerpo font-bold text-tinta-teal disabled:opacity-50"
      >
        {ocupado ? 'Guardando…' : confirmar}
      </button>
    </div>
  )
}
