import { hoy } from '../../datos/fuente'
import type { Presupuesto } from '../../datos/tipos'
import type { MesObjetivo } from '../../lib/periodos'
import { cliente } from '../cliente'
import type {
  FilaAsignacion,
  FilaCategoria,
  FilaDeuda,
  FilaFondo,
  FilaLinea,
  FilaMes,
  FilaPeriodo,
  FilaTransaccion,
  FilaUsuario,
  FilasDelMes,
} from '../esquema'
import { aPresupuesto } from '../mapeo'

/**
 * Puro I/O. Trae las filas del mes y se las pasa a `mapeo.aPresupuesto`, que
 * es donde vive la aritmética y donde están las pruebas. Aquí no se calcula
 * nada: si algo hay que decidir, se decide en el mapeo.
 *
 * Las políticas de RLS ya limitan lo que se ve al hogar de quien tiene sesión,
 * así que las consultas no filtran por hogar a mano — eso sería una segunda
 * fuente de verdad que se puede desincronizar de las políticas.
 */

function reventar(donde: string, error: { message: string } | null): void {
  if (error) throw new Error(`No se pudo leer ${donde}: ${error.message}`)
}

export async function cargarPresupuestoDelMes(
  { anio, mes }: MesObjetivo,
  usuarioActual: string,
): Promise<Presupuesto | null> {
  const db = cliente()

  const { data: filaMes, error: errorMes } = await db
    .from('meses')
    .select('id, hogar_id, anio, mes, estado, cerrado_en')
    .eq('anio', anio)
    .eq('mes', mes)
    .maybeSingle<FilaMes>()
  reventar('el mes', errorMes)
  if (!filaMes) return null

  const [usuarios, periodos, categorias, lineas, asignaciones, deudas, fondos] =
    await Promise.all([
      db
        .from('usuarios')
        .select(
          'id, correo, nombre, zona_horaria, nivel, nivel_vence_en, frecuencia_pago, fecha_ancla, dias_pago, ingreso_esperado_cents, onboarding_terminado_en',
        )
        .returns<FilaUsuario[]>(),
      db
        .from('periodos')
        .select(
          'id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, ingreso_esperado_cents, ingreso_real_cents, es_extra, estado',
        )
        .eq('mes_id', filaMes.id)
        .returns<FilaPeriodo[]>(),
      db
        .from('categorias')
        .select('id, nombre, grupo, orden, activa, es_fija, dia_vencimiento, deuda_id')
        .returns<FilaCategoria[]>(),
      db
        .from('lineas_presupuesto')
        .select('id, mes_id, categoria_id, monto_mensual_cents')
        .eq('mes_id', filaMes.id)
        .returns<FilaLinea[]>(),
      db
        .from('asignaciones')
        .select('id, mes_id, linea_presupuesto_id, periodo_id, monto_cents')
        .eq('mes_id', filaMes.id)
        .returns<FilaAsignacion[]>(),
      db
        .from('deudas')
        .select(
          'id, nombre, saldo_inicial_cents, saldo_cents, pago_minimo_cents, tasa_interes, orden, es_enfoque, pagada_en',
        )
        .returns<FilaDeuda[]>(),
      db
        .from('fondos_reserva')
        .select('id, nombre, meta_cents, acumulado_cents, fecha_objetivo')
        .returns<FilaFondo[]>(),
    ])

  reventar('los usuarios del hogar', usuarios.error)
  reventar('los periodos', periodos.error)
  reventar('las categorías', categorias.error)
  reventar('las líneas del presupuesto', lineas.error)
  reventar('las asignaciones', asignaciones.error)
  reventar('las deudas', deudas.error)
  reventar('los fondos de reserva', fondos.error)

  // Los movimientos se piden aparte: dependen de los periodos del mes, que
  // hasta aquí no se conocían.
  const idsPeriodo = (periodos.data ?? []).map((p) => p.id)
  let movimientos: FilaTransaccion[] = []
  if (idsPeriodo.length > 0) {
    const respuesta = await db
      .from('transacciones')
      .select(
        'id, usuario_id, periodo_id, categoria_id, fecha, monto_cents, tipo, descripcion, comercio, estado',
      )
      .in('periodo_id', idsPeriodo)
      .order('fecha', { ascending: false })
      .returns<FilaTransaccion[]>()
    reventar('los movimientos', respuesta.error)
    movimientos = respuesta.data ?? []
  }

  const filas: FilasDelMes = {
    usuarios: usuarios.data ?? [],
    mes: filaMes,
    periodos: periodos.data ?? [],
    categorias: categorias.data ?? [],
    lineas: lineas.data ?? [],
    asignaciones: asignaciones.data ?? [],
    transacciones: movimientos,
    deudas: deudas.data ?? [],
    fondos: fondos.data ?? [],
    usuarioActual,
  }

  // El día de hoy entra desde afuera: `mapeo` es puro y no pregunta la hora.
  return aPresupuesto(filas, { hoy: hoy() })
}
