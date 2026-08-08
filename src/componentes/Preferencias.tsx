import { useState } from 'react'
import type { Presupuesto } from '../datos/tipos'

/**
 * Las dos cosas que se preguntaban al arrancar y nunca más.
 *
 * El onboarding pide el nombre y la hora del aviso una sola vez, en los
 * primeros minutos, cuando el usuario todavía no sabe qué está montando. Si
 * después se arrepiente —o lo dejó en blanco, o se mudó de estado— no había
 * dónde cambiarlo: quedaba en la base y solo con SQL se movía.
 *
 * Nada aquí es una función nueva. Es terminar dos que ya existían a medias.
 */

const ETIQUETA = 'text-texto-2 text-[10.5px] font-semibold tracking-[.12em] uppercase'
const TARJETA = 'bg-blanco border-linea rounded-[15px] border p-5'

function Guardar({ listo, guardando, children }: { listo: boolean; guardando: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={!listo || guardando}
      className="border-linea text-texto mt-4 min-h-11 w-full rounded-[11px] border text-[14px] font-semibold disabled:opacity-40"
    >
      {guardando ? 'Guardando…' : children}
    </button>
  )
}

export function TuNombre({
  presupuesto,
  alGuardar,
}: {
  presupuesto: Presupuesto
  alGuardar: (nombre: string) => Promise<void>
}) {
  const [nombre, setNombre] = useState(presupuesto.usuario.nombre)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  const cambio = nombre.trim() !== presupuesto.usuario.nombre && nombre.trim() !== ''

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setListo(false)
    try {
      await alGuardar(nombre.trim())
      setListo(true)
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className={TARJETA}>
      <div className={ETIQUETA}>Cómo te llamamos</div>
      <p className="text-texto-2 mt-2 text-[12.5px] leading-[1.5]">
        Sale en el saludo de tu semana y al principio del correo del domingo.
      </p>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        aria-label="Tu nombre"
        placeholder="Iván García"
        autoComplete="name"
        className="border-linea text-texto mt-3 min-h-11 w-full rounded-[11px] border px-4 py-3 text-[17px] placeholder:text-[#9AA09E] focus:outline-none"
      />
      {error && (
        <p className="text-ambar mt-3 text-[13px] leading-[1.5]" role="alert">
          {error}
        </p>
      )}
      {listo && !cambio && (
        <p className="text-teal-osc mt-3 text-[13px] font-semibold" role="status">
          Guardado.
        </p>
      )}
      <Guardar listo={cambio} guardando={guardando}>
        Guardar mi nombre
      </Guardar>
    </form>
  )
}

export function TuAviso({
  presupuesto,
  alGuardar,
}: {
  presupuesto: Presupuesto
  alGuardar: (horaLocal: string, activo: boolean) => Promise<void>
}) {
  // Sin preferencia guardada, el cron manda a las 8:00. La pantalla enseña esa
  // misma hora para que lo que se ve sea lo que pasa.
  const actual = presupuesto.usuario.aviso
  const [hora, setHora] = useState(actual?.horaLocal ?? '08:00')
  const [activo, setActivo] = useState(actual?.activo ?? true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  const cambio = hora !== (actual?.horaLocal ?? '08:00') || activo !== (actual?.activo ?? true)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setListo(false)
    try {
      await alGuardar(hora, activo)
      setListo(true)
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className={TARJETA}>
      <div className={ETIQUETA}>Tu aviso</div>
      <p className="text-texto-2 mt-2 text-[12.5px] leading-[1.5]">
        El correo que te llega el día que arranca un cheque, con lo que entra, lo que se vence y
        cuánto queda libre.
      </p>

      <label className="border-linea mt-4 flex min-h-11 items-center gap-3 rounded-[11px] border px-4 py-3">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="accent-teal size-4"
        />
        <span className="text-texto text-[15px]">Quiero recibirlo</span>
      </label>

      {activo && (
        <>
          <label htmlFor="hora-aviso" className={`${ETIQUETA} mt-5 block`}>
            ¿A qué hora?
          </label>
          <input
            id="hora-aviso"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="border-linea text-texto mt-2 min-h-11 rounded-[11px] border px-4 py-3 text-[17px]"
          />
          <p className="text-texto-2 mt-2 text-[12.5px] leading-[1.5]">
            En tu reloj, no en el del servidor.
          </p>
        </>
      )}

      {error && (
        <p className="text-ambar mt-3 text-[13px] leading-[1.5]" role="alert">
          {error}
        </p>
      )}
      {listo && !cambio && (
        <p className="text-teal-osc mt-3 text-[13px] font-semibold" role="status">
          Guardado.
        </p>
      )}
      <Guardar listo={cambio} guardando={guardando}>
        Guardar mi aviso
      </Guardar>
    </form>
  )
}
