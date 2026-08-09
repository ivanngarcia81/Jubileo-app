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

// Seis tamaños de letra y nada más. La escala es de las reglas que se rompen
// solas: el primer `text-[13.5px]` que alguien escriba "solo por esta vez" no
// truena nada y ya son siete.
const PERMITIDOS = ['11px', '12.5px', '14px', '17px', '26px', '38px']
const colados = new Set()
let medidos = 0
for (const ruta of ['semana', 'mes', 'deudas', 'metas', 'movimientos']) {
  await p.goto(`${BASE}/#/${ruta}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(250)
  const r = await p.evaluate((ok) => {
    // Se recorren los **nodos de texto**, no los elementos: un `<div>` que solo
    // envuelve heredaría los 16px del navegador y saldría como si fuera un
    // tamaño de la app. Lo que cuenta es la letra que se ve.
    const malos = []
    let n, cuantos = 0
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while ((n = w.nextNode())) {
      if (!n.textContent.trim()) continue
      cuantos++
      const t = getComputedStyle(n.parentElement).fontSize
      if (!ok.includes(t)) malos.push(`${t} en "${n.textContent.trim().slice(0, 24)}"`)
    }
    return { malos, cuantos }
  }, PERMITIDOS)
  medidos += r.cuantos
  r.malos.forEach((m) => colados.add(`${ruta}: ${m}`))
}
await p.goto(`${BASE}/#/semana`, { waitUntil: 'networkidle' })
revisar(medidos > 100, `se midieron ${medidos} textos, no dos`)
revisar(colados.size === 0,
  `la escala tipográfica sigue en seis tamaños${colados.size ? `: ${[...colados].slice(0, 6).join(' · ')}` : ''}`)

// Un campo de texto de menos de 16px hace que iOS le haga zoom a la página al
// enfocarlo, y salir de ese zoom es cosa del usuario. Se mide en el navegador
// porque en el código el tamaño puede venir heredado.
for (const ruta of ['semana', 'mes', 'ajustes']) {
  await p.goto(`${BASE}/#/${ruta}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(250)
  const chicos = await p.evaluate(() =>
    [...document.querySelectorAll('input, textarea')]
      .filter((e) => !['checkbox', 'radio', 'range', 'hidden'].includes(e.type))
      .map((e) => [e.getAttribute('aria-label') ?? e.type, parseFloat(getComputedStyle(e).fontSize)])
      .filter(([, t]) => t < 16),
  )
  revisar(chicos.length === 0,
    `${ruta}: ningún campo de texto baja de 16px${chicos.length ? ` — ${chicos.map(([n, t]) => `${n} en ${t}px`).join(', ')}` : ''}`)
}
await p.goto(`${BASE}/#/semana`, { waitUntil: 'networkidle' })

// Las cifras héroe dependen de Instrument Serif: sin ella el diseño se cae.
const fuentes = await p.evaluate(async () => {
  await document.fonts.ready
  return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)
})
revisar(fuentes.includes('Instrument Serif'), 'Instrument Serif carga desde el propio servidor')
revisar(fuentes.includes('Inter'), 'Inter carga desde el propio servidor')

// Instalable de verdad: sin manifiesto ni iconos, "Agregar a la pantalla de
// inicio" pone una captura borrosa — y sin instalar no hay push en iOS.
const pwa = await p.evaluate(async () => {
  const enlace = document.querySelector('link[rel=manifest]')
  if (!enlace) return { manifiesto: false }
  const m = await (await fetch(enlace.getAttribute('href'))).json()
  const iconos = await Promise.all(
    m.icons.map(async (i) => (await fetch(i.src)).ok),
  )
  return {
    manifiesto: true,
    standalone: m.display === 'standalone',
    maskable: m.icons.some((i) => i.purpose === 'maskable'),
    iconos: iconos.every(Boolean),
    apple: Boolean(document.querySelector('link[rel=apple-touch-icon]')),
    appleOk: (await fetch('/apple-touch-icon.png')).ok,
  }
})
revisar(pwa.manifiesto && pwa.standalone, 'el manifiesto existe y abre en modo app')
revisar(pwa.iconos && pwa.maskable, 'los iconos del manifiesto cargan, con uno enmascarable')
revisar(pwa.apple && pwa.appleOk, 'iOS tiene su propio icono para la pantalla de inicio')

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

// ---------- Los anchos de en medio, que es donde se rompia ----------
// La app solo se veia bien en los dos anchos que dibujan los mockups: 352 y
// 1420. En cualquier otro se estiraba. Aqui se miden los de en medio y el
// extremo, que son los que nadie mira hasta que un cliente los reporta.
const ANCHOS = [
  { w: 768, quien: 'iPad vertical', arbol: 'movil' },
  // 900 mira el borde recien creado: el cambio a escritorio bajo a 880, y las
  // demas medidas pasaban por encima de ese rango sin tocarlo.
  { w: 900, quien: 'apenas pasado el corte', arbol: 'escritorio' },
  { w: 1024, quien: 'iPad horizontal', arbol: 'escritorio' },
  { w: 1180, quien: 'laptop de 13"', arbol: 'escritorio' },
  { w: 2560, quien: 'monitor externo', arbol: 'escritorio' },
]
for (const { w, quien, arbol } of ANCHOS) {
  const ctx = await navegador.newContext({ viewport: { width: w, height: 900 } })
  const v = vigilar(await ctx.newPage())
  await v.goto(`${BASE}/#/${arbol === 'movil' ? 'semana' : 'resumen'}`, { waitUntil: 'networkidle' })
  await v.waitForTimeout(400)
  await v.screenshot({ path: `${SALIDA}/ancho-${w}.png` })

  const barrido = await v.evaluate(() => document.documentElement.scrollWidth)
  revisar(barrido <= w, `${quien} (${w}px): no se barre de lado (${barrido})`)

  // Lo que de verdad se veia mal: el contenido creciendo sin tope. Se mide el
  // elemento visible mas ancho de la pagina — en escritorio no hay `<main>`, y
  // buscarlo devolvia cero, o sea una comprobacion que pasaba siempre.
  // Se mide una pieza concreta y no "el elemento mas ancho": el fondo si llega
  // hasta el borde a proposito, y medirlo todo hacia que la comprobacion
  // midiera el contenedor raiz y no el contenido.
  // Un solo arbol en el documento, no dos escondidos con CSS. Dos `<nav>` con
  // la misma etiqueta y dos `<main>` no son un detalle de rendimiento: para
  // quien navega con lector son dos de cada cosa, la mitad invisible.
  const duplicados = await v.evaluate(() => ({
    nav: document.querySelectorAll('nav[aria-label="Navegación principal"]').length,
    main: document.querySelectorAll('main').length,
  }))
  revisar(duplicados.nav <= 1 && duplicados.main <= 1,
    `${quien}: un solo arbol en el DOM (${duplicados.nav} nav, ${duplicados.main} main)`)

  const ancho = await v.evaluate((esMovil) => {
    // `[data-ancho="contenido"]` y no el elemento con `bg-carbon`: desde que el
    // fondo llega de borde a borde, ese mide lo que mide la pantalla, a
    // proposito. Lo que se vigila es el contenido de adentro.
    const candidatos = esMovil ? 'main' : '[data-ancho="contenido"]'
    for (const el of document.querySelectorAll(candidatos)) {
      const r = el.getBoundingClientRect()
      if (r.width > 0) return r.width
    }
    return -1
  }, arbol === 'movil')
  revisar(ancho > 0, `${quien}: se encontro la pieza que se mide`)
  const tope = arbol === 'movil' ? 460 : 1440
  revisar(ancho <= tope, `${quien}: el contenido se detiene en ${Math.round(ancho)}px, no crece sin fin`)
  // Y el reverso, que es lo que se rompio al poner el tope en el lugar
  // equivocado: la superficie oscura TIENE que llegar al borde. Antes era la
  // barra de arriba y se medía a lo ancho; desde que la navegacion vive en el
  // sidebar, el sidebar es esa superficie y lo que tiene que llegar al borde
  // es el ALTO — y su izquierda tiene que estar pegada al cero.
  if (arbol !== 'movil') {
    const lado = await v.evaluate(() => {
      const sb = document.querySelector('aside.bg-carbon')
      if (!sb) return null
      const r = sb.getBoundingClientRect()
      return { izquierda: r.left, alto: r.height, ventana: window.innerHeight }
    })
    revisar(lado !== null && lado.izquierda === 0,
      `${quien}: el sidebar arranca en el borde izquierdo (${lado?.izquierda})`)
    revisar(lado !== null && lado.alto >= lado.ventana,
      `${quien}: y llega hasta abajo (${Math.round(lado?.alto ?? 0)} de ${lado?.ventana})`)
  }
  await ctx.close()
}

// ---------- El rail de semanas del sidebar ----------
// El contexto permanente de Jubileo. Se mide en un ancho de escritorio, que es
// donde el sidebar existe.
const railCtx = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
const rail = vigilar(await railCtx.newPage())
await rail.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })
await rail.waitForTimeout(400)

// Agosto tiene 31 dias: cinco semanas. Un febrero de 28 tendria cuatro. El
// rail no puede dibujar cinco siempre — la quinta es justo donde el usuario
// truena, y una quinta que no existe seria dinero que ninguna vista enseña.
const semanasDelRail = await rail.evaluate(() =>
  [...document.querySelectorAll('aside button[aria-label^="Semana "]')].map((b) =>
    b.getAttribute('aria-label'),
  ),
)
revisar(semanasDelRail.length === 5,
  `el rail enseña las semanas que tiene el mes, no cinco siempre (agosto: ${semanasDelRail.length})`)
revisar(/del 29 al 31/.test(semanasDelRail[4] ?? ''),
  `y la ultima trae su rango de verdad: ${semanasDelRail[4]}`)
revisar((await rail.locator('aside').innerText()).includes('3 días'),
  'la quinta se rotula con sus dias, porque mide distinto que las otras cuatro')

// Tocar una semana lleva a El mes, en el eje Semanas, con esa semana abierta.
await rail.getByRole('button', { name: /^Semana 4/ }).first().click()
await rail.waitForTimeout(500)
revisar((await rail.evaluate(() => location.hash)).includes('semana=4'),
  `tocar una semana del rail lleva a El mes con esa semana: ${await rail.evaluate(() => location.hash)}`)
// `body` y no `[data-ancho]`: en escritorio ese gancho lo lleva la cabecera,
// que es lo primero del DOM y solo dice el nombre de la pantalla.
const enElMes = await rail.locator('body').innerText()
revisar(enElMes.includes('Semanas de agosto'),
  'y cae en el eje de Semanas, no en el arbol del mes')
revisar(
  await rail
    .getByRole('button', { name: 'Cerrar la semana 4' })
    .first()
    .isVisible(),
  'con la semana que se toco ya desplegada',
)
await railCtx.close()

// ---------- Las tres cifras de la vista por semanas ----------
// Planeado, Gastado y Queda. Lo que se mide no es que salgan las tres —eso lo
// diria cualquier captura— sino que **se resten entre si**. Queda se calcula en
// el componente justo para que no puedan separarse; esto lo comprueba en el
// navegador, contra el DOM de verdad, en las dos vistas que la usan.
const cifrasCtx = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
const cifras = vigilar(await cifrasCtx.newPage())
const dinero = (t) => Number(String(t).replace(/[^0-9.-]/g, ''))

for (const [eje, rotulos] of [
  ['Semanas', ['Planeado', 'Gastado', 'Queda']],
  ['Cheques', ['Entra', 'Cubre', 'Queda']],
]) {
  await cifras.goto(`${BASE}/#/mes`, { waitUntil: 'networkidle' })
  await cifras.waitForTimeout(400)
  await cifras.getByRole('button', { name: eje, exact: true }).first().click()
  await cifras.waitForTimeout(300)

  const encabezados = await cifras.evaluate((eje) => {
    const seccion = [...document.querySelectorAll('section, div')].find((e) =>
      /^(Semanas|Cheques) de /.test(e.textContent ?? ''))
    return seccion ? [...seccion.querySelectorAll('*')].map((e) => e.textContent) : []
  }, eje)
  revisar(rotulos.every((r) => encabezados.some((t) => t === r)),
    `${eje}: los encabezados dicen ${rotulos.join(', ')}`)

  // La primera fila de la lista: sus cuatro cifras visibles en escritorio son
  // Planeado, Gastado, Queda y —oculta— la version de telefono.
  const fila = await cifras.evaluate(() => {
    const boton = [...document.querySelectorAll('button')].find((b) =>
      /^(Abrir|Cerrar) la semana /.test(b.getAttribute('aria-label') ?? ''))
      ?? [...document.querySelectorAll('div')].find((d) => /^Cheque 1/.test(d.textContent ?? ''))
    if (!boton) return null
    const caja = boton.closest('[style*="--cols"]') ? boton : boton
    const celdas = [...caja.querySelectorAll('div')]
      // `-$919` y `-US$919` existen: una semana se puede pasar de lo planeado.
      .filter((e) => getComputedStyle(e).display !== 'none' && /^-?[A-Z]*\$[\d,.]+$/.test(e.textContent?.trim() ?? ''))
      .map((e) => e.textContent.trim())
    return celdas
  })
  revisar(fila !== null && fila.length >= 3,
    `${eje}: la primera fila trae sus tres cifras (${fila?.join(' · ') ?? 'ninguna'})`)
  if (fila && fila.length >= 3) {
    const [planeado, gastado, queda] = fila.map(dinero)
    revisar(Math.abs(planeado - gastado - queda) <= 1,
      `${eje}: ${rotulos[0]} − ${rotulos[1]} = ${rotulos[2]} (${planeado} − ${gastado} = ${queda})`)
  }
}
await cifrasCtx.close()

// ---------- El sidebar en una pantalla baja ----------
// Un mes de cinco semanas mas el enfoque no caben en una laptop de poco alto.
// Cuando el `aside` entero se desplazaba, bajar un poco se llevaba la marca y
// los cinco destinos fuera de la vista: quedarse sin manera de salir de la
// pantalla no es un desplazamiento, es una trampa. Solo la zona de en medio
// —el rail y el enfoque— se mueve; la navegacion y el pie se quedan.
const bajoCtx = await navegador.newContext({ viewport: { width: 1280, height: 560 } })
const bajo = vigilar(await bajoCtx.newPage())
await bajo.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })
await bajo.waitForTimeout(400)

