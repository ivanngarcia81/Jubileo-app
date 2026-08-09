/**
 * El candado de los tokens.
 *
 *   node herramientas/revisar-tokens.mjs
 *
 * `design/design-tokens.css` dice que es "la única fuente de verdad para color
 * y tipo", y `tema.css` repite que el único lugar donde vive un hex es ese
 * archivo. Era falso: llegó a haber 92 hexes crudos en `src/`. Un archivo que
 * declara una regla que nadie comprueba no es una regla, es una nota.
 *
 * Esto es un **trinquete**, no una limpieza: no exige cero hexes hoy —quedan 43
 * y sacarlos es una decisión de diseño pendiente, porque son ocho grises casi
 * iguales y colapsarlos mueve píxeles en casi toda la app—. Lo que hace es que
 * el número **solo pueda bajar**. Aparece un color nuevo, o sube la cuenta de
 * uno viejo, y esto truena. Baja, y también truena, pidiendo que se actualice
 * el inventario: un trinquete que se afloja solo no es un trinquete.
 *
 * Y de paso cierra la escala tipográfica en el código fuente. Ya está cerrada
 * en el navegador —`revisar-pantallas.mjs` recorre los nodos de texto— pero eso
 * exige compilar y levantar la app. Aquí se ve al escribirlo.
 */
import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'

const RAIZ = new URL('..', import.meta.url).pathname

/**
 * Lo que **no** se revisa, y por qué.
 *
 * El correo va en HTML de 1998: Gmail y Outlook no entienden `var()`, así que
 * ahí los hexes son la única forma que hay. Los colores de ese archivo son
 * suyos a propósito y están comentados en su cabecera.
 */
const EXENTOS = ['src/lib/aviso/correo.ts', 'src/lib/aviso/aviso.test.ts']

/**
 * El inventario congelado: qué color crudo queda, cuántas veces, y qué trabajo
 * hace. Sacarlos a token es la tarea pendiente; mientras tanto, esta lista es
 * el techo.
 */
const INVENTARIO = {
  '#9AA09E': [17, 'marcador de posición en claro, y texto secundario sobre carbón'],
  '#787E7D': [11, 'texto apagado sobre carbón: nav inactivo, rótulos'],
  '#6E7473': [6, 'texto secundario, en claro y sobre carbón'],
  '#C3C7C4': [4, 'marcador de posición del campo de dinero'],
  '#FBFCFB': [2, 'fondo de la fila que abre un grupo'],
  '#FAFBFA': [1, 'fondo de una fila al pasar el puntero'],
  '#C9CECC': [1, 'texto de la lista de premium sobre carbón'],
  '#C9CCCA': [1, 'la hora en la vista previa del aviso'],
  '#B9C2BF': [1, 'la barra de un mes que sí se alcanza, en el selector'],
  '#A7ACAB': [1, 'iniciales del avatar sobre carbón-2'],
  '#8E9492': [1, 'texto del bloque oscuro de premium'],
  '#3E4342': [1, 'texto de un renglón dentro de la notificación'],
  '#3A2A08': [1, 'texto sobre la barra ámbar de "sin conexión"'],
  '#262A2B': [1, 'el borde de abajo de la barra superior'],
}

const fallas = []
const ok = (c, m) => {
  console.log(`${c ? '  ok   ' : '  FALLA'}  ${m}`)
  if (!c) fallas.push(m)
}

const archivos = globSync('src/**/*.{ts,tsx}', { cwd: RAIZ }).filter(
  (f) => !EXENTOS.includes(f.replaceAll('\\', '/')),
)

// ---- Color -----------------------------------------------------------------
const cuenta = new Map()
const donde = new Map()
for (const f of archivos) {
  const texto = readFileSync(RAIZ + f, 'utf8')
  for (const m of texto.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)) {
    const hex = m[0].toUpperCase()
    cuenta.set(hex, (cuenta.get(hex) ?? 0) + 1)
    if (!donde.has(hex)) donde.set(hex, f)
  }
}

const nuevos = [...cuenta.keys()].filter((h) => !(h in INVENTARIO))
ok(
  nuevos.length === 0,
  nuevos.length === 0
    ? 'ningún color crudo nuevo: los que faltan salen de design-tokens.css'
    : `color crudo sin declarar: ${nuevos.map((h) => `${h} en ${donde.get(h)}`).join(', ')} — decláralo en design/design-tokens.css`,
)

const subieron = []
const bajaron = []
for (const [hex, [tope]] of Object.entries(INVENTARIO)) {
  const hoy = cuenta.get(hex) ?? 0
  if (hoy > tope) subieron.push(`${hex}: ${tope} → ${hoy}`)
  if (hoy < tope) bajaron.push(`${hex}: ${tope} → ${hoy}`)
}
ok(subieron.length === 0, subieron.length === 0
  ? 'ningún color crudo se usó más veces que antes'
  : `crecieron: ${subieron.join(', ')} — usa el token, no el hex`)
ok(bajaron.length === 0, bajaron.length === 0
  ? 'el inventario está al día'
  : `bajaron (bien): ${bajaron.join(', ')} — actualiza INVENTARIO en este archivo`)

const total = [...cuenta.values()].reduce((a, b) => a + b, 0)
console.log(`\n  ${total} colores crudos en ${archivos.length} archivos. El techo solo baja.`)

// ---- Tipografía -------------------------------------------------------------
// La escala son seis tamaños y viven en tokens. Un `text-[13.5px]` escrito
// "solo por esta vez" no truena nada, y ya son siete.
const sueltos = []
for (const f of archivos) {
  const texto = readFileSync(RAIZ + f, 'utf8')
  for (const m of texto.matchAll(/text-\[[\d.]+(px|rem|em)\]/g)) sueltos.push(`${m[0]} en ${f}`)
}
ok(sueltos.length === 0, sueltos.length === 0
  ? 'ningún tamaño de letra suelto: la escala son seis y salen de los tokens'
  : `tamaños sueltos: ${sueltos.join(', ')}`)

if (fallas.length) {
  console.log(`\n${fallas.length} fallaron.`)
  process.exit(1)
}
console.log('\nTodo en orden.')
