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
const categorias = [
  { id: 'c-diezmo', hogar_id: H, nombre: 'Diezmo y ofrenda', grupo: 'mayordomia', orden: 0, activa: true, es_fija: false, dia_vencimiento: null, deuda_id: null },
  { id: 'c-renta',  hogar_id: H, nombre: 'Renta',    grupo: 'fijo',     orden: 1, activa: true, es_fija: true,  dia_vencimiento: 1, deuda_id: null },
  { id: 'c-serv',   hogar_id: H, nombre: 'Servicios',grupo: 'fijo',     orden: 2, activa: true, es_fija: true,  dia_vencimiento: 5, deuda_id: null },
  { id: 'c-comida', hogar_id: H, nombre: 'Comida',   grupo: 'variable', orden: 3, activa: true, es_fija: false, dia_vencimiento: null, deuda_id: null },
]
let lineas = []            // el estado del "servidor"
const escrituras = []

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
const errores = []
p.on('pageerror', (e) => errores.push(String(e)))
p.on('console', (m) => m.type() === 'error' && !m.text().includes('status of 4') && errores.push(m.text()))

await p.route('**/*', async (r) => {
  const url = new URL(r.request().url()), m = r.request().method()
  const json = (b, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) })
  if (url.origin === SRV) {
    if (url.pathname === '/auth/v1/otp') return json({})
    if (url.pathname === '/auth/v1/verify') return json({ access_token:'x', token_type:'bearer', expires_in:3600, refresh_token:'y', user: USUARIO })
    if (url.pathname === '/auth/v1/user') return json(USUARIO)
    const t = url.pathname.replace('/rest/v1/', '')
    if (m === 'POST' || m === 'PATCH') {
      const cuerpo = JSON.parse(r.request().postData() ?? '[]')
      escrituras.push({ tabla: t, cuerpo })
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
    if (t === 'usuarios') return json([{ id: U, correo: USUARIO.email, nombre: null, zona_horaria: 'America/New_York', nivel: 'gratis', nivel_vence_en: null, frecuencia_pago: 'semanal', fecha_ancla: '2026-08-04', dias_pago: null, ingreso_esperado_cents: 171000, onboarding_terminado_en: '2026-08-06T00:00:00Z' }])
    if (t === 'periodos') return json(periodos)
    if (t === 'categorias') return json(categorias)
    if (t === 'lineas_presupuesto') return json(lineas)
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

ok(errores.length === 0, `sin errores en la consola${errores.length ? ': ' + errores.join(' | ') : ''}`)
await nav.close(); rmSync(dir, { recursive: true, force: true })
if (fallas.length) { console.log(`\n${fallas.length} fallaron.`); process.exit(1) }
console.log('\nTodo en orden.')
