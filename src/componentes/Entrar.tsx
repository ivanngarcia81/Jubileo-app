import { useEffect, useRef, useState } from 'react'

/**
 * Entrar con el correo, sin contraseña.
 *
 * Llega un código de seis dígitos y se teclea aquí mismo. El correo no trae
 * enlace a propósito: el enlace depende de que el correo se abra en el mismo
 * navegador donde se pidió, y en iPhone casi nunca pasa. Dejarlo ahí solo
 * serviría para que lo toquen y falle. El SPEC describe a alguien con poca
 * paciencia con software — teclear seis números es algo que nadie falla.
 */

type Paso =
  | { paso: 'correo' }
  | { paso: 'mandando' }
  | { paso: 'codigo' }
  | { paso: 'verificando' }

/**
 * Cuántos dígitos trae el código lo decide el servidor, no la app: es el ajuste
 * `Email OTP Length` de Supabase, que va de 6 a 10. Aquí solo se sabe cuál es
 * el más común, y por eso el campo aguanta hasta el máximo y el botón sirve
 * desde el mínimo. Antes se mandaba solo al sexto dígito y nada más: cuando el
 * servidor mandó ocho, la app enviaba los primeros seis y no había forma de
 * seguir — un callejón sin salida en la única pantalla que no puede tenerlo.
 */
const MINIMO = 6
const MAXIMO = 10
/** Al llegar aquí se manda solo, que es lo normal y ahorra un toque. */
const ESPERADO = 6

export function Entrar() {
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [estado, setEstado] = useState<Paso>({ paso: 'correo' })
  const [error, setError] = useState<string | null>(null)
  const campoCodigo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (estado.paso === 'codigo') campoCodigo.current?.focus()
  }, [estado.paso])

  async function mandar(e?: React.FormEvent) {
    e?.preventDefault()
    setEstado({ paso: 'mandando' })
    setError(null)
    try {
      const { pedirCodigo } = await import('../servidor/cliente')
      await pedirCodigo(correo.trim())
      setCodigo('')
      setEstado({ paso: 'codigo' })
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Algo salió mal. Inténtalo otra vez.')
      setEstado({ paso: 'correo' })
    }
  }

  async function verificar(valor: string) {
    setEstado({ paso: 'verificando' })
    setError(null)
    try {
      const { verificarCodigo } = await import('../servidor/cliente')
      await verificarCodigo(correo.trim(), valor)
      // La sesión cambia sola y `usarSesion` se entera: no hay nada que hacer.
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'No se pudo entrar.')
      setCodigo('')
      setEstado({ paso: 'codigo' })
    }
  }

  function alEscribirCodigo(valor: string) {
    const soloDigitos = valor.replace(/\D/g, '').slice(0, MAXIMO)
    setCodigo(soloDigitos)
    // Se manda solo al largo de siempre: un toque menos. Si el servidor manda
    // más dígitos, se siguen tecleando y se entra con el botón.
    if (soloDigitos.length === ESPERADO) void verificar(soloDigitos)
  }

  const pidiendoCodigo = estado.paso === 'codigo' || estado.paso === 'verificando'

  return (
    <main className="bg-carbon font-sans grid min-h-dvh place-items-center px-6 py-10 text-white">
      <div className="w-full max-w-[34ch]">
        {/* La versión para fondo oscuro: la mitad negra del logo va en blanco,
            porque sobre carbón el negro de la marca desaparece. */}
        <img
          src="/logo-jf.png"
          alt="Jubileo Financiero"
          width={56}
          height={54}
          className="mb-7 w-14"
        />

        <h1 className="font-serif text-cifra leading-[1.1]">
          Jubileo<span className="text-teal">.</span>
        </h1>
        <p className="mt-2 text-cuerpo leading-[1.6] text-[#9AA09E]">
          Tu presupuesto ajustado a cómo te pagan de verdad.
        </p>

        {pidiendoCodigo ? (
          <div className="mt-8">
            <label htmlFor="codigo" className="block text-menor font-semibold text-[#9AA09E]">
              Tu código
            </label>
            <p className="mt-1 text-menor leading-[1.55] text-[#6E7473]">
              Le mandamos un código a <b className="text-white">{correo}</b>. Tecléalo aquí.
            </p>

            <input
              ref={campoCodigo}
              id="codigo"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={MAXIMO}
              value={codigo}
              disabled={estado.paso === 'verificando'}
              onChange={(e) => alEscribirCodigo(e.target.value)}
              placeholder="······"
              aria-label="Código del correo"
              className="bg-carbon-2 border-carbon-3 mt-3 min-h-11 w-full rounded-[11px] border py-3 text-center text-cifra tracking-[.4em] text-white [font-variant-numeric:tabular-nums] placeholder:tracking-[.3em] placeholder:text-[#4A4F4E] focus:border-[color:var(--teal)] focus:outline-none disabled:opacity-60"
            />

            {estado.paso === 'verificando' && (
              <p className="mt-3 text-menor text-[#9AA09E]">Entrando…</p>
            )}

            {error && (
              <p className="text-ambar mt-3 text-menor leading-[1.5]" role="alert">
                {error}
              </p>
            )}

            {/* Siempre hay un botón. Si el código trae más dígitos de los que
                disparan el envío automático, esta es la salida. */}
            <button
              type="button"
              onClick={() => void verificar(codigo)}
              disabled={codigo.length < MINIMO || estado.paso === 'verificando'}
              className="bg-teal mt-4 min-h-11 w-full rounded-[11px] py-3 text-cuerpo font-bold text-[#043432] disabled:opacity-50"
            >
              Entrar
            </button>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void mandar()}
                className="text-teal min-h-11 text-left text-cuerpo font-semibold"
              >
                Mándame otro código
              </button>
              <button
                type="button"
                onClick={() => {
                  setEstado({ paso: 'correo' })
                  setError(null)
                }}
                className="min-h-11 text-left text-cuerpo text-[#6E7473]"
              >
                Usar otro correo
              </button>
            </div>

            <p className="mt-6 text-menor leading-[1.55] text-[#6E7473]">
              Si no llega en un minuto, revisa la carpeta de correo no deseado.
            </p>
          </div>
        ) : (
          <form onSubmit={mandar} className="mt-8">
            <label htmlFor="correo" className="block text-menor font-semibold text-[#9AA09E]">
              Tu correo
            </label>
            <input
              id="correo"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
              className="bg-carbon-2 border-carbon-3 mt-2 min-h-11 w-full rounded-[11px] border px-4 py-3 text-titulo text-white placeholder:text-[#6E7473] focus:border-[color:var(--teal)] focus:outline-none"
            />

            <button
              type="submit"
              disabled={estado.paso === 'mandando' || correo.trim() === ''}
              className="bg-teal mt-3 min-h-11 w-full rounded-[11px] py-3 text-cuerpo font-bold text-[#043432] disabled:opacity-50"
            >
              {estado.paso === 'mandando' ? 'Mandando…' : 'Mándame el código'}
            </button>

            {error && (
              <p className="text-ambar mt-3 text-menor leading-[1.5]" role="alert">
                {error}
              </p>
            )}

            <p className="mt-4 text-menor leading-[1.55] text-[#6E7473]">
              Si es tu primera vez, con esto se crea tu cuenta. No hay contraseña que recordar.
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
