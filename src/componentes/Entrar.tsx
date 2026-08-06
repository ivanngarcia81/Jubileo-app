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

const LARGO = 6

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
    const soloDigitos = valor.replace(/\D/g, '').slice(0, LARGO)
    setCodigo(soloDigitos)
    // Se manda solo al completarse: un botón menos que tocar.
    if (soloDigitos.length === LARGO) void verificar(soloDigitos)
  }

  const pidiendoCodigo = estado.paso === 'codigo' || estado.paso === 'verificando'

  return (
    <main className="bg-carbon font-sans grid min-h-dvh place-items-center px-6 py-10 text-white">
      <div className="w-full max-w-[34ch]">
        <div className="bg-carbon-2 text-teal font-serif mb-7 grid size-12 place-items-center rounded-[13px] text-[26px]">
          J
        </div>

        <h1 className="font-serif text-[32px] leading-[1.1]">
          Jubileo<span className="text-teal">.</span>
        </h1>
        <p className="mt-2 text-[15px] leading-[1.6] text-[#9AA09E]">
          Tu presupuesto ajustado a cómo te pagan de verdad.
        </p>

        {pidiendoCodigo ? (
          <div className="mt-8">
            <label htmlFor="codigo" className="block text-[13px] font-semibold text-[#9AA09E]">
              Tu código
            </label>
            <p className="mt-1 text-[13px] leading-[1.55] text-[#6E7473]">
              Le mandamos seis números a <b className="text-white">{correo}</b>. Tecléalos aquí.
            </p>

            <input
              ref={campoCodigo}
              id="codigo"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={LARGO}
              value={codigo}
              disabled={estado.paso === 'verificando'}
              onChange={(e) => alEscribirCodigo(e.target.value)}
              placeholder="······"
              aria-label="Código de seis dígitos"
              className="bg-carbon-2 border-carbon-3 mt-3 min-h-11 w-full rounded-[11px] border py-3 text-center text-[28px] tracking-[.4em] text-white [font-variant-numeric:tabular-nums] placeholder:tracking-[.3em] placeholder:text-[#4A4F4E] focus:border-[color:var(--teal)] focus:outline-none disabled:opacity-60"
            />

            {estado.paso === 'verificando' && (
              <p className="mt-3 text-[13px] text-[#9AA09E]">Entrando…</p>
            )}

            {error && (
              <p className="text-ambar mt-3 text-[13px] leading-[1.5]" role="alert">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void mandar()}
                className="text-teal min-h-11 text-left text-[14px] font-semibold"
              >
                Mándame otro código
              </button>
              <button
                type="button"
                onClick={() => {
                  setEstado({ paso: 'correo' })
                  setError(null)
                }}
                className="min-h-11 text-left text-[14px] text-[#6E7473]"
              >
                Usar otro correo
              </button>
            </div>

            <p className="mt-6 text-[12.5px] leading-[1.55] text-[#6E7473]">
              Si no llega en un minuto, revisa la carpeta de correo no deseado.
            </p>
          </div>
        ) : (
          <form onSubmit={mandar} className="mt-8">
            <label htmlFor="correo" className="block text-[13px] font-semibold text-[#9AA09E]">
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
              className="bg-carbon-2 border-carbon-3 mt-2 min-h-11 w-full rounded-[11px] border px-4 py-3 text-[17px] text-white placeholder:text-[#6E7473] focus:border-[color:var(--teal)] focus:outline-none"
            />

            <button
              type="submit"
              disabled={estado.paso === 'mandando' || correo.trim() === ''}
              className="bg-teal mt-3 min-h-11 w-full rounded-[11px] py-3 text-[15px] font-bold text-[#06322A] disabled:opacity-50"
            >
              {estado.paso === 'mandando' ? 'Mandando…' : 'Mándame el código'}
            </button>

            {error && (
              <p className="text-ambar mt-3 text-[13px] leading-[1.5]" role="alert">
                {error}
              </p>
            )}

            <p className="mt-4 text-[12.5px] leading-[1.55] text-[#6E7473]">
              Si es tu primera vez, con esto se crea tu cuenta. No hay contraseña que recordar.
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
