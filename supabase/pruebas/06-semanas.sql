-- ============================================================================
-- Semanas presupuestables — el calendario, el reparto exacto y el guardia.
--
-- Lo que se intenta romper aquí, a propósito:
--   · Que el reparto SQL y el de src/lib/dinero se separen en silencio: los
--     dos se fijan al mismo resultado con el mismo monto indivisible.
--   · Que un fijo vuelva a exigir reparto semanal (regresión al eje viejo).
--   · Que una semana fantasma (la 5 en un mes de 4) esconda dinero.
--   · Que el guardia deje prometer dinero antes de que entre, o que cuente
--     un cheque que llega después de que el mes termine.
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
-- Agosto 2026: cheques el 6 y el 20 (1000.00 cada uno) y un extra el 28.
-- Renta fija el día 3 (500.00); comida variable (600.00); diezmo (100.00).
-- ---------------------------------------------------------------------------
insert into meses (id, hogar_id, anio, mes) select :mes1, hogar_id, 2026, 8 from casa;
insert into periodos (id, hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, ingreso_esperado_cents)
  select 'b3333333-0000-0000-0000-000000000001', hogar_id, :mes1, :duena, 1, '2026-08-06','2026-08-19','2026-08-06', 100000 from casa;
insert into periodos (id, hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, ingreso_esperado_cents)
  select 'b3333333-0000-0000-0000-000000000002', hogar_id, :mes1, :duena, 2, '2026-08-20','2026-09-02','2026-08-20', 100000 from casa;
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

\echo '--- la invariante: quién debe repartir y quién no ---'
select case when count(*) = 2
             and bool_and(categoria in ('Comida', 'Diezmo'))
            then '  ok     lo variable y la mayordomía sin semanas salen descuadrados'
            else '  FALLA  descuadradas: ' || coalesce(string_agg(categoria, ', '), '(nada)') end
  from lineas_descuadradas(:mes1);
select case when count(*) = 0
            then '  ok     la renta NO: los fijos van por fecha, no se reparten a mano'
            else '  FALLA  un fijo volvió a exigir reparto semanal' end
  from lineas_descuadradas(:mes1) where categoria = 'Renta';

select probar_cierre('descuadrado, el mes no se cierra', :mes1, 'rechaza');

-- Se cuadran con el mismo reparto del servidor.
insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
  select :mes1, 'b5555555-0000-0000-0000-000000000002', semana, monto_cents
    from reparto_semanal(60000, 2026, 8) where monto_cents > 0;
insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
  select :mes1, 'b5555555-0000-0000-0000-000000000003', semana, monto_cents
    from reparto_semanal(10000, 2026, 8) where monto_cents > 0;

select case when count(*) = 0
            then '  ok     cuadradas con el reparto del servidor, nada descuadrado'
            else '  FALLA  siguen descuadradas: ' || string_agg(categoria, ', ') end
  from lineas_descuadradas(:mes1);

\echo '--- el guardia: no prometas dinero antes de que entre ---'
select case when count(*) = 0
            then '  ok     el reparto proporcional respeta lo que va entrando'
            else '  FALLA  sobregiradas: ' || string_agg(semana::text, ', ') end
  from semanas_sobregiradas(:mes1);

-- Toda la comida a la semana 1: 500 de renta + 600 de comida + el diezmo de
-- esa semana contra los 1000 del cheque del día 6. No alcanza.
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

-- El extra cuenta como entrada — el guardia protege el cuándo, no el destino.
-- Con el segundo cheque en 100.00, la semana 5 solo cuadra si el extra del 28
-- fondea. Y si el extra se paga ya en septiembre, deja de fondear agosto.
update periodos set ingreso_esperado_cents = 10000
 where id = 'b3333333-0000-0000-0000-000000000002';
update asignaciones_semana set semana = 5
 where linea_presupuesto_id = 'b5555555-0000-0000-0000-000000000002';
select case when count(*) = 0
            then '  ok     el extra del 28 sí fondea la semana 5'
            else '  FALLA  sobregiradas: ' || string_agg(semana::text, ', ') end
  from semanas_sobregiradas(:mes1);
update periodos set fecha_inicio = '2026-09-05', fecha_fin = '2026-09-05', fecha_pago = '2026-09-05'
 where id = 'b3333333-0000-0000-0000-000000000003';
select case when count(*) = 1 and min(semana) = 5
            then '  ok     pagado el 5 de septiembre ya no: ese dinero no es de agosto'
            else '  FALLA  devolvió ' || coalesce(string_agg(semana::text, ','), '(nada)') end
  from semanas_sobregiradas(:mes1);
update periodos set fecha_inicio = '2026-08-28', fecha_fin = '2026-08-28', fecha_pago = '2026-08-28'
 where id = 'b3333333-0000-0000-0000-000000000003';

select probar_cierre('cuadrado y fondeado, el mes se cierra', :mes1, 'pasa');
select case when estado = 'cerrado' then '  ok     y quedó marcado como cerrado'
            else '  FALLA  estado ' || estado end
  from meses where id = :mes1;

-- ---------------------------------------------------------------------------
-- Febrero 2027: cuatro semanas. La fantasma y el día que no existe.
-- ---------------------------------------------------------------------------
insert into meses (id, hogar_id, anio, mes) select :mes2, hogar_id, 2027, 2 from casa;
insert into categorias (id, hogar_id, nombre, grupo)
  select 'b4444444-0000-0000-0000-000000000004', hogar_id, 'Ropa', 'variable' from casa;
insert into categorias (id, hogar_id, nombre, grupo, es_fija, dia_vencimiento)
  select 'b4444444-0000-0000-0000-000000000005', hogar_id, 'Seguro', 'fijo', true, 31 from casa;
insert into lineas_presupuesto (id, mes_id, categoria_id, monto_mensual_cents) values
  ('b5555555-0000-0000-0000-000000000004', :mes2, 'b4444444-0000-0000-0000-000000000004', 70000),
  ('b5555555-0000-0000-0000-000000000005', :mes2, 'b4444444-0000-0000-0000-000000000005', 12345);

\echo '--- la semana fantasma y el día que el mes no tiene ---'
-- Todo el dinero de Ropa en la semana 5 de un mes de 4: la suma bruta
-- cuadraría, pero esa semana no existe y no cuenta.
insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
  values (:mes2, 'b5555555-0000-0000-0000-000000000004', 5, 70000);
select case when count(*) = 1 and min(asignado_cents) = 0
            then '  ok     la semana 5 de febrero no existe: la línea sale descuadrada'
            else '  FALLA  la semana fantasma escondió el dinero' end
  from lineas_descuadradas(:mes2) where categoria = 'Ropa';

-- El seguro vence "el 31" en un mes de 28: cuenta en la semana 4, no truena
-- ni desaparece. Sin ingresos en el mes, la única sobregirada es la 4.
select case when count(*) = 1 and min(semana) = 4
            then '  ok     el día 31 en febrero se recorta al 28: pesa en la semana 4'
            else '  FALLA  devolvió ' || coalesce(string_agg(semana::text, ','), '(nada)') end
  from semanas_sobregiradas(:mes2);

\echo '--- la tabla nueva aísla el hogar, como todas ---'
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
    values ('b2222222-0000-0000-0000-000000000001', 'b5555555-0000-0000-0000-000000000004', 1, 1)$$,
  'rechaza');
\o /dev/null
select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000001')::text, true);
\o
select probar('la dueña sí escribe en su plan',
  $$insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
    values ('b2222222-0000-0000-0000-000000000001', 'b5555555-0000-0000-0000-000000000004', 1, 1)$$,
  'pasa');
reset role;

rollback;
