/**
 * Revisa las pantallas contra el contrato visual y contra las reglas del SPEC
 * que se pueden medir en un navegador de verdad.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node herramientas/revisar-pantallas.mjs [carpeta-de-salida]
 *
 * Comprueba:
 *   · que ninguna pantalla se barra de lado
 *   · que los objetivos tocables lleguen a 44px aunque se vean más chicos
 *   · que las tipografías del contrato carguen de verdad
 *   · que el deslizador de deudas recalcule la fecha en vivo
 *   · que no haya errores en la consola
 * y deja una captura de cada pantalla al lado de la del mockup.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const SALIDA = process.argv[2] ?? 'capturas'
const BASE = process.env.URL_APP ?? 'http://localhost:4173'
const RAIZ = new URL('..', import.meta.url).pathname

mkdirSync(SALIDA, { recursive: true })

const fallas = []
const revisar = (condicion, mensaje) => {
  console.log(`${condicion ? '  ok   ' : '  FALLA'}  ${mensaje}`)
  if (!condicion) fallas.push(mensaje)
}

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
})

const errores = []
const vigilar = (pagina) => {
  pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()))
  pagina.on('pageerror', (e) => errores.push(String(e)))
  return pagina
}

// ---------- El contrato visual, para comparar al lado ----------
const contrato = await navegador.newContext({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 2 })
const mock = await contrato.newPage()
await mock.goto(`file://${RAIZ}design/movil.html`, { waitUntil: 'networkidle' })
await mock.waitForTimeout(500)
for (const [i, tel] of (await mock.locator('.phone').all()).entries()) {
  await tel.screenshot({ path: `${SALIDA}/mockup-${['semana', 'mes', 'deudas', 'aviso'][i]}.png` })
}
const mockEsc = await contrato.newPage()
await mockEsc.goto(`file://${RAIZ}design/escritorio.html`, { waitUntil: 'networkidle' })
await mockEsc.waitForTimeout(500)
await mockEsc.locator('.win').screenshot({ path: `${SALIDA}/mockup-escritorio.png` })
await contrato.close()

// ---------- Teléfono ----------
const tel = await navegador.newContext({ viewport: { width: 352, height: 706 }, deviceScaleFactor: 2 })
const p = vigilar(await tel.newPage())

for (const ruta of ['semana', 'mes', 'deudas', 'metas', 'aviso']) {
  await p.goto(`${BASE}/#/${ruta}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${SALIDA}/app-${ruta}.png` })
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth)
  revisar(ancho <= 352, `${ruta}: no se barre de lado (scrollWidth ${ancho})`)
}

await p.goto(`${BASE}/#/semana`, { waitUntil: 'networkidle' })

// Objetivos tocables: se mide el área que responde, no la caja visible.
const toque = await p.evaluate(() => {
  const casilla = document.querySelector('[role=checkbox]')
  const c = casilla.getBoundingClientRect()
  const cx = c.left + c.width / 2
  const cy = c.top + c.height / 2
  return [
    [0, 0],
    [-20, 0],
    [20, 0],
    [0, -20],
    [0, 20],
  ].every(([dx, dy]) => {
    const el = document.elementFromPoint(cx + dx, cy + dy)
    return el === casilla || casilla.contains(el)
  })
})
revisar(toque, 'la casilla de pago responde en un área de 44px')

// Las cifras héroe dependen de Instrument Serif: sin ella el diseño se cae.
const fuentes = await p.evaluate(async () => {
  await document.fonts.ready
  return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)
})
revisar(fuentes.includes('Instrument Serif'), 'Instrument Serif carga desde el propio servidor')
revisar(fuentes.includes('Inter'), 'Inter carga desde el propio servidor')

// El deslizador de deudas tiene que recalcular en vivo.
await p.goto(`${BASE}/#/deudas`, { waitUntil: 'networkidle' })
const leerFecha = () => p.locator('text=/Sales en /').first().innerText()
const antes = await leerFecha()
await p.getByLabel('Pago extra cada mes').first().fill('30000')
await p.waitForTimeout(150)
const despues = await leerFecha()
revisar(antes !== despues, `el deslizador recalcula la fecha (${antes.trim()} → ${despues.trim()})`)

await tel.close()

// ---------- Escritorio ----------
const esc = await navegador.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 })
const d = vigilar(await esc.newPage())
for (const ruta of ['resumen', 'mes', 'deudas', 'metas', 'ajustes']) {
  await d.goto(`${BASE}/#/${ruta}`, { waitUntil: 'networkidle' })
  await d.waitForTimeout(300)
  await d.screenshot({ path: `${SALIDA}/app-escritorio-${ruta}.png` })
  const ancho = await d.evaluate(() => document.documentElement.scrollWidth)
  revisar(ancho <= 1440, `escritorio ${ruta}: no se barre de lado (scrollWidth ${ancho})`)
}
await esc.close()
await navegador.close()

revisar(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.join(' | ')}` : ''}`)

console.log(`\nCapturas en ${SALIDA}/`)
if (fallas.length) {
  console.log(`\n${fallas.length} revisión(es) fallaron.`)
  process.exit(1)
}
console.log('\nTodo en orden.')
