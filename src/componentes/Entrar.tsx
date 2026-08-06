import { useState } from 'react'

/**
 * Entrar con el correo.
 *
 * Sin contraseñas: llega un enlace y con eso se entra. Es lo que pide la
 * sección 4 del SPEC — nada de contraseñas propias hechas a mano — y le quita
 * de encima al usuario la contraseña que se le iba a olvidar.
 *
 * Cuando abre el enlace, `usarSesion` se entera solo y la pantalla cambia.
 */

type Estado = { paso: 'pidiendo' } | { paso: 'enviando' } | { paso: 'enviado' } | { paso: 'error'; mensaje: string }

export function Entrar() {
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState<Estado>({ paso: 'pidiendo' })

  async function mandarEnlace(e: React.FormEvent) {
    e.preventDefault()
    setEstado({ paso: 'enviando' })
    try {
      const { entrarConEnlace } = await import('../servidor/cliente')
      await entrarConEnlace(correo.trim())
      setEstado({ paso: 'enviado' })
    } catch (error) {
      setEstado({
        paso: 'error',
        mensaje: error instanceof Error ? error.message : 'Algo salió mal. Inténtalo otra vez.',
      })
    }
  }

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

        {estado.paso === 'enviado' ? (
          <div className="bg-carbon-2 mt-8 rounded-[15px] p-5">
            <h2 className="font-serif text-[21px]">Revisa tu correo</h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#9AA09E]">
              Le mandamos un enlace a <b className="text-white">{correo}</b>. Ábrelo desde este
              mismo teléfono y entras directo, sin contraseña.
            </p>
            <button
              type="button"
              onClick={() => setEstado({ paso: 'pidiendo' })}
              className="text-teal mt-4 min-h-11 text-[14px] font-semibold"
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          <form onSubmit={mandarEnlace} className="mt-8">
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
              disabled={estado.paso === 'enviando' || correo.trim() === ''}
              className="bg-teal mt-3 min-h-11 w-full rounded-[11px] py-3 text-[15px] font-bold text-[#06322A] disabled:opacity-50"
            >
              {estado.paso === 'enviando' ? 'Mandando…' : 'Mándame el enlace'}
            </button>

            {estado.paso === 'error' && (
              <p className="text-ambar mt-3 text-[13px] leading-[1.5]">{estado.mensaje}</p>
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
