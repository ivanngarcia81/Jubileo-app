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

for (const ruta of ['resumen', 'mes', 'deudas', 'metas', 'aviso']) {
  await p.goto(`${BASE}/#/${ruta}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${SALIDA}/app-${ruta}.png` })
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth)
  revisar(ancho <= 352, `${ruta}: no se barre de lado (scrollWidth ${ancho})`)
}

await p.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })

// Objetivos tocables: se mide el área que responde, no la caja visible. Las
// casillas de pago viven en el detalle de la semana desde que el Dashboard es
// la pantalla de inicio.
await p.goto(`${BASE}/#/mes?semana=1`, { waitUntil: 'networkidle' })
await p.waitForTimeout(400)
// `elementFromPoint` solo ve lo que cae dentro de la ventana, asi que la
// casilla tiene que estar a la vista antes de medirla. Sin esto, la
// comprobacion se rompe cada vez que algo crece por encima de la lista — y eso
// no es un defecto del area tocable, que es lo unico que aqui se mide.
// Al **centro**, no solo "a la vista": `scrollIntoViewIfNeeded` la deja pegada
// al borde de abajo, que es donde flota la pildora de navegacion, y entonces lo
// que se mediria es la pildora. Centrada, los cinco puntos caen dentro de la
// ventana y sobre la casilla.
await p.evaluate(() =>
  document.querySelector('[role=checkbox]').scrollIntoView({ block: 'center' }),
)
await p.waitForTimeout(300)
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
for (const ruta of ['resumen', 'mes', 'deudas', 'metas', 'movimientos']) {
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
await p.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })
revisar(medidos > 100, `se midieron ${medidos} textos, no dos`)
revisar(colados.size === 0,
  `la escala tipográfica sigue en seis tamaños${colados.size ? `: ${[...colados].slice(0, 6).join(' · ')}` : ''}`)

// Un campo de texto de menos de 16px hace que iOS le haga zoom a la página al
// enfocarlo, y salir de ese zoom es cosa del usuario. Se mide en el navegador
// porque en el código el tamaño puede venir heredado.
for (const ruta of ['resumen', 'mes', 'ajustes']) {
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
await p.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })

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

// ---------- Dos puertas, dos propositos ----------
// Presupuesto mensual es para MIRAR —cuanto se fue en comida en todo el mes— y
// una semana del riel es para TRABAJAR. Antes las dos abrian en Semanas y el
// eje se recordaba, asi que el destino del menu no llevaba a ningun sitio
// distinto del que ya estabas.
const puertaCtx = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
const pu = vigilar(await puertaCtx.newPage())

await pu.goto(`${BASE}/#/mes`, { waitUntil: 'networkidle' })
await pu.waitForTimeout(500)
revisar((await pu.locator('body').innerText()).includes('Categorías de agosto'),
  'el destino del menu abre en el resumen del mes por categoria')

await pu.goto(`${BASE}/#/mes?semana=3`, { waitUntil: 'networkidle' })
await pu.waitForTimeout(500)
const enSemana = await pu.locator('body').innerText()
revisar(enSemana.includes('Semanas de agosto'), 'y una semana del riel abre en el reparto semanal')
revisar(await pu.getByRole('button', { name: 'Cerrar la semana 3' }).first().isVisible(),
  'con la semana que se pidio ya desplegada')

// Y la memoria ya no manda: volver al destino del menu despues de trabajar una
// semana tiene que devolver el resumen, no el reparto.
await pu.getByRole('button', { name: 'Semanas', exact: true }).first().click()
await pu.waitForTimeout(300)
await pu.goto(`${BASE}/#/mes`, { waitUntil: 'networkidle' })
await pu.waitForTimeout(500)
revisar((await pu.locator('body').innerText()).includes('Categorías de agosto'),
  'y despues de trabajar una semana, el menu sigue llevando al resumen')
await puertaCtx.close()

