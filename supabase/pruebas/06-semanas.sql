-- ============================================================================
-- Semanas presupuestables — el calendario, el reparto exacto y el guardia.
--
-- Lo que se intenta romper aquí, a propósito:
--   · Que el reparto SQL y el de src/lib/dinero se separen en silencio: los
--     dos se fijan al mismo resultado con el mismo monto indivisible.
--   · Que un fijo vuelva a exigir reparto semanal, o que vuelva a entrar al
--     guardia (contarlo hacía incerrables meses sin remedio: la renta que
--     vence el 1 no se puede mover a otra semana).
--   · Que una semana fantasma (la 5 en un mes de 4) esconda dinero — aunque
--     las semanas válidas cuadren solas.
--   · Que el extra fondee los sobres: va completo al enfoque, no se reparte.
--   · Que el puente deje al cliente viejo con líneas huérfanas del eje nuevo.
-- ============================================================================
\set QUIET on
\pset tuples_only on

begin;

\set duena '''bbbbbbbb-0000-0000-0000-000000000001'''
\set ajena '''bbbbbbbb-0000-0000-0000-000000000002'''
\set mes1  '''b1111111-0000-0000-0000-000000000001'''
\set mes2  '''b2222222-0000-0000-0000-000000000001'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:duena, 'duena@semanas.com', '{"nombre":"Dueña"}'),
  (:ajena, 'ajena@semanas.com', '{"nombre":"Ajena"}');

create temporary table casa as
  select hogar_id from miembros_hogar where usuario_id = :duena;

\o /dev/null
create or replace function probar(etiqueta text, sentencia text, espera text) returns text
language plpgsql as $$
begin
  execute sentencia;
  return case when espera='pasa' then '  ok   ' else '  FALLA' end || '  ' || etiqueta || ' -> aceptado';
exception when others then
  return case when espera='rechaza' then '  ok   ' else '  FALLA' end || '  ' || etiqueta
         || ' -> rechazado (' || left(SQLERRM, 96) || ')';
end $$;
create or replace function probar_cierre(etiqueta text, objetivo uuid, espera text) returns text
language plpgsql as $$
begin
  perform cerrar_mes(objetivo);
  return case when espera='pasa' then '  ok   ' else '  FALLA' end || '  ' || etiqueta || ' -> cerró';
exception when others then
  return case when espera='rechaza' then '  ok   ' else '  FALLA' end || '  ' || etiqueta
         || ' -> rechazado (' || left(SQLERRM, 110) || ')';
end $$;
\o

\echo ''
\echo '--- el calendario, contado en días ---'
-- Truco: repartir tantos centavos como días tiene el mes le da a cada semana
-- exactamente sus días. Prueba el calendario y el reparto de un golpe.
select case when array_agg(monto_cents order by semana) = '{7,7,7,7,3}'::bigint[]
            then '  ok     agosto (31): cinco semanas de 7,7,7,7,3 días'
            else '  FALLA  agosto dio ' || array_agg(monto_cents order by semana)::text end
  from reparto_semanal(31, 2026, 8);
select case when array_agg(monto_cents order by semana) = '{7,7,7,7}'::bigint[]
            then '  ok     febrero de 28: cuatro semanas justas, la quinta no existe'
            else '  FALLA  febrero dio ' || array_agg(monto_cents order by semana)::text end
  from reparto_semanal(28, 2027, 2);
select case when array_agg(monto_cents order by semana) = '{7,7,7,7,1}'::bigint[]
            then '  ok     febrero de 29: la quinta semana es un solo día'
            else '  FALLA  bisiesto dio ' || array_agg(monto_cents order by semana)::text end
  from reparto_semanal(29, 2028, 2);
select case when array_agg(monto_cents order by semana) = '{7,7,7,7,2}'::bigint[]
            then '  ok     abril (30): la quinta mide dos días'
            else '  FALLA  abril dio ' || array_agg(monto_cents order by semana)::text end
  from reparto_semanal(30, 2026, 4);

\echo '--- el reparto: espejo exacto de src/lib/dinero ---'
-- $1,000.03 no es divisible ni entre 31 ni entre 28. Estos números están
-- fijados también en src/lib/dinero/dinero.test.ts: si un lado cambia de
-- método, el otro lo delata.
select case when array_agg(monto_cents order by semana) = '{22582,22581,22581,22581,9678}'::bigint[]
            then '  ok     100003 en agosto: mayor residuo, el pico se lleva su parte'
            else '  FALLA  dio ' || array_agg(monto_cents order by semana)::text end
  from reparto_semanal(100003, 2026, 8);
select case when array_agg(monto_cents order by semana) = '{25001,25001,25001,25000}'::bigint[]
            then '  ok     100003 en febrero: los empates los ganan las primeras'
            else '  FALLA  dio ' || array_agg(monto_cents order by semana)::text end
  from reparto_semanal(100003, 2027, 2);
select case when sum(monto_cents) = 100003
            then '  ok     y la suma da el monto exacto, sin perder un centavo'
            else '  FALLA  la suma dio ' || sum(monto_cents) end
  from reparto_semanal(100003, 2026, 8);

-- ---------------------------------------------------------------------------
-- Agosto 2026: cheque de 500.00 el día 6, de 1,500.00 el día 20, extra de
-- 500.00 el día 28. Renta fija el día 3 (500.00) — vence ANTES del primer
-- cheque, como en la vida real. Comida variable (600.00); diezmo (100.00).
-- ---------------------------------------------------------------------------
insert into meses (id, hogar_id, anio, mes) select :mes1, hogar_id, 2026, 8 from casa;
insert into periodos (id, hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, ingreso_esperado_cents)
  select 'b3333333-0000-0000-0000-000000000001', hogar_id, :mes1, :duena, 1, '2026-08-06','2026-08-19','2026-08-06', 50000 from casa;
insert into periodos (id, hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, ingreso_esperado_cents)
  select 'b3333333-0000-0000-0000-000000000002', hogar_id, :mes1, :duena, 2, '2026-08-20','2026-09-02','2026-08-20', 150000 from casa;
insert into periodos (id, hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, es_extra, ingreso_esperado_cents)
  select 'b3333333-0000-0000-0000-000000000003', hogar_id, :mes1, :duena, 3, '2026-08-28','2026-08-28','2026-08-28', true, 50000 from casa;

insert into categorias (id, hogar_id, nombre, grupo, es_fija, dia_vencimiento)
  select 'b4444444-0000-0000-0000-000000000001', hogar_id, 'Renta', 'fijo', true, 3 from casa;
insert into categorias (id, hogar_id, nombre, grupo)
  select 'b4444444-0000-0000-0000-000000000002', hogar_id, 'Comida', 'variable' from casa;
insert into categorias (id, hogar_id, nombre, grupo)
  select 'b4444444-0000-0000-0000-000000000003', hogar_id, 'Diezmo', 'mayordomia' from casa;

insert into lineas_presupuesto (id, mes_id, categoria_id, monto_mensual_cents) values
  ('b5555555-0000-0000-0000-000000000001', :mes1, 'b4444444-0000-0000-0000-000000000001', 50000),
  ('b5555555-0000-0000-0000-000000000002', :mes1, 'b4444444-0000-0000-0000-000000000002', 60000),
  ('b5555555-0000-0000-0000-000000000003', :mes1, 'b4444444-0000-0000-0000-000000000003', 10000);

\echo '--- el puente: el cliente viejo no deja huérfano el eje nuevo ---'
select case when count(*) = 5 and sum(monto_cents) = 60000
            then '  ok     la línea nueva nace con su plan semanal sembrado y cuadrado'
            else '  FALLA  comida: ' || count(*) || ' filas, suma ' || coalesce(sum(monto_cents), 0) end
  from asignaciones_semana where linea_presupuesto_id = 'b5555555-0000-0000-0000-000000000002';
select case when count(*) = 0
            then '  ok     la renta no: los fijos van por fecha, sin plan semanal'
            else '  FALLA  la renta tiene ' || count(*) || ' filas semanales' end
  from asignaciones_semana where linea_presupuesto_id = 'b5555555-0000-0000-0000-000000000001';
select case when count(*) = 0
            then '  ok     y nada queda descuadrado: septiembre nacería cerrable'
            else '  FALLA  descuadradas: ' || string_agg(categoria, ', ') end
  from lineas_descuadradas(:mes1);

\echo '--- la invariante: quién debe repartir y quién no ---'
select probar('meterle plan semanal a la renta',
  $$insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
    values ('b1111111-0000-0000-0000-000000000001', 'b5555555-0000-0000-0000-000000000001', 1, 50000)$$,
  'rechaza');

delete from asignaciones_semana where linea_presupuesto_id = 'b5555555-0000-0000-0000-000000000003';
select case when count(*) = 1 and min(categoria) = 'Diezmo'
            then '  ok     una línea repartible sin semanas sale descuadrada'
            else '  FALLA  descuadradas: ' || coalesce(string_agg(categoria, ', '), '(nada)') end
  from lineas_descuadradas(:mes1);
select probar_cierre('descuadrado, el mes no se cierra', :mes1, 'rechaza');
insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
  select :mes1, 'b5555555-0000-0000-0000-000000000003', semana, monto_cents
    from reparto_semanal(10000, 2026, 8) where monto_cents > 0;
select case when count(*) = 0
            then '  ok     cuadrada otra vez con el reparto del servidor'
            else '  FALLA  siguen descuadradas: ' || string_agg(categoria, ', ') end
  from lineas_descuadradas(:mes1);

\echo '--- el guardia: no prometas dinero antes de que entre ---'
-- La renta (500.00, día 3) vence antes del primer cheque (día 6). Si el
-- guardia la contara, la semana 1 quedaría sobregirada PARA SIEMPRE: un fijo
-- no se puede mover. Que esto salga vacío es la prueba de que el guardia
-- cuida solo lo repartible.
select case when count(*) = 0
            then '  ok     la renta que vence antes del primer cheque NO bloquea el mes'
            else '  FALLA  sobregiradas: ' || string_agg(semana::text, ', ') end
  from semanas_sobregiradas(:mes1);

-- Toda la comida a la semana 1: 600.00 más el diezmo de esa semana contra los
-- 500.00 del cheque del día 6. No alcanza, y la 2 tampoco: es acumulado.
delete from asignaciones_semana where linea_presupuesto_id = 'b5555555-0000-0000-0000-000000000002';
insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
  values (:mes1, 'b5555555-0000-0000-0000-000000000002', 1, 60000);
select case when min(semana) = 1 and count(*) = 2
            then '  ok     cargar la semana 1 la sobregira a ella y a la 2 (es acumulado)'
            else '  FALLA  devolvió ' || coalesce(string_agg(semana::text, ','), '(nada)') end
  from semanas_sobregiradas(:mes1);
select case when sobregiro_cents = 12258
            then '  ok     y dice por cuánto: 122.58 de más'
            else '  FALLA  sobregiro de ' || sobregiro_cents end
  from semanas_sobregiradas(:mes1) where semana = 1;
select probar_cierre('con una semana sobregirada, el mes no se cierra', :mes1, 'rechaza');

-- La semana 3 sí puede vivir del cheque del 20: llega antes de que termine.
update asignaciones_semana set semana = 3
 where linea_presupuesto_id = 'b5555555-0000-0000-0000-000000000002';
select case when count(*) = 0
            then '  ok     movida a la semana 3, el cheque del 20 la fondea'
            else '  FALLA  sobregiradas: ' || string_agg(semana::text, ', ') end
  from semanas_sobregiradas(:mes1);

-- El extra NO fondea lo repartible: va completo al enfoque (regla 2 de la
-- sección 6). Con el segundo cheque en 100.00, la semana 5 solo cuadraría si
-- el extra del 28 contara — y no cuenta.
update periodos set ingreso_esperado_cents = 10000
 where id = 'b3333333-0000-0000-0000-000000000002';
update asignaciones_semana set semana = 5
 where linea_presupuesto_id = 'b5555555-0000-0000-0000-000000000002';
select case when count(*) = 1 and min(semana) = 5
            then '  ok     el extra no fondea los sobres: va completo al enfoque'
            else '  FALLA  devolvió ' || coalesce(string_agg(semana::text, ','), '(nada)') end
  from semanas_sobregiradas(:mes1);
update periodos set ingreso_esperado_cents = 150000
 where id = 'b3333333-0000-0000-0000-000000000002';
select case when count(*) = 0
            then '  ok     con el cheque normal restaurado, la semana 5 cuadra'
            else '  FALLA  sobregiradas: ' || string_agg(semana::text, ', ') end
  from semanas_sobregiradas(:mes1);

-- Un cheque pagado ya en septiembre no fondea agosto, aunque sea del mes.
update periodos set fecha_inicio = '2026-09-05', fecha_fin = '2026-09-18', fecha_pago = '2026-09-05'
 where id = 'b3333333-0000-0000-0000-000000000002';
select case when count(*) = 1 and min(semana) = 5
            then '  ok     pagado el 5 de septiembre ya no: ese dinero no es de agosto'
            else '  FALLA  devolvió ' || coalesce(string_agg(semana::text, ','), '(nada)') end
  from semanas_sobregiradas(:mes1);
update periodos set fecha_inicio = '2026-08-20', fecha_fin = '2026-09-02', fecha_pago = '2026-08-20'
 where id = 'b3333333-0000-0000-0000-000000000002';

select probar_cierre('cuadrado y fondeado, el mes se cierra', :mes1, 'pasa');
select case when estado = 'cerrado' then '  ok     y quedó marcado como cerrado'
            else '  FALLA  estado ' || estado end
  from meses where id = :mes1;

\echo '--- el puente re-siembra cuando el monto cambia ---'
update lineas_presupuesto set monto_mensual_cents = 70003
 where id = 'b5555555-0000-0000-0000-000000000002';
select case when count(*) = 5 and sum(monto_cents) = 70003
            then '  ok     editar el monto re-siembra el plan semanal, exacto'
            else '  FALLA  ' || count(*) || ' filas, suma ' || coalesce(sum(monto_cents), 0) end
  from asignaciones_semana where linea_presupuesto_id = 'b5555555-0000-0000-0000-000000000002';
update lineas_presupuesto set monto_mensual_cents = 60000
 where id = 'b5555555-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------------
-- Febrero 2027: cuatro semanas. La fantasma, y el fijo sin un solo cheque.
-- ---------------------------------------------------------------------------
insert into meses (id, hogar_id, anio, mes) select :mes2, hogar_id, 2027, 2 from casa;
insert into categorias (id, hogar_id, nombre, grupo, es_fija, dia_vencimiento)
  select 'b4444444-0000-0000-0000-000000000005', hogar_id, 'Seguro', 'fijo', true, 31 from casa;
insert into lineas_presupuesto (id, mes_id, categoria_id, monto_mensual_cents) values
  ('b5555555-0000-0000-0000-000000000005', :mes2, 'b4444444-0000-0000-0000-000000000005', 12345);

\echo '--- la semana fantasma y el fijo sin cheques ---'
-- Un seguro que "vence el 31" en un mes de 28 días y sin un solo cheque: si
-- el guardia contara los fijos, este mes sería incerrable sin remedio.
select case when count(*) = 0
            then '  ok     el seguro del 31 sin ningún cheque no vuelve el mes incerrable'
            else '  FALLA  sobregiradas: ' || string_agg(semana::text, ', ') end
  from semanas_sobregiradas(:mes2);

insert into categorias (id, hogar_id, nombre, grupo)
  select 'b4444444-0000-0000-0000-000000000004', hogar_id, 'Ropa', 'variable' from casa;
insert into lineas_presupuesto (id, mes_id, categoria_id, monto_mensual_cents) values
  ('b5555555-0000-0000-0000-000000000004', :mes2, 'b4444444-0000-0000-0000-000000000004', 70000);

select probar('una fila en la semana 5 de un mes de 4',
  $$insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
    values ('b2222222-0000-0000-0000-000000000001', 'b5555555-0000-0000-0000-000000000004', 5, 5000)$$,
  'rechaza');

-- El cinturón: si una fila fantasma se coló ANTES del disparador (0005 corrió
-- antes que 0006), la línea sale descuadrada aunque sus semanas válidas
-- cuadren solas. Se planta desactivando el disparador, como habría quedado
-- plantada en ese entonces.
alter table asignaciones_semana disable trigger semana_valida_y_repartible;
insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
  values (:mes2, 'b5555555-0000-0000-0000-000000000004', 5, 5000);
alter table asignaciones_semana enable trigger semana_valida_y_repartible;
select case when count(*) = 1 and min(asignado_cents) = 70000
            then '  ok     la fantasma ya no esconde dinero: descuadra aunque lo válido cuadre'
            else '  FALLA  descuadradas de Ropa: ' || count(*) end
  from lineas_descuadradas(:mes2) where categoria = 'Ropa';
delete from asignaciones_semana
 where linea_presupuesto_id = 'b5555555-0000-0000-0000-000000000004' and semana = 5;

\echo '--- la tabla nueva aísla el hogar, como todas ---'
delete from asignaciones_semana
 where linea_presupuesto_id = 'b5555555-0000-0000-0000-000000000004' and semana = 4;
set local role authenticated;
\o /dev/null
select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002')::text, true);
\o
select case when count(*) = 0
            then '  ok     la persona de otro hogar no ve ni una semana ajena'
            else '  FALLA  ve ' || count(*) || ' filas' end
  from asignaciones_semana;
select probar('meterse al plan semanal del hogar ajeno',
  $$insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
    values ('b2222222-0000-0000-0000-000000000001', 'b5555555-0000-0000-0000-000000000004', 4, 17500)$$,
  'rechaza');
\o /dev/null
select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000001')::text, true);
\o
select probar('la dueña sí escribe en su plan',
  $$insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
    values ('b2222222-0000-0000-0000-000000000001', 'b5555555-0000-0000-0000-000000000004', 4, 17500)$$,
  'pasa');
reset role;

rollback;
