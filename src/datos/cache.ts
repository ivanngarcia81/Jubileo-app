import type { MesObjetivo } from '../lib/periodos'
import type { Presupuesto } from './tipos'

/**
 * La caché local.
 *
 * `CLAUDE.md` lo dice sin rodeos: **la verdad vive en el servidor**. Esto es
 * solo una copia para que la app abra con mala señal, que es la condición
 * normal de mucha gente en el público de Jubileo — un teléfono con datos
 * contados, en el estacionamiento del trabajo, decidiendo si le alcanza para el
 * súper.
 *
 * Por eso guarda **lo que se lee, nunca lo que se escribe**. Una cola de
 * escrituras pendientes suena bien y es otra cosa: hay que resolver conflictos,
 * y un presupuesto que se resuelve solo en contra del usuario es peor que uno
 * que dice "no hay señal, inténtalo cuando la tengas".
 *
 * Sin librerías: IndexedDB directo. Una dependencia más en el arranque de una
 * PWA que tiene que abrir rápido con mala señal se paga cara.
 */

const BASE = 'jubileo'
const ALMACEN = 'presupuestos'
const VERSION = 1

/** Cuánto vale una copia antes de dejar de enseñarse. Una semana. */
export const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000

export interface Copia {
  presupuesto: Presupuesto
  guardadoEn: number
}

export function llaveDe(usuarioId: string, mes: MesObjetivo): string {
  return `${usuarioId}:${mes.anio}-${String(mes.mes).padStart(2, '0')}`
}

/**
 * ¿Sigue sirviendo esta copia? Una vieja se descarta en vez de enseñar números
 * de hace un mes como si fueran de hoy: en un presupuesto, un dato viejo con
 * cara de fresco es peor que no tener dato.
 */
export function sirve(copia: Copia | null, ahora: number): boolean {
  return copia !== null && ahora - copia.guardadoEn < VIGENCIA_MS
}

function abrir(): Promise<IDBDatabase | null> {
  return new Promise((resolver) => {
    if (typeof indexedDB === 'undefined') return resolver(null)
    let peticion: IDBOpenDBRequest
    try {
      peticion = indexedDB.open(BASE, VERSION)
    } catch {
      // Safari en navegación privada revienta al abrirla. Sin caché se sigue.
      return resolver(null)
    }
    peticion.onupgradeneeded = () => {
      const db = peticion.result
      if (!db.objectStoreNames.contains(ALMACEN)) db.createObjectStore(ALMACEN)
    }
    peticion.onsuccess = () => resolver(peticion.result)
    peticion.onerror = () => resolver(null)
    peticion.onblocked = () => resolver(null)
  })
}

/**
 * Guarda una copia. Nunca revienta: la caché es una comodidad, y una comodidad
 * que tumba la app deja de serlo.
 */
export async function guardar(
  usuarioId: string,
  mes: MesObjetivo,
  presupuesto: Presupuesto,
  ahora: number = Date.now(),
): Promise<void> {
  const db = await abrir()
  if (!db) return
  try {
    await new Promise<void>((resolver) => {
      const t = db.transaction(ALMACEN, 'readwrite')
      t.objectStore(ALMACEN).put({ presupuesto, guardadoEn: ahora }, llaveDe(usuarioId, mes))
      t.oncomplete = () => resolver()
      t.onerror = () => resolver()
      t.onabort = () => resolver()
    })
  } finally {
    db.close()
  }
}

/** Lee la copia, o nulo si no hay, si ya no sirve, o si algo falló. */
export async function leer(
  usuarioId: string,
  mes: MesObjetivo,
  ahora: number = Date.now(),
): Promise<Presupuesto | null> {
  const db = await abrir()
  if (!db) return null
  try {
    const copia = await new Promise<Copia | null>((resolver) => {
      const t = db.transaction(ALMACEN, 'readonly')
      const p = t.objectStore(ALMACEN).get(llaveDe(usuarioId, mes))
      p.onsuccess = () => resolver((p.result as Copia | undefined) ?? null)
      p.onerror = () => resolver(null)
    })
    return sirve(copia, ahora) ? copia!.presupuesto : null
  } catch {
    return null
  } finally {
    db.close()
  }
}

/** Al salir de la sesión no se deja nada del usuario en el aparato. */
export async function olvidarTodo(): Promise<void> {
  const db = await abrir()
  if (!db) return
  try {
    await new Promise<void>((resolver) => {
      const t = db.transaction(ALMACEN, 'readwrite')
      t.objectStore(ALMACEN).clear()
      t.oncomplete = () => resolver()
      t.onerror = () => resolver()
      t.onabort = () => resolver()
    })
  } finally {
    db.close()
  }
}
