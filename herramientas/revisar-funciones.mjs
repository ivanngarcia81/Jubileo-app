/**
 * Revisa que las funciones de servidor **carguen** en Node.
 *
 *   node herramientas/revisar-funciones.mjs
 *
 * Nada más las carga. Suena a poco y es justo lo que faltaba: `api/stripe.ts` y
 * `api/avisos.ts` se desplegaron reventando al primer `import`, con
 * ERR_UNSUPPORTED_DIR_IMPORT, y las tres redes que tiene el repositorio dejaron
 * pasar el fallo porque ninguna mira lo que mira Node:
 *
 *   · `tsc` no incluía `api/` en ningún proyecto — no los leía siquiera.
 *   · Las pruebas corren en Vitest, que resuelve como Vite: los directorios y
 *     los imports sin extensión le funcionan.
 *   · La revisión de navegador habla con un Supabase de mentiras y nunca toca
 *     una función de verdad.
 *
 * Aquí se compila `api/` igual que lo hace Vercel —fichero por fichero, sin
 * empaquetar, conservando la forma de las carpetas— y se importan las dos.
 * Si a Node le falta una extensión o le sobra un directorio, revienta aquí y
 * no en producción.
 */
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const RAIZ = new URL('..', import.meta.url).pathname
// Dentro del repositorio a proposito: Node busca `node_modules` hacia arriba, y
// desde /tmp no encontraria ni `stripe` ni `@supabase/supabase-js`.
const SALIDA = join(RAIZ, '.tmp-funciones')

const fallas = []
const ok = (c, m) => {
  console.log(`${c ? '  ok   ' : '  FALLA'}  ${m}`)
  if (!c) fallas.push(m)
}

rmSync(SALIDA, { recursive: true, force: true })
try {
  execFileSync(
    'npx',
    ['tsc', '-p', 'tsconfig.api.json', '--noEmit', 'false', '--outDir', SALIDA, '--rootDir', '.'],
    { cwd: RAIZ, stdio: 'inherit' },
  )
} catch {
  console.log('  FALLA  api/ no compila')
  process.exit(1)
}

for (const nombre of ['stripe', 'avisos']) {
  const fichero = join(SALIDA, 'api', `${nombre}.js`)
  try {
    const modulo = await import(pathToFileURL(fichero).href)
    ok(typeof modulo.default === 'function', `api/${nombre} carga en Node y exporta su manejador`)
  } catch (e) {
    ok(false, `api/${nombre} revienta al cargar: ${e.code ?? ''} ${e.message.split('\n')[0]}`)
  }
}

rmSync(SALIDA, { recursive: true, force: true })
if (fallas.length) {
  console.log(`\n${fallas.length} fallaron.`)
  process.exit(1)
}
console.log('\nLas funciones cargan.')
