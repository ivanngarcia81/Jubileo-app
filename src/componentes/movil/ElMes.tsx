import { useState } from 'react'
import type { LineaMes, Presupuesto } from '../../datos/tipos'
import { type Centavos, formatearRedondo } from '../../lib/dinero'
import { alturas } from '../../lib/mes/barras'
import {
  CeldaCifra,
  CeldaNombre,
  Fila,
  FilaAgregar,
  FilaFondo,
  ListaSeccion,
  Moneda,
  Segmentado,
} from '../base'
import { IconoDeClave, IconoDinero, IconoMetas } from '../iconos'
import { CerrarMes } from './CerrarMes'
import { NuevaCategoria } from './NuevaCategoria'
import { PonerMonto } from './PonerMonto'

/**
 * El mes — presupuesto base cero.
 *
 * Primero mayordomía, luego los fijos con su día de vencimiento y el cheque
 * que les toca, y al final los fondos de reserva. Arriba, el selector de mes
 * con barras y el control segmentado de entra / sale / sobró.
 */

const VISTAS = ['Entra', 'Sale', 'Sobró'] as const

function SelectorDeMes({
  presupuesto,
  alVerMes,
}: {
  presupuesto: Presupuesto
  alVerMes?: (anio: number, mes: number) => void
}) {
  const [vista, setVista] = useState<string>('Sale')

  // Las barras enseñan lo mismo que el número de arriba. Cambiar de vista
  // cambia la escala, y así se compara lo que se está mirando y no otra cosa.
  const deCadaMes = presupuesto.mesesPasados.map((m) =>
    vista === 'Entra' ? m.entraCents : vista === 'Sale' ? m.saleCents : m.sobroCents,
  )
  const altos = alturas(deCadaMes)

  const sobra = presupuesto.sinRepartirCents
  const cifra =
    vista === 'Entra' ? presupuesto.entraCents : vista === 'Sale' ? presupuesto.saleCents : sobra

  return (
    <div className="bg-blanco border-linea rounded-[15px] border px-[14px] pt-[15px] pb-3">
      <div className="mb-[14px] text-center">
        <div
          className={`font-serif text-[38px] leading-none [font-variant-numeric:tabular-nums] ${
            vista === 'Sobró' && sobra !== 0 ? 'text-ambar' : 'text-teal-osc'
          }`}
        >
          {formatearRedondo(cifra)}
        </div>
        <div className="text-texto-2 mt-[3px] text-[11.5px]">
          {vista === 'Sobró'
            ? sobra === 0
              ? 'Sin repartir — tu presupuesto cuadra'
              : sobra > 0
                ? 'Sin repartir — todavía falta darle destino'
                : 'Te pasaste: repartiste más de lo que entra'
            : vista === 'Entra'
              ? `Entra este mes · ${presupuesto.periodos.length} cheques`
              : 'Sale este mes · repartido en tus cheques'}
        </div>
      </div>

      <div className="flex h-[112px] items-end gap-2">
        {presupuesto.mesesPasados.map((m, i) => {
          const activo = m.anio === presupuesto.mes.anio && m.mes === presupuesto.mes.mes
          const sePuedeAbrir = Boolean(alVerMes) && !activo && m.alcanzable
          return (
            <button
              key={`${m.anio}-${m.mes}`}
              type="button"
              disabled={!sePuedeAbrir}
              onClick={() => alVerMes?.(m.anio, m.mes)}
              // El mes que no se alcanza sí se dibuja: enseña que hubo historia
              // y que hace falta premium para entrar, en vez de esconderla.
              aria-label={
                activo
                  ? `${m.etiqueta}, el que estás viendo`
                  : m.alcanzable
                    ? `Ver ${m.etiqueta}`
                    : `${m.etiqueta} — solo en premium`
              }
              aria-current={activo ? 'true' : undefined}
              className="flex h-full flex-1 flex-col items-center justify-end gap-[7px]"
            >
              <div className="bg-gris relative h-full w-full max-w-[24px] rounded-[7px]">
                <div
                  className={`absolute bottom-0 left-0 w-full rounded-[7px] ${
                    activo
                      ? 'bg-[linear-gradient(180deg,#0ABBB4,#0A847F)]'
                      : m.alcanzable
                        ? 'bg-[#B9C2BF]'
                        : 'bg-linea'
                  }`}
                  style={{ height: `${altos[i] ?? 0}%` }}
                />
              </div>
              <div className={`text-[10.5px] ${activo ? 'text-texto font-bold' : 'text-texto-2'}`}>
                {m.etiqueta}
              </div>
            </button>
          )
        })}
      </div>

      <Segmentado opciones={VISTAS} activa={vista} alElegir={setVista} className="mt-[14px]" />
    </div>
  )
}

/**
 * Las columnas de las listas de esta pantalla. Se declaran aquí y no dentro de
 * cada fila: es lo que hace que los montos de todas las categorías caigan en la
 * misma vertical y se puedan comparar de un vistazo.
 */
