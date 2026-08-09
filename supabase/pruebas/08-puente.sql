-- ============================================================================
-- El puente instrumentado — que el día de la contracción lo decida un número.
--
-- Lo que se intenta romper aquí, a propósito:
--   · Que el cliente NUEVO cuente como viejo: el contador nunca bajaría a
--     cero y el puente se quedaría para siempre. Es el error barato.
--   · Que el cliente VIEJO cuente como nuevo: el contador llegaría a cero
--     antes de tiempo y la contracción le rompería el mes a alguien. Es el
--     error caro, y el que el buzón de un solo uso existe para evitar.
--   · Que el buzón se quede escrito: una línea marcada para siempre haría
--     pasar por nuevas todas sus ediciones posteriores.
--   · Que se cuente lo que el puente no sembró: un monto que no cambió, un
--     fijo. Contar de más retrasa la contracción sin motivo.
--   · Que `dias_sin_puente()` mienta antes de que exista un solo uso.
-- ============================================================================
\set QUIET on
\pset tuples_only on

begin;

\set duena '''cccccccc-0000-0000-0000-000000000001'''
\set mes   '''c1111111-0000-0000-0000-000000000001'''
\set fija  '''c4444444-0000-0000-0000-000000000001'''
\set vari  '''c4444444-0000-0000-0000-000000000002'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:duena, 'duena@puente.com', '{"nombre":"Dueña"}');

create temporary table casa as
  select hogar_id from miembros_hogar where usuario_id = :duena;

insert into meses (id, hogar_id, anio, mes) select :mes, hogar_id, 2026, 8 from casa;
insert into categorias (id, hogar_id, nombre, grupo, es_fija, dia_vencimiento)
  select :fija, hogar_id, 'Renta', 'fijo', true, 3 from casa;
insert into categorias (id, hogar_id, nombre, grupo)
  select :vari, hogar_id, 'Comida', 'variable' from casa;

-- El contador arranca en cero y con su día cero puesto por la migración.
\echo ''
\echo '--- antes de nada ---'
select case when (select coalesce(sum(veces), 0) from uso_del_puente) = 0
            then '  ok     el contador arranca en cero'
            else '  FALLA  arrancó en ' || (select sum(veces) from uso_del_puente) end;
select case when dias_sin_puente() = 0
            then '  ok     y dias_sin_puente() cuenta desde hoy, no desde 1970'
            else '  FALLA  dias_sin_puente() dio ' || dias_sin_puente() end;

\echo '--- el cliente viejo: no sabe de la columna, y se le nota ---'
insert into lineas_presupuesto (id, mes_id, categoria_id, monto_mensual_cents) values
  ('c5555555-0000-0000-0000-000000000002', :mes, :vari, 60000);
select case when (select coalesce(sum(veces), 0) from uso_del_puente) = 1
            then '  ok     sembrar una línea por el camino viejo cuenta una vez'
            else '  FALLA  el contador va en ' || (select sum(veces) from uso_del_puente) end;
select case when count(*) = 5 and sum(monto_cents) = 60000
            then '  ok     y el puente hizo su trabajo: cinco semanas, cuadradas'
            else '  FALLA  ' || count(*) || ' filas, suma ' || coalesce(sum(monto_cents), 0) end
  from asignaciones_semana where linea_presupuesto_id = 'c5555555-0000-0000-0000-000000000002';

\echo '--- el cliente nuevo: se anuncia, y no cuenta ---'
update lineas_presupuesto set monto_mensual_cents = 70000, escrito_por = 'eje-semanal'
 where id = 'c5555555-0000-0000-0000-000000000002';
select case when (select coalesce(sum(veces), 0) from uso_del_puente) = 1
            then '  ok     una escritura anunciada no sube el contador'
            else '  FALLA  el contador va en ' || (select sum(veces) from uso_del_puente) end;

\echo '--- el buzón se vacía: sin esto, el contador mentiría hacia abajo ---'
select case when (select escrito_por from lineas_presupuesto
                   where id = 'c5555555-0000-0000-0000-000000000002') is null
            then '  ok     la columna quedó en null después de leerse'
            else '  FALLA  se quedó escrita: '
                 || (select escrito_por from lineas_presupuesto
                      where id = 'c5555555-0000-0000-0000-000000000002') end;
-- Y la de verdad: la MISMA línea, editada ahora por el cliente viejo. Si el
-- sello hubiera sobrevivido, esto pasaría por nuevo y no contaría.
update lineas_presupuesto set monto_mensual_cents = 80000
 where id = 'c5555555-0000-0000-0000-000000000002';
select case when (select coalesce(sum(veces), 0) from uso_del_puente) = 2
            then '  ok     una línea que ya usó el cliente nuevo vuelve a contar si la toca el viejo'
            else '  FALLA  el contador va en ' || (select sum(veces) from uso_del_puente) end;

\echo '--- lo que el puente no siembra, no cuenta ---'
update lineas_presupuesto set monto_mensual_cents = 80000
 where id = 'c5555555-0000-0000-0000-000000000002';
select case when (select coalesce(sum(veces), 0) from uso_del_puente) = 2
            then '  ok     un monto que no cambió no usa el puente'
            else '  FALLA  el contador va en ' || (select sum(veces) from uso_del_puente) end;
insert into lineas_presupuesto (id, mes_id, categoria_id, monto_mensual_cents) values
  ('c5555555-0000-0000-0000-000000000001', :mes, :fija, 50000);
select case when (select coalesce(sum(veces), 0) from uso_del_puente) = 2
            then '  ok     un fijo tampoco: su semana la decide su fecha de vencimiento'
            else '  FALLA  el contador va en ' || (select sum(veces) from uso_del_puente) end;

\echo '--- el buzón no guarda: el CHECK lo exige ---'
-- Un valor cualquiera se lee igual (no es 'eje-semanal' → cuenta como viejo) y
-- se borra igual. Lo que no puede pasar es que se quede.
update lineas_presupuesto set monto_mensual_cents = 90000, escrito_por = 'lo-que-sea'
 where id = 'c5555555-0000-0000-0000-000000000002';
select case when (select escrito_por from lineas_presupuesto
                   where id = 'c5555555-0000-0000-0000-000000000002') is null
            and (select coalesce(sum(veces), 0) from uso_del_puente) = 3
            then '  ok     un sello desconocido se borra y cuenta como viejo'
            else '  FALLA  quedó "'
                 || coalesce((select escrito_por from lineas_presupuesto
                               where id = 'c5555555-0000-0000-0000-000000000002'), '(null)')
                 || '" y el contador en ' || (select sum(veces) from uso_del_puente) end;

\echo '--- la condición de la contracción ---'
select case when dias_sin_puente() = 0
            then '  ok     con uso de hoy, van cero días seguidos en cero'
            else '  FALLA  dias_sin_puente() dio ' || dias_sin_puente() end;
-- Se envejece el registro a mano: catorce días desde el último uso.
update uso_del_puente set dia = dia - 14 where veces > 0;
select case when dias_sin_puente() = 14
            then '  ok     catorce días sin usarlo: el puente se cae'
            else '  FALLA  dias_sin_puente() dio ' || dias_sin_puente() end;

\echo '--- nadie lee ni escribe el conteo desde la app ---'
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-0000-0000-0000-000000000001')::text, true);
select case when count(*) = 0
            then '  ok     authenticated no ve ni una fila del conteo'
            else '  FALLA  ve ' || count(*) || ' fila(s)' end
  from uso_del_puente;
reset role;

rollback;
