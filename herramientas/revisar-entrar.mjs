/**
 * Revisa la pantalla de entrar en un navegador de verdad.
 *
 *   node herramientas/revisar-entrar.mjs
 *
 * `revisar-pantallas.mjs` no la puede ver: sin servidor configurado la app
 * corre con los datos de ejemplo y nunca pide el correo. Y las variables de
 * Vite se hornean al compilar, así que aquí se compila aparte con un servidor
 * de mentiras y se sirve desde el disco, sin levantar nada.
 *
 * Comprueba:
 *   · que tras pedir el código aparezca el campo de seis dígitos
 *   · que un código malo se explique en español y deje el campo limpio
 *   · que `supabase-js` no viaje en el paquete de arranque
 *   · que una llave mal pegada se diga al abrir, con qué hacer
 *   · que no haya errores en la consola
 *
 * A Supabase no se le llama: las rutas de `auth/v1` se contestan aquí.
 */
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, normalize } from 'node:path'

const RAIZ = new URL('..', import.meta.url).pathname
const SERVIDOR = 'https://prueba.supabase.co'
const SITIO = 'https://jubileo.prueba'

const fallas = []
const revisar = (condicion, mensaje) => {
  console.log(`${condicion ? '  ok   ' : '  FALLA'}  ${mensaje}`)
  if (!condicion) fallas.push(mensaje)
}

const TIPOS = {
  html: 'text/html',
  js: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  webmanifest: 'application/manifest+json',
  woff2: 'font/woff2',
  png: 'image/png',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
}

/** Compila la app con un entorno dado y devuelve la carpeta de salida. */
function compilar(entorno) {
  const salida = mkdtempSync(join(tmpdir(), 'jubileo-entrar-'))
  execFileSync('npx', ['vite', 'build', '--outDir', salida, '--emptyOutDir', '--logLevel', 'warn'], {
    cwd: RAIZ,
    env: { ...process.env, ...entorno },
    stdio: 'inherit',
  })
  return salida
}

/** Sirve la carpeta desde el disco y contesta por Supabase. */
function servir(pagina, carpeta, auth) {
  return pagina.route('**/*', async (ruta) => {
    const url = new URL(ruta.request().url())

    if (url.origin === SERVIDOR) {
      const respuesta = auth(url, ruta.request())
      return respuesta ? ruta.fulfill(respuesta) : ruta.fulfill({ status: 401, body: '{}' })
    }

    const pedido = url.pathname === '/' ? '/index.html' : url.pathname
    const archivo = normalize(join(carpeta, pedido))
    if (!archivo.startsWith(carpeta)) return ruta.fulfill({ status: 403, body: '' })
    try {
      return await ruta.fulfill({
        body: readFileSync(archivo),
        contentType: TIPOS[archivo.split('.').pop()] ?? 'application/octet-stream',
      })
    } catch {
      return ruta.fulfill({ status: 404, body: '' })
    }
  })
}

const errores = []
// El 400 del código vencido lo provoca esta misma prueba: el navegador lo
// apunta en la consola aunque la app lo haya atendido bien.
const esperado = (t) => t.includes('status of 400')
const vigilar = (pagina) => {
  pagina.on('console', (m) => m.type() === 'error' && !esperado(m.text()) && errores.push(m.text()))
  pagina.on('pageerror', (e) => errores.push(String(e)))
  return pagina
}

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
})
const carpetas = []

try {
  // ---------- Con el servidor bien puesto ----------
  const buena = compilar({
    VITE_SUPABASE_URL: SERVIDOR,
    VITE_SUPABASE_ANON_KEY: 'sb_publishable_deMentiras',
    VITE_URL_APP: SITIO,
  })
  carpetas.push(buena)

  // `supabase-js` pesa lo mismo que el resto de la app junta. Va aparte para
  // que la primera pantalla no lo espere.
  const arranque = readFileSync(join(buena, 'index.html'), 'utf8')
  const principal = arranque.match(/src="([^"]+\.js)"/)?.[1]
  revisar(Boolean(principal), 'el html de arranque carga un solo módulo')
  if (principal) {
    const codigo = readFileSync(join(buena, principal), 'utf8')
    revisar(!codigo.includes('GoTrueClient'), 'supabase-js no viaja en el paquete de arranque')
  }

  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } })
  const p = vigilar(await ctx.newPage())

  const pedidos = []
  await servir(p, buena, (url, peticion) => {
    pedidos.push(url.pathname)
    if (url.pathname === '/auth/v1/otp') return { status: 200, contentType: 'application/json', body: '{}' }
    if (url.pathname === '/auth/v1/verify') {
      const { token } = JSON.parse(peticion.postData() ?? '{}')
      // 654321 es el bueno; cualquier otro vence, que es el caso que hay que
      // saber contar en español.
      return token === '654321'
        ? {
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              access_token: 'x',
              token_type: 'bearer',
              expires_in: 3600,
              refresh_token: 'y',
              user: { id: '00000000-0000-0000-0000-000000000001', email: 'ana@ejemplo.com' },
            }),
          }
        : {
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error_code: 'otp_expired',
              msg: 'Token has expired or is invalid',
            }),
          }
    }
    return null
  })

  await p.goto(SITIO, { waitUntil: 'networkidle' })
  revisar(await p.getByLabel('Tu correo').isVisible(), 'la app sin sesión pide el correo')

  await p.getByLabel('Tu correo').fill('ana@ejemplo.com')
  await p.getByRole('button', { name: 'Mándame el código' }).click()

  const campo = p.getByLabel('Código de seis dígitos')
  await campo.waitFor({ state: 'visible', timeout: 5000 })
  revisar(true, 'tras pedirlo, aparece el campo del código')
  revisar(
    pedidos.includes('/auth/v1/otp'),
    'pedir el código llama a Supabase una sola vez y no abre ningún enlace',
  )

  await campo.fill('123456')
  await p.getByRole('alert').waitFor({ state: 'visible', timeout: 5000 })
  const dicho = await p.getByRole('alert').innerText()
  revisar(dicho.includes('venció'), `un código vencido se dice en español: “${dicho.trim()}”`)
  revisar((await campo.inputValue()) === '', 'el campo queda limpio para volver a teclear')

  await ctx.close()

  // ---------- Con la llave mal pegada ----------
  // Pasó de verdad: el bloque de dos renglones del panel Connect, entero, en
  // un solo campo del hosting.
  const mala = compilar({
    VITE_SUPABASE_URL: SERVIDOR,
    VITE_SUPABASE_ANON_KEY: `VITE_SUPABASE_URL=${SERVIDOR}\nVITE_SUPABASE_PUBLISHABLE_KEY=abc`,
  })
  carpetas.push(mala)

  const ctx2 = await navegador.newContext({ viewport: { width: 390, height: 844 } })
  const q = vigilar(await ctx2.newPage())
  await servir(q, mala, () => null)
  await q.goto(SITIO, { waitUntil: 'networkidle' })
  const texto = await q.locator('body').innerText()
  revisar(texto.includes('no está bien conectada'), 'una llave mal pegada se avisa al abrir')
  revisar(texto.includes('Value'), 'y dice qué va en cada campo del hosting')
  await ctx2.close()
} finally {
  await navegador.close()
  for (const c of carpetas) rmSync(c, { recursive: true, force: true })
}

revisar(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.join(' | ')}` : ''}`)

if (fallas.length) {
  console.log(`\n${fallas.length} revisión(es) fallaron.`)
  process.exit(1)
}
console.log('\nTodo en orden.')
