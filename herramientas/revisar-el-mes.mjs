/**
 * Revisa repartir el mes en un navegador de verdad.
 *
 *   node herramientas/revisar-el-mes.mjs
 *
 * Es el camino que toca dinero, así que se recorre entero contra un Supabase
 * de mentiras que sí guarda lo que le mandan: entrar, abrir El mes, ponerle
 * $600 a un sobre, y comprobar que se guardó en centavos enteros, que el
 * reparto salió solo y que las asignaciones suman el monto al centavo — la
 * invariante de la sección 6 del SPEC, vista desde el navegador.
 *
 * Se compila aparte porque las variables de Vite se hornean al compilar, y se
 * sirve desde el disco para no levantar nada.
 */
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, normalize } from 'node:path'

const RAIZ = new URL('..', import.meta.url).pathname
const SRV = 'https://prueba.supabase.co', SITIO = 'https://jubileo.prueba'
const T = { html:'text/html', js:'text/javascript', css:'text/css', json:'application/json', webmanifest:'application/manifest+json', woff2:'font/woff2', png:'image/png', svg:'image/svg+xml' }
const fallas = []
/** Espera a que algo se cumpla, en vez de a que pase un plazo inventado. */
const esperarA = async (condicion, ms = 8000) => {
  const hasta = ms / 100
  for (let i = 0; i < hasta; i++) {
    if (await condicion()) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}
const ok = (c, m) => { console.log(`${c ? '  ok   ' : '  FALLA'}  ${m}`); if (!c) fallas.push(m) }

const dir = mkdtempSync(join(tmpdir(), 'jub-mes-'))
execFileSync('npx', ['vite','build','--outDir',dir,'--emptyOutDir','--logLevel','error'],
  { cwd: RAIZ, env: { ...process.env, VITE_SUPABASE_URL: SRV, VITE_SUPABASE_ANON_KEY: 'x' }, stdio: 'inherit' })

const U = '00000000-0000-0000-0000-000000000001', MES = 'm-1', H = 'h-1'
const USUARIO = { id: U, email: 'ivan@jubileofinanciero.com', aud: 'authenticated', role: 'authenticated' }
// Cuatro cheques semanales de agosto, como los de verdad.
const periodos = [1,2,3,4].map((n) => ({
  id: `p${n}`, mes_id: MES, usuario_id: U, numero: n,
  fecha_inicio: `2026-08-${String(4+(n-1)*7).padStart(2,'0')}`,
  fecha_fin: `2026-08-${String(10+(n-1)*7).padStart(2,'0')}`,
  fecha_pago: `2026-08-${String(4+(n-1)*7).padStart(2,'0')}`,
  ingreso_esperado_cents: 171000, ingreso_real_cents: null, es_extra: false, estado: n === 1 ? 'abierto' : 'futuro',
}))
let categorias = [
  { id: 'c-diezmo', hogar_id: H, nombre: 'Diezmo y ofrenda', grupo: 'mayordomia', orden: 0, activa: true, es_fija: false, dia_vencimiento: null, deuda_id: null },
  { id: 'c-renta',  hogar_id: H, nombre: 'Renta',    grupo: 'fijo',     orden: 1, activa: true, es_fija: true,  dia_vencimiento: 1, deuda_id: null },
  { id: 'c-serv',   hogar_id: H, nombre: 'Servicios',grupo: 'fijo',     orden: 2, activa: true, es_fija: true,  dia_vencimiento: 5, deuda_id: null },
  { id: 'c-comida', hogar_id: H, nombre: 'Comida',   grupo: 'variable', orden: 3, activa: true, es_fija: false, dia_vencimiento: null, deuda_id: null },
]
let lineas = []            // el estado del "servidor"
let asignaciones = []
let transacciones = []
let nivelUsuario = 'gratis'
let venceEn = null
let onboardingListo = '2026-08-06T00:00:00Z'
let deudas = []
let fondos = []
const escrituras = []

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
const errores = []
p.on('pageerror', (e) => errores.push(String(e)))
p.on('console', (m) => m.type() === 'error' && !m.text().includes('status of 4') && errores.push(m.text()))

await p.route('**/*', async (r) => {
  const url = new URL(r.request().url()), m = r.request().method()
  // `no-store` a propósito: sin él Chromium se guarda las respuestas y una
  // prueba que cambia el estado del servidor sigue viendo el estado viejo.
  const json = (b, s = 200) =>
    r.fulfill({
      status: s,
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify(b),
    })
  if (url.origin === SRV) {
    if (url.pathname === '/auth/v1/otp') return json({})
    if (url.pathname === '/auth/v1/verify') return json({ access_token:'x', token_type:'bearer', expires_in:3600, refresh_token:'y', user: USUARIO })
    if (url.pathname === '/auth/v1/user') return json(USUARIO)
    const t = url.pathname.replace('/rest/v1/', '')
    if (m === 'DELETE') {
      if (t === 'deudas' || t === 'fondos_reserva') {
        const id = (url.searchParams.get('id') ?? '').replace('eq.', '')
        if (t === 'deudas') deudas = deudas.filter((x) => x.id !== id)
        else fondos = fondos.filter((x) => x.id !== id)
        escrituras.push({ tabla: t, borrado: id })
        return json([])
      }
      if (t === 'lineas_presupuesto') {
        const cat = (url.searchParams.get('categoria_id') ?? '').replace('eq.', '')
        const fuera = lineas.filter((l) => l.categoria_id === cat).map((l) => l.id)
        lineas = lineas.filter((l) => l.categoria_id !== cat)
        // Las asignaciones se van en cascada tras su línea, como en el esquema.
        asignaciones = asignaciones.filter((a) => !fuera.includes(a.linea_presupuesto_id))
        escrituras.push({ tabla: t, borrado: cat })
        return json([])
      }
      const id = (url.searchParams.get('id') ?? '').replace('eq.', '')
      transacciones = transacciones.filter((x) => x.id !== id)
      escrituras.push({ tabla: t, borrado: id })
      return json([])
    }
    if (m === 'POST' || m === 'PATCH') {
      const cuerpo = JSON.parse(r.request().postData() ?? '[]')
      escrituras.push({ tabla: t, cuerpo })
      if (t === 'usuarios') {
        const f = [cuerpo].flat()[0]
        if ('onboarding_terminado_en' in f) onboardingListo = f.onboarding_terminado_en
        return json([])
      }
      if (t === 'preferencias_aviso') return json([])
      if (t === 'asignaciones') {
        for (const a of [cuerpo].flat()) {
          const i = asignaciones.findIndex((x) => x.linea_presupuesto_id === a.linea_presupuesto_id && x.periodo_id === a.periodo_id)
          i === -1 ? asignaciones.push(a) : (asignaciones[i] = a)
        }
      }
      if (t === 'transacciones') {
        const f = [cuerpo].flat()[0]
        const id = `t-${transacciones.length + 1}`
        transacciones.push({ ...f, id, estado: f.estado ?? 'pendiente' })
        return json([{ id }])
      }
      if (t === 'deudas' || t === 'fondos_reserva') {
        const tabla = t === 'deudas' ? deudas : fondos
        const f = [cuerpo].flat()[0]
        if (m === 'POST') {
          const id = `${t}-${tabla.length}`
          // Postgres devuelve todas las columnas, con sus valores por omisión.
          // Sin ellas el mock miente: `mapeo` filtra con `pagada_en === null` y
          // un `undefined` haría desaparecer la deuda sin que se vea por qué.
          const porOmision =
            t === 'deudas'
              ? { orden: 0, es_enfoque: false, pagada_en: null, tasa_interes: null }
              : { fecha_objetivo: null, acumulado_cents: 0 }
          tabla.push({ id, ...porOmision, ...f })
          escrituras.push({ tabla: t, cuerpo: f })
          return json([{ id }])
        }
        const filtro = url.searchParams.get('id')?.replace('eq.', '')
        for (const fila of tabla) {
          if (filtro ? fila.id === filtro : true) Object.assign(fila, f)
        }
        escrituras.push({ tabla: t, cuerpo: f, filtro })
        return json([])
      }
      if (t === 'periodos' && m === 'PATCH') {
        const f = [cuerpo].flat()[0]
        const id = (url.searchParams.get('id') ?? '').replace('eq.', '')
        const i = periodos.findIndex((x) => x.id === id)
        if (i !== -1) periodos[i] = { ...periodos[i], ...f }
        return json([])
      }
      if (t === 'categorias') {
        const f = [cuerpo].flat()[0]
        if (m === 'POST') {
          if (categorias.some((c) => c.nombre === f.nombre)) {
            return json({ code: '23505', message: 'duplicate key' }, 409)
          }
          const id = `c-nueva-${categorias.length}`
          categorias.push({ id, activa: true, deuda_id: null, ...f })
          return json([{ id }])
        }
        const id = (url.searchParams.get('id') ?? '').replace('eq.', '')
        const i = categorias.findIndex((c) => c.id === id)
        if (i !== -1) categorias[i] = { ...categorias[i], ...f }
        return json([])
      }
      if (t === 'lineas_presupuesto') {
        for (const f of [cuerpo].flat()) {
          const i = lineas.findIndex((l) => l.categoria_id === f.categoria_id)
          const fila = { id: `l-${f.categoria_id}`, mes_id: MES, categoria_id: f.categoria_id, monto_mensual_cents: f.monto_mensual_cents }
          i === -1 ? lineas.push(fila) : (lineas[i] = fila)
        }
      }
      return json([])
    }
    if (t === 'meses')  return json([{ id: MES, hogar_id: H, anio: 2026, mes: 8, estado: 'activo', cerrado_en: null }])
    if (t === 'usuarios') return json([{ id: U, correo: USUARIO.email, nombre: null, zona_horaria: 'America/New_York', nivel: nivelUsuario, nivel_vence_en: venceEn, frecuencia_pago: 'semanal', fecha_ancla: '2026-08-04', dias_pago: null, ingreso_esperado_cents: 171000, onboarding_terminado_en: onboardingListo }])
    if (t === 'periodos') return json(periodos)
    if (t === 'categorias') return json(categorias.filter((c) => c.activa !== false))
    if (t === 'lineas_presupuesto') return json(lineas)
    if (t === 'asignaciones') return json(asignaciones.map((a, i) => ({ id: `a${i}`, ...a })))
    if (t === 'transacciones') return json(transacciones)
    if (t === 'deudas') return json(deudas)
    if (t === 'fondos_reserva') return json(fondos)
    return json([])
  }
  const f = normalize(join(dir, url.pathname === '/' ? '/index.html' : url.pathname))
  try { return await r.fulfill({ body: readFileSync(f), contentType: T[f.split('.').pop()] ?? 'application/octet-stream' }) }
  catch { return r.fulfill({ status: 404, body: '' }) }
})

await p.goto(SITIO, { waitUntil: 'networkidle' })
await p.getByLabel('Tu correo').fill('ivan@jubileofinanciero.com')
await p.getByRole('button', { name: 'Mándame el código' }).click()
await p.getByLabel('Código del correo').fill('654321')
await p.waitForTimeout(1500)

await p.goto(SITIO + '/#/mes', { waitUntil: 'networkidle' })
await p.waitForTimeout(800)
ok(await p.getByText('Gastos variables').first().isVisible(), 'El mes enseña los sobres variables, que es donde se reparte el resto')

const boton = p.getByRole('button', { name: 'Poner el monto de Comida' }).first()
ok(await boton.isVisible(), 'cada categoría se puede tocar para ponerle monto')
await boton.click()
await p.getByRole('dialog').first().waitFor({ state: 'visible' })
await p.screenshot({ path: RAIZ + 'capturas/app-poner-monto-vacio.png' })

await p.getByLabel('Monto mensual de Comida').first().fill('600')
await p.waitForTimeout(300)
const previa = await p.getByRole('dialog').first().innerText()
ok(previa.includes('$150.00'), `el reparto se ve mientras escribes: ${previa.match(/Se reparte en[^.]*/)?.[0] ?? '—'}`)
await p.screenshot({ path: RAIZ + 'capturas/app-poner-monto.png' })

await p.getByRole('button', { name: 'Guardar' }).first().click()
await p.waitForTimeout(1500)

const guardado = escrituras.find((e) => e.tabla === 'lineas_presupuesto')
ok(guardado?.cuerpo?.monto_mensual_cents === 60000 || guardado?.cuerpo?.[0]?.monto_mensual_cents === 60000,
   `se guarda en centavos enteros: ${JSON.stringify(guardado?.cuerpo)}`)
ok(escrituras.some((e) => e.tabla === 'asignaciones'), 'y se reparte solo entre los cheques, sin pedirlo')

const asign = escrituras.find((e) => e.tabla === 'asignaciones')
const suma = [asign?.cuerpo].flat().filter(Boolean).reduce((s, a) => s + a.monto_cents, 0)
ok(suma === 60000, `las asignaciones suman el monto mensual al centavo: ${suma}`)

await p.waitForTimeout(500)
const pantalla = await p.locator('body').innerText()
ok(pantalla.includes('$600'), 'y la pantalla ya enseña el monto nuevo')
await p.screenshot({ path: RAIZ + 'capturas/app-mes-repartido.png' })

// ---- Anotar un gasto ------------------------------------------------------
await p.goto(SITIO + '/#/semana', { waitUntil: 'networkidle' })
await p.waitForTimeout(700)

const antes = await p.locator('body').innerText()
await p.getByRole('button', { name: 'Anotar' }).first().click()
await p.getByRole('dialog').first().waitFor({ state: 'visible' })
// `innerText` devuelve lo que se ve, y ese rótulo va en versalitas por CSS.
const hoja = (await p.getByRole('dialog').first().innerText()).toLowerCase()
ok(hoja.includes('¿de qué sobre sale?'), 'anotar pregunta de qué sobre sale: nunca lo adivina')

const anotarBtn = p.getByRole('button', { name: 'Anotar', exact: true }).last()
await p.getByLabel('Cuánto gastaste').first().fill('25.50')
ok(await anotarBtn.isDisabled(), 'sin escoger sobre no deja anotar')

await p.getByRole('button', { name: /^Comida/ }).first().click()
await p.getByLabel('En qué gastaste').first().fill('Supermercado')
await p.screenshot({ path: RAIZ + 'capturas/app-anotar.png' })
await anotarBtn.click()
await p.waitForTimeout(1200)

const gasto = transacciones.at(-1)
ok(gasto?.monto_cents === 2550, `el gasto se guarda en centavos enteros: ${gasto?.monto_cents}`)
ok(gasto?.tipo === 'gasto' && gasto?.estado === 'asignada' && gasto?.categoria_id === 'c-comida',
   'con su categoría, ya asignado y sin signo negativo')
ok(gasto?.periodo_id === 'p1', 'colgado del cheque en curso, no del mes')

// Los sobres enseñan cifras redondeadas: $25.50 gastados se ven como $26.
const despues = await p.locator('body').innerText()
ok(antes !== despues && /\$26\s*de\s*\$150/.test(despues), 'y el sobre ya enseña lo gastado')
await p.screenshot({ path: RAIZ + 'capturas/app-semana-con-gasto.png' })

// ---- Marcar y desmarcar un pago -------------------------------------------
const casilla = p.getByRole('checkbox').first()
await casilla.click()
await p.waitForTimeout(1200)
const pago = transacciones.at(-1)
ok(pago?.categoria_id === 'c-serv' && pago?.estado === 'asignada',
   'marcar un pago anota el gasto del fijo')
ok(await p.getByRole('checkbox').first().getAttribute('aria-checked') === 'true',
   'y la casilla queda marcada al volver del servidor')

await p.getByRole('checkbox').first().click()
await p.waitForTimeout(1200)
ok(escrituras.some((e) => e.borrado), 'desmarcarlo lo borra en vez de dejar basura')
ok(await p.getByRole('checkbox').first().getAttribute('aria-checked') === 'false',
   'y la casilla se apaga')

// ---- Crear, renombrar y quitar --------------------------------------------
await p.goto(SITIO + '/#/mes', { waitUntil: 'networkidle' })
await p.waitForTimeout(700)

await p.getByRole('button', { name: 'Agregar un sobre' }).first().click()
await p.getByRole('dialog').first().waitFor({ state: 'visible' })
await p.getByLabel('Nombre de la categoría').first().fill('Comida')
await p.getByRole('button', { name: 'Crear' }).first().click()
await p.waitForTimeout(900)
ok((await p.getByRole('alert').first().innerText()).includes('Ya tienes una categoría'),
   'un nombre repetido se explica en español, no con el error de Postgres')

await p.getByLabel('Nombre de la categoría').first().fill('Ropa')
await p.getByRole('button', { name: 'Crear' }).first().click()
await p.waitForTimeout(1200)
ok(categorias.some((c) => c.nombre === 'Ropa' && c.grupo === 'variable'), 'se crea el sobre nuevo')
ok((await p.locator('body').innerText()).includes('Ropa'), 'y aparece en la pantalla')

// Un fijo sin día no debe poderse crear: sin él el aviso pierde la mitad.
await p.getByRole('button', { name: 'Agregar un gasto fijo' }).first().click()
await p.getByLabel('Nombre de la categoría').first().fill('Seguro')
ok(await p.getByRole('button', { name: 'Crear' }).first().isDisabled(),
   'un gasto fijo sin día de vencimiento no se puede crear')
await p.getByLabel('¿Qué día del mes se vence?').first().fill('18')
await p.screenshot({ path: RAIZ + 'capturas/app-nueva-categoria.png' })
await p.getByRole('button', { name: 'Crear' }).first().click()
await p.waitForTimeout(1200)
const seguro = categorias.find((c) => c.nombre === 'Seguro')
ok(seguro?.dia_vencimiento === 18 && seguro?.es_fija === true, 'con su día guardado y marcado como fijo')

// Renombrar
await p.getByRole('button', { name: 'Poner el monto de Ropa' }).first().click()
await p.getByRole('button', { name: 'Renombrar' }).first().click()
await p.getByLabel('Nombre de Ropa').first().fill('Ropa y calzado')
await p.getByRole('button', { name: 'Guardar el nombre' }).first().click()
await p.waitForTimeout(1200)
ok(categorias.some((c) => c.nombre === 'Ropa y calzado'), 'se renombra')

// Quitar: su linea se va, y con ella el dinero que contaba en "sale".
const saleAntes = lineas.reduce((s2, l) => s2 + l.monto_mensual_cents, 0)
await p.getByRole('button', { name: 'Poner el monto de Comida' }).first().click()
await p.getByRole('button', { name: 'Quitar del mes' }).first().click()
const aviso = await p.getByRole('dialog').first().innerText()
ok(aviso.includes('$600') && aviso.includes('sin repartir'), `avisa qué pasa con el dinero: ${aviso.match(/Se quita[^.]*\./)?.[0] ?? '—'}`)
await p.getByRole('button', { name: 'Quitar del mes' }).last().click()
await p.waitForTimeout(1400)
ok(!lineas.some((l) => l.categoria_id === 'c-comida'), 'quitar borra su línea del mes')
ok(!asignaciones.some((a) => a.linea_presupuesto_id === 'l-c-comida'), 'y sus asignaciones se van en cascada')
ok(lineas.reduce((s2, l) => s2 + l.monto_mensual_cents, 0) === saleAntes - 60000,
   'el dinero deja de contar en lo que sale, en vez de quedarse invisible')
ok(!(await p.locator('body').innerText()).includes('Comida'), 'y desaparece de la pantalla')

// ---- Cerrar la semana -----------------------------------------------------
await p.goto(SITIO + '/#/semana', { waitUntil: 'networkidle' })
await p.waitForTimeout(700)
await p.getByRole('button', { name: 'Semana' }).first().click()
await p.getByRole('dialog').first().waitFor({ state: 'visible' })
ok((await p.getByRole('dialog').first().innerText()).includes('¿Entró lo que esperabas?'),
   'cerrar la semana arranca preguntando qué entró')

// Viene contestada con lo que la app ya sabe: si cuadra, es dar siguiente.
ok((await p.getByLabel('Cuánto entró de verdad').first().inputValue()) === '1710.00',
   'con el ingreso esperado ya puesto')
await p.getByLabel('Cuánto entró de verdad').first().fill('1650')
await p.getByRole('button', { name: 'Siguiente' }).first().click()

const gastadoAntes = transacciones.filter((t) => t.categoria_id === 'c-ropa-o-comida').length
ok((await p.getByRole('dialog').first().innerText()).includes('¿Cuánto gastaste en los sobres?'),
   'la segunda pregunta son los sobres')
await p.screenshot({ path: RAIZ + 'capturas/app-cerrar-semana.png' })
await p.getByRole('button', { name: 'Siguiente' }).first().click()

ok((await p.getByRole('dialog').first().innerText()).includes('¿Pagaste lo que faltaba?'),
   'y la tercera los pagos pendientes')
const cuantasAntes = transacciones.length
await p.getByRole('button', { name: 'Cerrar la semana' }).first().click()
await p.waitForTimeout(1500)

ok(periodos[0].ingreso_real_cents === 165000, 'guarda lo que entró de verdad, no lo esperado')
ok(periodos[0].estado === 'cerrado', 'y deja el cheque cerrado')
ok(transacciones.length === cuantasAntes, 'sin ajustes que inventar, no anota nada de más')
void gastadoAntes

// ---- Deudas ---------------------------------------------------------------
await p.goto(SITIO + '/#/deudas', { waitUntil: 'networkidle' })
await p.waitForTimeout(700)
await p.getByRole('button', { name: 'Agregar una deuda' }).first().click()
await p.getByRole('dialog').first().waitFor({ state: 'visible' })
await p.getByLabel('Nombre de la deuda').first().fill('Capital One')
await p.getByLabel('Cuánto debes').first().fill('1240')
ok(await p.getByRole('button', { name: 'Agregar', exact: true }).first().isDisabled(),
   'una deuda sin pago mínimo no se puede agregar: el simulador lo necesita')
await p.getByLabel('Pago mínimo al mes').first().fill('35')
await p.getByLabel('Tasa de interés anual').first().fill('24.9')
await p.screenshot({ path: RAIZ + 'capturas/app-nueva-deuda.png' })
await p.getByRole('button', { name: 'Agregar', exact: true }).first().click()
await p.waitForTimeout(1400)

const d = deudas[0]
ok(d?.saldo_cents === 124000 && d?.pago_minimo_cents === 3500, `se guarda en centavos: ${d?.saldo_cents}/${d?.pago_minimo_cents}`)
ok(d?.saldo_inicial_cents === d?.saldo_cents,
   'y arranca con saldo inicial igual al saldo: la barra mide desde hoy')
const conDeuda = await p.locator('body').innerText()
ok(conDeuda.includes('Capital One'), 'la deuda aparece en la pantalla')
ok(/TU FECHA DE LIBERTAD/i.test(conDeuda) && !conDeuda.includes('Sin fecha todavía'),
   `la fecha de libertad ya sale de una deuda de verdad: ${conDeuda.match(/LIBERTAD\s*\n?\s*([^\n]+)/i)?.[1] ?? '—'}`)

// Bajar el saldo y ponerle el enfoque.
await p.getByRole('button', { name: 'Editar Capital One' }).first().click()
await p.getByRole('button', { name: 'Atacar esta primero' }).first().click()
await p.waitForTimeout(1300)
ok(deudas[0].es_enfoque === true, 'el enfoque se puede poner desde la pantalla')

// ---- Fondos ---------------------------------------------------------------
await p.goto(SITIO + '/#/metas', { waitUntil: 'networkidle' })
await p.waitForTimeout(700)
await p.getByRole('button', { name: 'Agregar un fondo' }).first().click()
await p.getByRole('dialog').first().waitFor({ state: 'visible' })
await p.getByLabel('Nombre del fondo').first().fill('Llantas')
await p.getByLabel('Cuánto necesitas juntar').first().fill('600')
await p.getByLabel('Cuánto llevas juntado').first().fill('120')
await p.getByLabel('Para cuándo lo necesitas').first().fill('2026-12-01')
await p.getByRole('button', { name: 'Agregar', exact: true }).first().click()
await p.waitForTimeout(1400)

const f2 = fondos[0]
ok(f2?.meta_cents === 60000 && f2?.acumulado_cents === 12000, 'el fondo se guarda en centavos')
ok(f2?.fecha_objetivo === '2026-12-01', 'con su fecha objetivo')
const conFondo = await p.locator('body').innerText()
ok(conFondo.includes('Llantas') && conFondo.includes('20%'),
   'y la barra ya enseña el avance calculado, no uno inventado')
await p.screenshot({ path: RAIZ + 'capturas/app-metas.png' })

// ---- El onboarding a medias -----------------------------------------------
// Una cuenta que no terminó los 6 pasos vuelve a donde se quedó, no cae a una
// app vacía que parecería rota.
onboardingListo = null
await p.goto(SITIO, { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
// `innerText` devuelve lo que se ve, y el rótulo del paso va en versalitas.
const paso3 = (await p.locator('body').innerText()).toLowerCase()
ok(paso3.includes('paso 3 de 6') && paso3.includes('tus gastos fijos'),
   'una cuenta a medias vuelve al paso donde se quedó')

// Agregar algo recarga el presupuesto. Si al recargar la app cayera a la
// pantalla de espera, desmontaría el onboarding y lo regresaría al paso 1.
await p.getByRole('button', { name: 'Agregar un gasto fijo' }).first().click()
await p.getByLabel('Nombre de la categoría').first().fill('Internet')
await p.getByLabel('¿Qué día del mes se vence?').first().fill('12')
await p.getByRole('button', { name: 'Crear' }).first().click()
await esperarA(async () => (await p.locator('body').innerText()).includes('Internet'))
const trasAgregar = (await p.locator('body').innerText()).toLowerCase()
ok(trasAgregar.includes('paso 3 de 6') && trasAgregar.includes('internet'),
   'agregar algo no regresa al paso 1: lo recargado no desmonta la pantalla')

await p.getByRole('button', { name: 'Siguiente' }).first().click()
await p.waitForTimeout(300)
ok((await p.locator('body').innerText()).includes('Tus deudas'), 'paso 4: las deudas')
await p.getByRole('button', { name: 'Siguiente' }).first().click()
await p.waitForTimeout(300)
ok((await p.locator('body').innerText()).includes('Tu aviso'), 'paso 5: el aviso')

await p.getByLabel('A qué hora quieres el aviso').first().fill('07:30')
await p.getByRole('button', { name: 'Siguiente' }).first().click()
await p.waitForTimeout(1200)
const pref = escrituras.find((e) => e.tabla === 'preferencias_aviso')
ok(pref?.cuerpo?.hora_local === '07:30' && pref?.cuerpo?.activo === true,
   `la hora del aviso se guarda al salir del paso, no al final: ${pref?.cuerpo?.hora_local}`)
const zona = escrituras.filter((e) => e.tabla === 'usuarios').find((e) => e.cuerpo?.zona_horaria)
ok(Boolean(zona), 'y con ella la zona horaria del navegador, que es quien la sabe')

const paso6 = (await p.locator('body').innerText()).toLowerCase()
ok(paso6.includes('paso 6 de 6') && paso6.includes('pantalla de inicio'), 'paso 6: instalarla')
await p.screenshot({ path: RAIZ + 'capturas/app-onboarding.png' })
await p.getByRole('button', { name: 'Ver mi primera semana' }).first().click()
ok(await esperarA(() => onboardingListo !== null),
   'al terminar se marca el onboarding, y solo entonces')
ok(
  await esperarA(async () =>
    (await p.locator('body').innerText()).toLowerCase().includes('te queda esta semana'),
  ),
  'y cae en su primera semana armada, nunca en una pantalla vacía',
)

// ---- Membresía ------------------------------------------------------------
// El botón de pagar tiene que llegar a nuestro servidor con el token de la
// sesión, no con un usuario_id que el navegador podría cambiar a mano.
let pedidoDePago = null
await p.route('**/api/stripe/**', async (r) => {
  pedidoDePago = {
    camino: new URL(r.request().url()).pathname,
    auth: r.request().headers()['authorization'] ?? '',
    cuerpo: JSON.parse(r.request().postData() ?? '{}'),
  }
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: SITIO + '/#/ajustes?pago=simulado' }) })
})