const CATEGORIAS = { columnas: 'minmax(0,1fr) 84px', columnasPanel: 'minmax(150px,1fr) 120px' }
const FONDOS = {
  columnas: 'minmax(0,1fr) 44px 84px',
  columnasPanel: 'minmax(150px,1fr) minmax(90px,300px) 140px',
}

export function ElMes({
  presupuesto,
  alPonerMonto,
  alRenombrar,
  alQuitar,
  alCrearCategoria,
  alCerrarMes,
  alVerMes,
}: {
  presupuesto: Presupuesto
  /** Ausentes con los datos de ejemplo: la demostración se ve pero no se edita. */
  alPonerMonto?: (categoriaId: string, montoCents: Centavos) => Promise<void>
  alRenombrar?: (categoriaId: string, nombre: string) => Promise<void>
  alQuitar?: (categoriaId: string) => Promise<void>
  alCrearCategoria?: (
    grupo: 'fijo' | 'variable',
    nombre: string,
    diaVencimiento: number | undefined,
  ) => Promise<void>
  alCerrarMes?: () => Promise<void>
  alVerMes?: (anio: number, mes: number) => void
}) {
  const [editando, setEditando] = useState<LineaMes | null>(null)
  const [creando, setCreando] = useState<'fijo' | 'variable' | null>(null)
  const editable = Boolean(alPonerMonto && presupuesto.mesId)
  // Los cheques extra no se reparten: lo que caiga ahí es de más, no del mes.
  const chequesQueSeReparten = presupuesto.periodos.filter((p) => !p.esExtra).length

  // La fila entera es el botón, como en el mockup: no hay controles sueltos
  // dentro del renglón. Antes el monto era un botón con borde de 44px de alto
  // que se comía la mitad de la fila.
  const filaEditable = (linea: LineaMes) => (
    <Fila
      key={linea.id}
      {...(editable ? { alTocar: () => setEditando(linea), etiqueta: `Poner el monto de ${linea.nombre}` } : {})}
    >
      <CeldaNombre
        icono={<IconoDeClave clave={linea.icono} tam={13} />}
        {...(linea.detalle ? { detalle: linea.detalle } : {})}
      >
        {linea.nombre}
      </CeldaNombre>
      <CeldaCifra>
        <Moneda centavos={linea.montoMensualCents} />
      </CeldaCifra>
    </Fila>
  )

  return (
    <div className="flex flex-col gap-3">
      <SelectorDeMes presupuesto={presupuesto} {...(alVerMes ? { alVerMes } : {})} />

      <ListaSeccion
        titulo="Primero"
        icono={<IconoDinero tam={15} />}
        {...CATEGORIAS}
      >
        {filaEditable(presupuesto.mayordomia)}
      </ListaSeccion>

      <ListaSeccion
        titulo="Gastos fijos"
        icono={<IconoDinero tam={15} />}
        dato={`${presupuesto.fijos.length} categorías`}
        {...CATEGORIAS}
      >
        {presupuesto.fijos.map(filaEditable)}
        {alCrearCategoria && <FilaAgregar texto="Agregar un gasto fijo" alTocar={() => setCreando('fijo')} />}
      </ListaSeccion>

      {(presupuesto.variables.length > 0 || alCrearCategoria) && (
        <ListaSeccion
          titulo="Gastos variables"
          icono={<IconoDinero tam={15} />}
          dato={`${presupuesto.variables.length} sobres`}
          {...CATEGORIAS}
        >
          {presupuesto.variables.map(filaEditable)}
          {alCrearCategoria && <FilaAgregar texto="Agregar un sobre" alTocar={() => setCreando('variable')} />}
        </ListaSeccion>
      )}

      {editando && alPonerMonto && (
        <PonerMonto
          linea={editando}
          cheques={chequesQueSeReparten}
          alGuardar={(monto) => alPonerMonto(editando.id, monto)}
          {...(alRenombrar ? { alRenombrar: (n: string) => alRenombrar(editando.id, n) } : {})}
          {...(alQuitar ? { alQuitar: () => alQuitar(editando.id) } : {})}
          alCerrar={() => setEditando(null)}
        />
      )}

      {creando && alCrearCategoria && (
        <NuevaCategoria
          grupo={creando}
          alCrear={(nombre, dia) => alCrearCategoria(creando, nombre, dia)}
          alCerrar={() => setCreando(null)}
        />
      )}

      <ListaSeccion
        titulo="Fondos de reserva"
        icono={<IconoMetas tam={15} />}
        encabezados={['Fondo', null, 'Llevas']}
        {...FONDOS}
      >
        {presupuesto.fondos.slice(0, 2).map((fondo) => (
          <FilaFondo
            key={fondo.id}
            nombre={fondo.nombre}
            acumuladoCents={fondo.acumuladoCents}
            metaCents={fondo.metaCents}
            cuando={
              <>
                {fondo.mesObjetivo} · <Moneda centavos={fondo.porChequeCents} /> por cheque
              </>
            }
          />
        ))}
      </ListaSeccion>

      {alCerrarMes && <CerrarMes presupuesto={presupuesto} alCerrar={alCerrarMes} />}
    </div>
  )
}