// ---------- El extra del deslizador cae en UNA deuda, y se ve ----------
// El deslizador decia "+$350" y la lista, a diez centimetros, "Solo el minimo
// · $50". Las dos ciertas —una simula, la otra es lo que pagas— pero juntas no
// se distinguen, y faltaba lo unico que importa: que el extra va COMPLETO a la
// de menor saldo, no repartido. Eso es el metodo, y verlo caer en una sola
// fila es lo que lo ensena sin explicarlo.
const extraCtx = await navegador.newContext({ viewport: { width: 1100, height: 900 } })
const ex = vigilar(await extraCtx.newPage())
await ex.goto(`${BASE}/#/deudas`, { waitUntil: 'networkidle' })
await ex.waitForTimeout(500)
await ex.getByLabel('Pago extra cada mes').first().fill('35000')
await ex.waitForTimeout(400)
const filas = await ex.evaluate(() =>
  [...document.querySelectorAll('[style*="--cols"] > div')]
    .map((e) => e.innerText)
    .filter((t) => /Minimo|mínimo/i.test(t)),
)
const conExtra = filas.filter((t) => /con el extra/.test(t))
revisar(conExtra.length === 1,
  `el extra cae en UNA sola deuda, no repartido (${conExtra.length} filas lo dicen)`)
revisar(/enfoque/i.test(conExtra[0] ?? ''),
  'y es la de enfoque, que es la de menor saldo')
revisar((await ex.locator('body').innerText()).includes('el extra va a'),
  'la lista dice a cual va antes de que la leas fila por fila')
await ex.getByLabel('Pago extra cada mes').first().fill('0')
await ex.waitForTimeout(400)
revisar(!(await ex.locator('body').innerText()).includes('con el extra'),
  'y sin extra no promete nada')
await extraCtx.close()

// ---------- Ningun boton de mentira en la cabecera del telefono ----------
// La cabecera dibujaba un circulo con borde, del tamano de un pulgar, en la
// esquina donde toda app pone su accion — y era un `div`. Seis pantallas con
// un boton que no responde. Lo que se mide es que todo lo que PARECE tocable
// en esa cabecera sea de verdad un boton.
const cabCtx = await navegador.newContext({ viewport: { width: 352, height: 706 } })
const cab = vigilar(await cabCtx.newPage())
for (const ruta of ['resumen', 'mes', 'deudas', 'metas', 'movimientos', 'ajustes']) {
  await cab.goto(`${BASE}/#/${ruta}`, { waitUntil: 'networkidle' })
  await cab.waitForTimeout(300)
  const falsos = await cab.evaluate(() => {
    const h = document.querySelector('header')
    if (!h) return []
    // Un circulo con borde y de 30px para arriba, que no sea boton ni enlace.
    return [...h.querySelectorAll('div')]
      .filter((e) => {
        const s = getComputedStyle(e)
        const r = e.getBoundingClientRect()
        return (
          r.width >= 30 && r.width <= 48 && Math.abs(r.width - r.height) < 4 &&
          parseFloat(s.borderRadius) > 12 && s.borderStyle !== 'none' &&
          !e.closest('button') && !e.closest('a')
        )
      })
      .map((e) => e.className)
  })
  revisar(falsos.length === 0,
    `${ruta}: ningun circulo de la cabecera finge ser boton${falsos.length ? ` — ${falsos[0]}` : ''}`)
}
// Y la campana, que si tiene a donde ir, va.
await cab.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })
await cab.waitForTimeout(300)
await cab.getByRole('button', { name: /aviso del domingo/ }).first().click()
await cab.waitForTimeout(400)
revisar((await cab.evaluate(() => location.hash)).includes('aviso'),
  `la campana lleva a la vista previa del aviso (${await cab.evaluate(() => location.hash)})`)
await cabCtx.close()

