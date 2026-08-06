/**
 * Los tipos de fila, espejo de `supabase/migraciones/0001_esquema.sql`.
 *
 * Se escriben a mano mientras no exista el proyecto de Supabase. Cuando
 * exista, se cambian por lo que genere `supabase gen types typescript` y este
 * archivo desaparece — por eso nada más del código depende de él directamente:
 * todo pasa por `mapeo.ts`.
 *
 * El dinero llega como `number`. Postgres lo guarda en `bigint` y PostgREST lo
 * entrega como número de JavaScript; son centavos enteros y caben de sobra en
 * el entero seguro. `mapeo.ts` los pasa por `centavos()`, que revienta si
 * alguno llegara con decimales.
 */

export type NivelUsuario = 'gratis' | 'premium'
export type FrecuenciaPagoFila =
  | 'semanal'
  | 'cada_dos_semanas'
  | 'dos_veces_al_mes'
  | 'mensual'
  | 'variable'
export type EstadoMes = 'borrador' | 'activo' | 'cerrado'
export type EstadoPeriodo = 'futuro' | 'activo' | 'cerrado'
export type GrupoCategoria = 'mayordomia' | 'fijo' | 'variable' | 'deuda' | 'fondo'
export type TipoTransaccion = 'gasto' | 'ingreso'
export type EstadoTransaccion = 'pendiente' | 'asignada'
export type RolHogar = 'titular' | 'pareja'

export interface FilaUsuario {
  id: string
  correo: string
  nombre: string | null
  zona_horaria: string
  nivel: NivelUsuario
  nivel_vence_en: string | null
  frecuencia_pago: FrecuenciaPagoFila | null
  fecha_ancla: string | null
  dias_pago: number[] | null
  ingreso_esperado_cents: number | null
  onboarding_terminado_en: string | null
}

export interface FilaMes {
  id: string
  hogar_id: string
  anio: number
  mes: number
  estado: EstadoMes
  cerrado_en: string | null
}

export interface FilaPeriodo {
  id: string
  mes_id: string
  /** De quién es el cheque. En modo pareja hay dos juegos por mes. */
  usuario_id: string
  numero: number
  fecha_inicio: string
  fecha_fin: string
  fecha_pago: string
  ingreso_esperado_cents: number | null
  ingreso_real_cents: number | null
  es_extra: boolean
  estado: EstadoPeriodo
}

export interface FilaCategoria {
  id: string
  nombre: string
  grupo: GrupoCategoria
  orden: number
  activa: boolean
  es_fija: boolean
  dia_vencimiento: number | null
  /** Solo en grupo `deuda`: qué deuda paga esta línea. Amarrada por llave. */
  deuda_id: string | null
}

export interface FilaLinea {
  id: string
  mes_id: string
  categoria_id: string
  monto_mensual_cents: number
}

export interface FilaAsignacion {
  id: string
  mes_id: string
  linea_presupuesto_id: string
  periodo_id: string
  monto_cents: number
}

export interface FilaTransaccion {
  id: string
  usuario_id: string | null
  periodo_id: string | null
  categoria_id: string | null
  fecha: string
  monto_cents: number
  tipo: TipoTransaccion
  descripcion: string | null
  comercio: string | null
  estado: EstadoTransaccion
}

export interface FilaDeuda {
  id: string
  nombre: string
  saldo_inicial_cents: number
  saldo_cents: number
  pago_minimo_cents: number
  tasa_interes: number | null
  orden: number
  es_enfoque: boolean
  pagada_en: string | null
}

export interface FilaFondo {
  id: string
  nombre: string
  meta_cents: number
  acumulado_cents: number
  fecha_objetivo: string | null
}

/** Lo que devuelve `lineas_descuadradas(mes_id)`. */
export interface FilaDescuadre {
  linea_presupuesto_id: string
  categoria: string
  monto_mensual_cents: number
  asignado_cents: number
  faltante_cents: number
}

/** Todo lo que hace falta para armar un mes. Una consulta por tabla. */
export interface FilasDelMes {
  usuarios: FilaUsuario[]
  mes: FilaMes
  periodos: FilaPeriodo[]
  categorias: FilaCategoria[]
  lineas: FilaLinea[]
  asignaciones: FilaAsignacion[]
  transacciones: FilaTransaccion[]
  deudas: FilaDeuda[]
  fondos: FilaFondo[]
  /** Quién abrió la sesión: de ahí sale el saludo. */
  usuarioActual: string
}
