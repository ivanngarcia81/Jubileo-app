import type { Fondo, LineaMes, Movimiento, Pago, Presupuesto, Sobre } from '../datos/tipos'
import { type Centavos, centavos, suma } from '../lib/dinero'
import { type FechaCivil, anioDe, diaDelMesRecortado, fecha, mesDe } from '../lib/fecha'
import type { Periodo } from '../lib/periodos'
import type { FilasDelMes, FilaPeriodo } from './esquema'

/**
 * Filas de la base → el `Presupuesto` que consumen las pantallas.
 *
 * Puro y probado. Toda la aritmética del servidor vive aquí y no dentro de los
 * repositorios, que se quedan en puro I/O: así lo que se puede equivocar se
 * puede probar sin base de datos.
 */

const ETIQUETAS_FRECUENCIA: Record<string, string> = {
  semanal: 'Semanal',
  cada_dos_semanas: 'Cada dos semanas',
  dos_veces_al_mes: 'Dos veces al mes',
  mensual: 'Mensual',
  variable: 'Ingreso variable',
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function iniciales(nombre: string | null, correo: string): string {
  const base = (nombre ?? correo.split('@')[0] ?? '').trim()
  if (!base) return '?'
  const partes = base.split(/\s+/)
  const primera = partes[0]?.[0] ?? ''
  const segunda = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : (partes[0]?.[1] ?? '')
  return (primera + segunda).toUpperCase()
}

/**
 * Lo que entró en un periodo. Se prefiere lo real sobre lo esperado: en modo
 * `variable` no hay esperado, y en cualquier modo el usuario confirma al
 * arrancar el periodo. Nunca se presupuesta ingreso que no ha entrado.
 */
export function ingresoDe(p: Pick<FilaPeriodo, 'ingreso_real_cents' | 'ingreso_esperado_cents'>): Centavos {
  return centavos(p.ingreso_real_cents ?? p.ingreso_esperado_cents ?? 0)
}

/**
 * Cuánto queda libre en un cheque: lo que entró menos lo que ya tiene trabajo
 * asignado. En un mes bien repartido da cero en los cheques normales, y el
 * cheque extra aparece completo — que es exactamente lo que dice la regla 2 de
 * la sección 6: el extra no se reparte, llega entero.
 */
export function libreDelPeriodo(periodo: FilaPeriodo, asignadoCents: number): Centavos {
  return centavos(ingresoDe(periodo) - asignadoCents)
}

/** ¿La fecha de vencimiento de una categoría fija cae dentro de este periodo? */
export function venceEnElPeriodo(
  diaVencimiento: number,
  inicio: FechaCivil,
  fin: FechaCivil,
): boolean {
  // El periodo puede cruzar de mes, así que se prueban los dos meses que toca.
  const candidatos = [
    diaDelMesRecortado(anioDe(inicio), mesDe(inicio), diaVencimiento),
    diaDelMesRecortado(anioDe(fin), mesDe(fin), diaVencimiento),
  ]
  return candidatos.some((f) => f >= inicio && f <= fin)
}

/**
 * Cuánto apartar por cheque para llegar a la meta. Derivado, nunca guardado
 * (sección 5). Se reparte lo que falta entre los cheques que quedan.
 */
export function porChequeParaLaMeta(
  faltanteCents: Centavos,
  mesesQueFaltan: number,
  chequesPorMes: number,
): Centavos {
  const cheques = Math.max(1, mesesQueFaltan * Math.max(1, chequesPorMes))
  return centavos(Math.ceil(faltanteCents / cheques))
}

export function mesesEntre(desde: FechaCivil, hasta: FechaCivil | null): number {
  if (!hasta) return 0
  const meses = (anioDe(hasta) - anioDe(desde)) * 12 + (mesDe(hasta) - mesDe(desde))
  return Math.max(0, meses)
}

// ---------------------------------------------------------------------------

export interface OpcionesMapeo {
  /** Historial para las barras del selector de mes. Vacío si no se pidió. */
  mesesPasados?: Presupuesto['mesesPasados']
}

export function aPresupuesto(filas: FilasDelMes, opciones: OpcionesMapeo = {}): Presupuesto {
  const yo = filas.usuarios.find((u) => u.id === filas.usuarioActual) ?? filas.usuarios[0]
  if (!yo) throw new Error('El mes llegó sin ningún usuario: no se puede armar el presupuesto')

  // ---- Periodos ----------------------------------------------------------
  // Se ordenan por fecha de pago y se renumeran para mostrar. En modo pareja
  // esto junta los cheques de los dos en un solo riel, en el orden en que
  // caen, que es como se vive el mes.
  const periodosOrdenados = [...filas.periodos].sort((a, b) =>
    a.fecha_pago === b.fecha_pago ? a.usuario_id.localeCompare(b.usuario_id) : a.fecha_pago < b.fecha_pago ? -1 : 1,
  )

  const asignadoPorPeriodo = new Map<string, number>()
  for (const a of filas.asignaciones) {
    asignadoPorPeriodo.set(a.periodo_id, (asignadoPorPeriodo.get(a.periodo_id) ?? 0) + a.monto_cents)
  }

  const periodos: Periodo[] = periodosOrdenados.map((p, i) => ({
    numero: i + 1,
    fechaInicio: fecha(p.fecha_inicio),
    fechaFin: fecha(p.fecha_fin),
    fechaPago: fecha(p.fecha_pago),
    esExtra: p.es_extra,
    ingresoEsperadoCents: p.ingreso_esperado_cents === null ? null : centavos(p.ingreso_esperado_cents),
  }))

  const libreporPeriodoCents = periodosOrdenados.map((p) =>
    libreDelPeriodo(p, asignadoPorPeriodo.get(p.id) ?? 0),
  )

  const activo = Math.max(
    0,
    periodosOrdenados.findIndex((p) => p.estado === 'activo'),
  )
  const periodoActivo = periodosOrdenados.some((p) => p.estado === 'activo') ? activo : 0
  const enCurso = periodosOrdenados[periodoActivo]

  // ---- Índices -----------------------------------------------------------
  const categoriaPorId = new Map(filas.categorias.map((c) => [c.id, c]))
  const lineaPorCategoria = new Map(filas.lineas.map((l) => [l.categoria_id, l]))
  const deudaPorId = new Map(filas.deudas.map((d) => [d.id, d]))

  const asignadoAlPeriodo = (categoriaId: string, periodoId: string): Centavos => {
    const linea = lineaPorCategoria.get(categoriaId)
    if (!linea) return centavos(0)
    const a = filas.asignaciones.find(
      (x) => x.linea_presupuesto_id === linea.id && x.periodo_id === periodoId,
    )
    return centavos(a?.monto_cents ?? 0)
  }

  const enCategoria = (grupo: string) =>
    filas.categorias
      .filter((c) => c.grupo === grupo && c.activa)
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))

  /**
   * A qué cheque le toca pagar un fijo: el primero que termina en o después de
   * su día de vencimiento. Es lo que el contrato visual enseña como "Vence el
   * 3 · Cheque 1", y lo que hace útil el aviso — saber el día no sirve si no
   * sabes con cuál cheque lo vas a pagar.
   */
  const chequeQuePaga = (dia: number): number | null => {
    // La fecha completa, no solo el día: el último cheque del mes casi siempre
    // termina en el mes siguiente (julio cierra el 3 de agosto), y comparar
    // días sueltos diría que nadie paga lo que vence el 25.
    const vence = `${filas.mes.anio}-${String(filas.mes.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    const i = periodosOrdenados.findIndex((p) => p.fecha_fin >= vence)
    return i === -1 ? null : i + 1
  }

  const aLineaMes = (c: (typeof filas.categorias)[number], icono: string): LineaMes => {
    const cheque = c.dia_vencimiento === null ? null : chequeQuePaga(c.dia_vencimiento)
    return {
      id: c.id,
      nombre: c.nombre,
      icono,
      detalle: c.dia_vencimiento
        ? `Vence el ${c.dia_vencimiento}${cheque ? ` · Cheque ${cheque}` : ''}`
        : '',
      montoMensualCents: centavos(lineaPorCategoria.get(c.id)?.monto_mensual_cents ?? 0),
    }
  }

  // ---- Pagos del periodo en curso ----------------------------------------
  // Las categorías fijas y las de deuda que vencen dentro del cheque activo.
  const pagos: Pago[] = enCurso
    ? filas.categorias
        .filter(
          (c) =>
            c.activa &&
            c.dia_vencimiento !== null &&
            (c.grupo === 'fijo' || c.grupo === 'deuda') &&
            venceEnElPeriodo(c.dia_vencimiento, fecha(enCurso.fecha_inicio), fecha(enCurso.fecha_fin)),
        )
        .map((c) => {
          const deuda = c.deuda_id ? deudaPorId.get(c.deuda_id) : undefined
          return {
            id: c.id,
            nombre: c.nombre,
            diaVencimiento: c.dia_vencimiento!,
            montoCents: asignadoAlPeriodo(c.id, enCurso.id),
            pagado: filas.transacciones.some(
              (t) => t.categoria_id === c.id && t.periodo_id === enCurso.id && t.estado === 'asignada',
            ),
            ...(deuda?.es_enfoque ? { esEnfoque: true } : {}),
          }
        })
        .sort((a, b) => a.diaVencimiento - b.diaVencimiento)
    : []

  // ---- Sobres del periodo en curso ---------------------------------------
  const sobres: Sobre[] = enCurso
    ? enCategoria('variable').map((c) => ({
        id: c.id,
        nombre: c.nombre,
        presupuestoCents: asignadoAlPeriodo(c.id, enCurso.id),
        gastadoCents: centavos(
          suma(
            filas.transacciones
              .filter(
                (t) => t.categoria_id === c.id && t.periodo_id === enCurso.id && t.tipo === 'gasto',
              )
              .map((t) => centavos(t.monto_cents)),
          ),
        ),
      }))
    : []

  // ---- El mes -------------------------------------------------------------
  const entraCents = centavos(suma(periodosOrdenados.map(ingresoDe)))
  const saleCents = centavos(suma(filas.lineas.map((l) => centavos(l.monto_mensual_cents))))
  const aLaDeudaCents = centavos(
    suma(
      filas.lineas
        .filter((l) => categoriaPorId.get(l.categoria_id)?.grupo === 'deuda')
        .map((l) => centavos(l.monto_mensual_cents)),
    ),
  )

  const mayordomia = enCategoria('mayordomia')[0]
  const chequesRepartibles = periodosOrdenados.filter((p) => !p.es_extra).length
  const primerDiaDelMes = fecha(
    `${filas.mes.anio}-${String(filas.mes.mes).padStart(2, '0')}-01`,
  )

  const fondos: Fondo[] = filas.fondos.map((f) => {
    const faltante = centavos(Math.max(0, f.meta_cents - f.acumulado_cents))
    const objetivo = f.fecha_objetivo ? fecha(f.fecha_objetivo) : null
    const mesesQueFaltan = mesesEntre(primerDiaDelMes, objetivo)
    return {
      id: f.id,
      nombre: f.nombre,
      metaCents: centavos(f.meta_cents),
      acumuladoCents: centavos(f.acumulado_cents),
      mesObjetivo: objetivo ? (MESES[mesDe(objetivo) - 1] ?? '') : 'Sin fecha',
      mesesQueFaltan,
      porChequeCents: porChequeParaLaMeta(faltante, mesesQueFaltan, chequesRepartibles),
    }
  })

  const movimientos: Movimiento[] = [...filas.transacciones]
    .sort((a, b) => (a.fecha > b.fecha ? -1 : a.fecha < b.fecha ? 1 : 0))
    .map((t) => ({
      id: t.id,
      nombre: t.descripcion ?? t.comercio ?? 'Movimiento',
      icono: t.tipo === 'ingreso' ? '↓' : '·',
      categoria: t.categoria_id ? (categoriaPorId.get(t.categoria_id)?.nombre ?? '') : 'Sin asignar',
      fecha: fecha(t.fecha),
      montoCents: centavos(t.monto_cents),
      tipo: t.tipo,
    }))

  return {
    usuario: {
      nombre: (yo.nombre ?? yo.correo.split('@')[0] ?? '').split(/\s+/)[0] ?? '',
      iniciales: iniciales(yo.nombre, yo.correo),
      nivel: yo.nivel,
      frecuencia: yo.frecuencia_pago ? (ETIQUETAS_FRECUENCIA[yo.frecuencia_pago] ?? '') : '',
    },

    mesId: filas.mes.id,
    mes: {
      anio: filas.mes.anio,
      mes: filas.mes.mes,
      etiqueta: `${MESES[filas.mes.mes - 1] ?? ''} ${filas.mes.anio}`,
    },

    periodos,
    periodoActivo,
    ingresoPorChequeCents: enCurso ? ingresoDe(enCurso) : centavos(0),
    libreporPeriodoCents,

    entraCents,
    saleCents,
    // Base cero: el dinero que entró y todavía no tiene trabajo.
    sinRepartirCents: centavos(entraCents - saleCents),
    aLaDeudaCents,
    variacionEntra: '',
    variacionSale: '',

    pagos,
    sobres,
    mayordomia: mayordomia
      ? aLineaMes(mayordomia, '✦')
      : { id: 'mayordomia', nombre: 'Mayordomía', icono: '✦', detalle: '', montoMensualCents: centavos(0) },
    fijos: enCategoria('fijo').map((c) => aLineaMes(c, '·')),
    variables: enCategoria('variable').map((c) => aLineaMes(c, '◇')),
    fondos,

    deudas: [...filas.deudas]
      .filter((d) => d.pagada_en === null)
      .sort((a, b) => a.saldo_cents - b.saldo_cents)
      .map((d) => ({
        id: d.id,
        nombre: d.nombre,
        saldoInicialCents: centavos(d.saldo_inicial_cents),
        saldoCents: centavos(d.saldo_cents),
        pagoMinimoCents: centavos(d.pago_minimo_cents),
        pagoActualCents: centavos(
          lineaPorCategoria.get(
            filas.categorias.find((c) => c.deuda_id === d.id)?.id ?? '',
          )?.monto_mensual_cents ?? d.pago_minimo_cents,
        ),
        tasaInteres: Number(d.tasa_interes ?? 0),
        esEnfoque: d.es_enfoque,
      })),

    movimientos,
    mesesPasados: opciones.mesesPasados ?? [],
    inicioDeudas: primerDiaDelMes,
  }
}
