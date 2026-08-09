/**
 * El sello que distingue a este cliente del anterior.
 *
 * El puente del esquema (`siembra_semanas`, migración 0006) siembra un plan
 * semanal proporcional cada vez que cambia un monto mensual, para que un
 * cliente que solo sabe de cheques no deje el eje semanal huérfano. Se retira
 * en la migración de contracción.
 *
 * Para saber **cuándo** retirarlo hace falta contar cuántas veces se usa de
 * verdad el camino viejo, y para eso el cliente nuevo tiene que anunciarse:
 * este objeto va en el payload de toda escritura de `lineas_presupuesto` que
 * venga seguida de su plan semanal. El cliente viejo no puede mandarlo —no
 * sabe que la columna existe—, así que la ausencia es la señal.
 *
 * En el servidor la columna es un buzón de un solo uso: un disparador la lee y
 * la deja en null, y un CHECK obliga a que siempre acabe así. Ver
 * `supabase/migraciones/0008_puente_instrumentado.sql`.
 *
 * Cuando `dias_sin_puente()` llegue a 14, se cae el puente y este archivo con
 * él.
 */
export const SELLO_DEL_EJE = { escrito_por: 'eje-semanal' } as const