// La zona de en medio tiene que ser la que se desborda, y no el `aside`.
const desborde = await bajo.evaluate(() => {
  const sb = document.querySelector('aside.bg-carbon')
  if (!sb) return null
  const medio = sb.querySelector('div.overflow-y-auto')
  if (!medio) return null
  return {
    aside: sb.scrollHeight - sb.clientHeight,
    medio: medio.scrollHeight - medio.clientHeight,
  }
})
revisar(desborde !== null && desborde.medio > 0,
  `en una pantalla baja la zona de en medio se desborda (${desborde?.medio}px)`)
revisar(desborde !== null && desborde.aside === 0,
  `y el sidebar entero no (${desborde?.aside}px)`)

// Y al empujar esa zona hasta el fondo, la salida sigue ahi.
// Se empuja lo que se pueda empujar: si un dia el desplazamiento vuelve al
// `aside`, este mismo empujon se lo lleva la navegacion y las tres de abajo lo
// dicen. Empujar solo la zona de en medio dejaria pasar justo esa regresion.
await bajo.evaluate(() => {
  const sb = document.querySelector('aside.bg-carbon')
  if (!sb) return
  for (const caja of [sb, ...sb.querySelectorAll('div')]) caja.scrollTop = caja.scrollHeight
})
await bajo.waitForTimeout(200)
for (const destino of ['Dashboard', 'Movimientos', 'Ajustes']) {
  const caja = await bajo
    .getByRole('button', { name: destino, exact: true })
    .first()
    .boundingBox()
  revisar(caja !== null && caja.y >= 0 && caja.y + caja.height <= 560,
    `con el rail hasta el fondo, "${destino}" sigue en la pantalla`)
}
await bajoCtx.close()