await p.setViewportSize({ width: 1280, height: 900 })
await p.goto(SITIO + '/#/ajustes', { waitUntil: 'networkidle' })
await p.waitForTimeout(700)
const ajustes = await p.locator('body').innerText()
ok(ajustes.includes('Lo que ya tienes') && ajustes.includes('cheque a cheque'),
   'la membresía se ofrece por lo que agrega, no por lo que retiene')
ok(/\$8 al mes/.test(ajustes) && /\$79 al año/.test(ajustes), 'con los dos precios del SPEC')
ok(ajustes.includes('ahorras $17'), 'y el ahorro del anual calculado, no escrito a mano')
await p.screenshot({ path: RAIZ + 'capturas/app-membresia.png' })

await p.getByRole('button', { name: /^\$79 al año/ }).first().click()
await p.getByRole('button', { name: /Hacerme Premium/ }).first().click()
await esperarA(() => pedidoDePago !== null)
ok(pedidoDePago?.camino === '/api/stripe/checkout', 'pagar pasa por nuestro servidor, no por Stripe directo')
await esperarA(async () => (await p.evaluate(() => location.hash)).includes('pago='))
ok(
  (await p.locator('body').innerText()).includes('Lo que ya tienes'),
  'al volver de Stripe con ?pago= en el fragmento, se sigue cayendo en Ajustes',
)
ok(pedidoDePago?.auth?.startsWith('Bearer '), 'con el token de la sesión, que el servidor verifica')
ok(pedidoDePago?.cuerpo?.plan === 'anual', 'y el plan que se escogió')