// ---------- El Dashboard: que cada tarjeta lleve a donde dice ----------
// Un dashboard que resume pero no despacha es un reporte. Lo que se mide es
// que cada tarjeta suelte al usuario en la seccion donde eso se arregla, y que
// la accion de todos los dias siga estando a un toque.
const dashCtx = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
const dash = vigilar(await dashCtx.newPage())
await dash.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })
await dash.waitForTimeout(400)

for (const titulo of [
  'Cómo va el reparto',
  'Por revisar',
  'Lo que viene',
  'Salir de deudas',
  'Fondos de reserva',
]) {
  revisar((await dash.locator('main, body').first().innerText()).includes(titulo),
    `el Dashboard trae la tarjeta "${titulo}"`)
}

for (const [enlace, destino] of [
  ['Ver todos los movimientos →', 'movimientos'],
  ['Ver todas tus deudas →', 'deudas'],
  ['Ver todas tus metas →', 'metas'],
  ['Ver el mes completo →', 'mes'],
]) {
  await dash.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })
  await dash.waitForTimeout(300)
  await dash.getByRole('button', { name: enlace }).first().click()
  await dash.waitForTimeout(300)
  const donde = await dash.evaluate(() => location.hash)
  revisar(donde.includes(destino), `"${enlace}" lleva a #/${destino} (${donde})`)
}

// La semana en curso lleva al presupuesto CON su semana abierta, no al arbol.
await dash.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })
await dash.waitForTimeout(300)
await dash.getByRole('button', { name: 'Ver la semana en el presupuesto →' }).first().click()
await dash.waitForTimeout(400)
revisar(/#\/mes\?semana=\d/.test(await dash.evaluate(() => location.hash)),
  `la semana en curso lleva al presupuesto con su semana (${await dash.evaluate(() => location.hash)})`)

await dash.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })
await dash.waitForTimeout(300)
// El chip de Anotar existe y esta apagado con los datos de ejemplo, que es la
// promesa de la demostracion: se ve, no se toca. Que ABRA su hoja se comprueba
// en `revisar-el-mes.mjs`, que si trae acciones.
revisar(await dash.getByRole('button', { name: /^Anotar/ }).first().isDisabled(),
  'con datos de ejemplo, Anotar se ve pero no se toca')
revisar(!(await dash.getByRole('button', { name: /^Pagué/ }).first().isDisabled()),
  'y Pagué si responde: lleva al detalle de la semana, donde vive la checklist')
await dashCtx.close()

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

await inicio.goto(`${BASE}/#/resumen`, { waitUntil: 'networkidle' })
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

// ---- Lo que falta, y la regla que explica las cifras ----------------------
// La fila de un fondo decia "$12,780 · de $18,000". La meta ya la dibuja la
// barra; lo que nadie calcula de un vistazo es cuanto falta, que es la pregunta
// que trae a alguien a esa pantalla.
const metasCtx = await navegador.newContext({ viewport: { width: 390, height: 844 } })
const mt = vigilar(await metasCtx.newPage())
await mt.goto(`${BASE}/#/metas`, { waitUntil: 'networkidle' })
await mt.waitForTimeout(400)
const textoMetas = await mt.locator('body').innerText()
revisar(/faltan \$/i.test(textoMetas), 'la fila de un fondo dice cuanto dinero falta')
// Y sigue diciendo cuanto TIEMPO falta: son las dos mitades de la misma
// pregunta, y quitar una para poner la otra no seria mejorar nada.
revisar(/faltan \d+ (mes|meses|año|años)/i.test(textoMetas),
  'sin dejar de decir cuanto tiempo falta')
await metasCtx.close()

// El arrastre semanal es la regla que hace que las cifras no cuadren a simple
// vista: si la semana 1 dejo $50 sin gastar, el "te queda" de la semana 2 es
// mayor que lo planeado para la 2. Sin explicacion eso se lee como un error.
const reglaCtx = await navegador.newContext({ viewport: { width: 390, height: 844 } })
const rg = vigilar(await reglaCtx.newPage())
await rg.goto(`${BASE}/#/mes?semana=2`, { waitUntil: 'networkidle' })
await rg.waitForTimeout(500)
revisar(/regla de arrastre/i.test(await rg.locator('body').innerText()),
  'el eje de Semanas explica el arrastre, que es de donde salen las cifras raras')