// ---------- La pantalla de inicio, y la direccion que se mudo ----------
// El Dashboard tomo el lugar de Mi semana. Lo que no puede pasar es que quien
// tenga `#/semana` guardado en marcadores o clavado en la pantalla de inicio
// del telefono aterrice en cualquier parte: se le prometio un destino.
const inicioCtx = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
const inicio = vigilar(await inicioCtx.newPage())
await inicio.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await inicio.waitForTimeout(400)
revisar(/Dashboard/.test(await inicio.locator('h1').first().innerText()),
  `la app abre en el Dashboard (${await inicio.locator('h1').first().innerText()})`)

await inicio.goto(`${BASE}/#/semana`, { waitUntil: 'networkidle' })
await inicio.waitForTimeout(400)
revisar(/Dashboard/.test(await inicio.locator('h1').first().innerText()),
  '#/semana lleva al Dashboard en vez de caer por descarte')
revisar(!(await inicio.locator('aside').innerText()).includes('Mi semana'),
  'y "Mi semana" ya no es un destino del sidebar')
await inicioCtx.close()

// ---------- El corte, medido justo en su borde ----------
// Desde que el arbol se escoge con logica, el numero vive en dos mundos: la
// media query de `tema.css` y el `matchMedia` de `pantalla.ts`, que lo lee de
// ahi. Si algun dia dejan de coincidir, la app dibujaria el arbol de un lado
// con los estilos del otro — y eso no se ve en ningun ancho "redondo". Se mide
// el pixel de antes y el de despues.
for (const [w, espera] of [
  [879, 'movil'],
  [880, 'escritorio'],
]) {
  const ctx = await navegador.newContext({ viewport: { width: w, height: 900 } })
  const v = vigilar(await ctx.newPage())
  await v.goto(`${BASE}/#/${espera === 'movil' ? 'semana' : 'resumen'}`, { waitUntil: 'networkidle' })
  await v.waitForTimeout(300)
  const cual = await v.evaluate(() =>
    document.querySelector('[data-ancho="contenido"]') ? 'escritorio' : 'movil',
  )
  revisar(cual === espera,
    `a ${w}px se dibuja el arbol de ${espera}: el corte de CSS y el de JS son el mismo`)
  await ctx.close()
}

await navegador.close()

revisar(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.join(' | ')}` : ''}`)

console.log(`\nCapturas en ${SALIDA}/`)
if (fallas.length) {
  console.log(`\n${fallas.length} revisión(es) fallaron.`)
  process.exit(1)
}
console.log('\nTodo en orden.')