// Ya premium: la pantalla cambia y ofrece administrar, no volver a pagar.
nivelUsuario = 'premium'
venceEn = '2026-09-06T00:00:00Z'
pedidoDePago = null
// `goto` a la misma dirección cambiando solo el fragmento no recarga nada.
await p.reload({ waitUntil: 'networkidle' })
await p.waitForTimeout(700)
const yaPremium = await p.locator('body').innerText()
ok(yaPremium.includes('6 de septiembre de 2026'), 'un premium ve hasta cuándo pagó, en español')
ok(!yaPremium.includes('Hacerme Premium'), 'y ya no se le ofrece pagar otra vez')
await p.getByRole('button', { name: /Administrar mi membresía/ }).first().click()
await esperarA(() => pedidoDePago !== null)
ok(pedidoDePago?.camino === '/api/stripe/portal', 'administrar abre el portal de Stripe')

// Un premium vencido baja a gratis al leer, aunque la base siga diciendo otra cosa.
venceEn = '2026-07-01T00:00:00Z'
await p.reload({ waitUntil: 'networkidle' })
await p.waitForTimeout(700)
ok((await p.locator('body').innerText()).includes('Hacerme Premium'),
   'un premium vencido baja a gratis al leer, sin que nadie borre nada')
await p.setViewportSize({ width: 390, height: 844 })

ok(errores.length === 0, `sin errores en la consola${errores.length ? ': ' + errores.join(' | ') : ''}`)
await nav.close(); rmSync(dir, { recursive: true, force: true })
if (fallas.length) { console.log(`\n${fallas.length} fallaron.`); process.exit(1) }
console.log('\nTodo en orden.')