// El cuadro vacio junto a la renta. Tenia etiqueta para lectores de pantalla y
// nada visible; encabezado no se le puede poner porque comparte columna con la
// barra de las filas de semana.
revisar(/marca lo que ya pagaste/i.test(await rg.locator('body').innerText()),
  'y dice para que son las casillas, que no tienen etiqueta visible')
// La casilla existe de verdad y sigue diciendo lo suyo a quien no ve la
// pantalla: la explicacion se agrega, no reemplaza.
await rg.goto(`${BASE}/#/mes?semana=1`, { waitUntil: 'networkidle' })
await rg.waitForTimeout(500)
// Las dos formas: en los datos de ejemplo la renta ya esta pagada, asi que la
// casilla dice "Desmarcar Renta" y no "Marcar Renta como pagado".
revisar(await rg.getByRole('checkbox', { name: /^(Marcar|Desmarcar) / }).first().isVisible(),
  'sin quitarle la etiqueta que ya tenia para lectores de pantalla')
// En el arbol del mes no aplica: ahi no hay semanas de las que arrastrar.
await rg.goto(`${BASE}/#/mes`, { waitUntil: 'networkidle' })
await rg.waitForTimeout(500)
revisar(!/regla de arrastre/i.test(await rg.locator('body').innerText()),
  'y no la repite en el arbol del mes, donde no viene al caso')
await reglaCtx.close()

// ---- El boton flotante: en el telefono si, en el escritorio no -------------
// Es la puerta a las tres acciones de todos los dias. En escritorio no tiene
// sentido —el sidebar ya tiene los destinos a la vista y no hay pulgar que
// alcanzar—, asi que se queda en el marco de telefono. Y con datos de ejemplo
// las dos puertas que escriben se ven pero no se tocan, igual que los chips del
// Dashboard: ensenan que la accion existe sin prometer que va a guardar.
const fabCtx = await navegador.newContext({ viewport: { width: 390, height: 844 } })
const f = vigilar(await fabCtx.newPage())
await f.goto(`${BASE}/#/deudas`, { waitUntil: 'networkidle' })
await f.waitForTimeout(400)
const fab = f.getByRole('button', { name: 'Anotar o repartir' }).first()
revisar(await fab.isVisible(), 'el boton flotante esta en el telefono, en toda pantalla')
await fab.click()
await f.waitForTimeout(300)
revisar(await f.getByRole('button', { name: /Anotar un gasto/ }).first().isDisabled(),
  'con datos de ejemplo, anotar un gasto se ve pero no se toca')
revisar(await f.getByRole('button', { name: /Anotar un cheque/ }).first().isDisabled(),
  'y anotar un cheque tampoco')
revisar(!(await f.getByRole('button', { name: /Repartir la semana/ }).first().isDisabled()),
  'pero repartir si: no escribe nada, solo lleva a donde se reparte')
await f.screenshot({ path: `${SALIDA}/app-accion-rapida.png` })
await fabCtx.close()

const anchoCtx = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
const a = vigilar(await anchoCtx.newPage())
await a.goto(`${BASE}/#/deudas`, { waitUntil: 'networkidle' })
await a.waitForTimeout(400)
revisar(await a.getByRole('button', { name: 'Anotar o repartir' }).count() === 0,
  'y en escritorio no aparece: ahi la navegacion ya esta toda a la vista')
await anchoCtx.close()

await navegador.close()

revisar(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.join(' | ')}` : ''}`)

console.log(`\nCapturas en ${SALIDA}/`)
if (fallas.length) {
  console.log(`\n${fallas.length} revisión(es) fallaron.`)
  process.exit(1)
}
console.log('\nTodo en orden.')
