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
 * Empezó como un **trinquete** —el número solo podía bajar— porque quedaban
 * doce grises casi iguales y colapsarlos movía píxeles en casi toda la app.
 * Ya se colapsaron: el inventario está vacío y la regla es la que el archivo
 * de tokens decía desde el principio, cero hexes crudos. La maquinaria del
 * trinquete se queda por si algún día vuelve a hacer falta.
 *
 * Cierra además otras dos escalas en el código fuente:
 *
 * - **La tipografía.** Seis tamaños. Ya está cerrada en el navegador
 *   —`revisar-pantallas.mjs` recorre los nodos de texto— pero eso exige
 *   compilar y levantar la app. Aquí se ve al escribirlo.
 * - **Los radios.** Tres: chip, botón, tarjeta. Llegó a haber trece valores en
 *   147 lugares, con diferencias —7 contra 8 contra 9— que no distingue nadie.
 *   Este es el que más falta hacía: un radio suelto es lo más fácil de escribir
 *   sin pensarlo y lo más difícil de ver en una revisión.
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
  // Vacío, y así se queda. Los doce que había salieron a token: los ocho tonos
  // sobre carbón se doblaron en los tres niveles de `--texto-claro*`, los dos
  // blancos casi iguales en `--blanco-2`, el marcador de posición y la barra
  // tenue en `--tenue`, y la tinta de la barra ámbar en `--tinta-ambar`.
  // Agregar una entrada aquí es declarar una deuda: que quede escrito por qué.
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
  // Sin `\b` al final: en `#31302B_58%` —una parada de degradado— el guion
  // bajo es carácter de palabra, así que `\b` no cerraba y el hex pasaba
  // invisible. El candado decía cero teniendo dos. La condición correcta es que
  // no siga otro dígito hexadecimal.
  for (const m of texto.matchAll(/#[0-9A-Fa-f]{3,8}(?![0-9A-Fa-f])/g)) {
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

// ---- Radios -----------------------------------------------------------------
// Tres y nada más: `rounded-chip`, `rounded-btn`, `rounded-card`, con sus
// variantes direccionales (`rounded-t-card`). Cualquier otra cosa —un
// `rounded-[7px]` copiado de un mockup, un `rounded-full`, un `rounded-lg` de
// Tailwind— es un cuarto valor, y con cuatro ya no hay escala.
//
// La regla es de forma, no de píxeles: lo redondo del todo es chip, lo que se
// toca es botón, lo que contiene es tarjeta. Si un diseño pide un cuarto, la
// pregunta es qué papel nuevo cumple.
//
// Ojo con las cajas chicas: CSS **recorta** el radio cuando dos esquinas suman
// más que el lado, así que `rounded-btn` sobre una caja de 21px sale círculo.
// La solución es subir la caja a 22 o más, no agregar un radio.
const RADIOS = new Set(['chip', 'btn', 'card'])
const radiosSueltos = []
for (const f of archivos) {
  const texto = readFileSync(RAIZ + f, 'utf8')
  for (const m of texto.matchAll(/\brounded(?:-[trblse]{1,2})?-([a-z0-9[\]().%-]+)/g)) {
    if (!RADIOS.has(m[1])) radiosSueltos.push(`${m[0]} en ${f}`)
  }
}
ok(radiosSueltos.length === 0, radiosSueltos.length === 0
  ? 'los radios cierran en tres: chip, botón y tarjeta'
  : `radios sueltos: ${radiosSueltos.slice(0, 8).join(', ')}${radiosSueltos.length > 8 ? ` y ${radiosSueltos.length - 8} más` : ''}`)

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
