-- Restricciones del esquema: lo que la base rechaza por sí sola, sin confiar
-- en que el cliente se porte bien.
\set QUIET on
\pset tuples_only on

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into usuarios (id, correo, nombre)
  values ('11111111-1111-1111-1111-111111111111', 'a@b.com', 'Iván');

-- El disparador `al_crear_usuario` ya le creó su hogar. Se guarda aquí para no
-- repetir la consulta en cada caso.
create temporary table ctx as
  select hogar_id from miembros_hogar where usuario_id = '11111111-1111-1111-1111-111111111111';

insert into meses (id, hogar_id, anio, mes)
  select '33333333-3333-3333-3333-333333333333', hogar_id, 2026, 8 from ctx;
insert into meses (id, hogar_id, anio, mes)
  select '3333cccc-3333-3333-3333-333333333333', hogar_id, 2026, 9 from ctx;

-- Agosto: un cheque normal y uno extra. Septiembre: uno, para probar el cruce.
insert into periodos (id, hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago)
  select '44444444-4444-4444-4444-444444444444', hogar_id, '33333333-3333-3333-3333-333333333333',
         '11111111-1111-1111-1111-111111111111', 1, '2026-08-03', '2026-08-16', '2026-08-03' from ctx;
insert into periodos (id, hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, es_extra)
  select '4444eeee-4444-4444-4444-444444444444', hogar_id, '33333333-3333-3333-3333-333333333333',
         '11111111-1111-1111-1111-111111111111', 2, '2026-08-17', '2026-08-30', '2026-08-17', true from ctx;
insert into periodos (id, hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago)
  select '4444ffff-4444-4444-4444-444444444444', hogar_id, '3333cccc-3333-3333-3333-333333333333',
         '11111111-1111-1111-1111-111111111111', 1, '2026-09-14', '2026-09-27', '2026-09-14' from ctx;

insert into categorias (id, hogar_id, nombre, grupo, es_fija, dia_vencimiento)
  select '55555555-5555-5555-5555-555555555555', hogar_id, 'Renta', 'fijo', true, 3 from ctx;
insert into lineas_presupuesto (id, mes_id, categoria_id, monto_mensual_cents)
  values ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333',
          '55555555-5555-5555-5555-555555555555', 90000);

insert into envios_aviso (usuario_id, periodo_id, tipo, canal)
  values ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'arranque_periodo', 'correo');
insert into deudas (hogar_id, nombre, saldo_inicial_cents, saldo_cents, pago_minimo_cents, es_enfoque)
  select hogar_id, 'Capital One', 387500, 124000, 3500, true from ctx;

\o /dev/null
create or replace function probar(etiqueta text, sentencia text, espera text) returns text
language plpgsql as $$
begin
  execute sentencia;
  return case when espera='pasa' then '  ok   ' else '  FALLA' end || '  ' || etiqueta || ' -> aceptado';
exception when others then
  return case when espera='rechaza' then '  ok   ' else '  FALLA' end || '  ' || etiqueta
         || ' -> rechazado (' || left(SQLERRM, 88) || ')';
end $$;
\o

\echo ''
\echo '--- al registrarse ---'
select case when (select count(*) from miembros_hogar
                   where usuario_id = '11111111-1111-1111-1111-111111111111' and rol = 'titular') = 1
            then '  ok     se crea solo un hogar de un miembro'
            else '  FALLA  no se creó el hogar al registrarse' end;

\echo '--- categorías ---'
select probar('categoría fija sin día de vencimiento',
  $$insert into categorias (hogar_id,nombre,grupo,es_fija) select hogar_id,'Luz','fijo',true from ctx$$, 'rechaza');
select probar('categoría fija con día de vencimiento',
  $$insert into categorias (hogar_id,nombre,grupo,es_fija,dia_vencimiento) select hogar_id,'Luz','fijo',true,4 from ctx$$, 'pasa');

\echo '--- deudas ---'
select probar('segunda deuda de enfoque en el mismo hogar',
  $$insert into deudas (hogar_id,nombre,saldo_inicial_cents,saldo_cents,pago_minimo_cents,es_enfoque) select hogar_id,'Carro',1450000,890000,31000,true from ctx$$, 'rechaza');
select probar('segunda deuda sin enfoque',
  $$insert into deudas (hogar_id,nombre,saldo_inicial_cents,saldo_cents,pago_minimo_cents) select hogar_id,'Carro',1450000,890000,31000 from ctx$$, 'pasa');
select probar('saldo mayor que el saldo inicial',
  $$insert into deudas (hogar_id,nombre,saldo_inicial_cents,saldo_cents,pago_minimo_cents) select hogar_id,'Imposible',100,200,10 from ctx$$, 'rechaza');

\echo '--- frecuencia de pago ---'
select probar('dos_veces_al_mes con un solo día de pago',
  $$update usuarios set frecuencia_pago='dos_veces_al_mes', dias_pago='{15}' where correo='a@b.com'$$, 'rechaza');
select probar('dos_veces_al_mes con día 32',
  $$update usuarios set frecuencia_pago='dos_veces_al_mes', dias_pago='{15,32}' where correo='a@b.com'$$, 'rechaza');
select probar('dos_veces_al_mes con [15,31]',
  $$update usuarios set frecuencia_pago='dos_veces_al_mes', dias_pago='{15,31}' where correo='a@b.com'$$, 'pasa');
select probar('semanal sin días de pago',
  $$update usuarios set frecuencia_pago='semanal', dias_pago=null where correo='a@b.com'$$, 'pasa');

\echo '--- periodos ---'
select probar('periodo con fecha_pago fuera de su rango',
  $$insert into periodos (hogar_id,mes_id,usuario_id,numero,fecha_inicio,fecha_fin,fecha_pago)
    select hogar_id,'33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111',9,'2026-08-17','2026-08-30','2026-09-15' from ctx$$, 'rechaza');
select probar('el mismo número de periodo, mismo usuario, mismo mes',
  $$insert into periodos (hogar_id,mes_id,usuario_id,numero,fecha_inicio,fecha_fin,fecha_pago)
    select hogar_id,'33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111',1,'2026-08-17','2026-08-30','2026-08-17' from ctx$$, 'rechaza');
select probar('el mismo mes dos veces para un hogar',
  $$insert into meses (hogar_id,anio,mes) select hogar_id,2026,8 from ctx$$, 'rechaza');

\echo '--- asignaciones: la capa clave ---'
select probar('asignación normal',
  $$insert into asignaciones (mes_id,linea_presupuesto_id,periodo_id,monto_cents)
    values ('33333333-3333-3333-3333-333333333333','66666666-6666-6666-6666-666666666666','44444444-4444-4444-4444-444444444444',90000)$$, 'pasa');
select probar('asignación que cruza de mes (línea de agosto, periodo de septiembre)',
  $$insert into asignaciones (mes_id,linea_presupuesto_id,periodo_id,monto_cents)
    values ('33333333-3333-3333-3333-333333333333','66666666-6666-6666-6666-666666666666','4444ffff-4444-4444-4444-444444444444',1000)$$, 'rechaza');
select probar('asignación mintiendo el mes para colar el periodo ajeno',
  $$insert into asignaciones (mes_id,linea_presupuesto_id,periodo_id,monto_cents)
    values ('3333cccc-3333-3333-3333-333333333333','66666666-6666-6666-6666-666666666666','4444ffff-4444-4444-4444-444444444444',1000)$$, 'rechaza');
select probar('asignación contra el cheque extra',
  $$insert into asignaciones (mes_id,linea_presupuesto_id,periodo_id,monto_cents)
    values ('33333333-3333-3333-3333-333333333333','66666666-6666-6666-6666-666666666666','4444eeee-4444-4444-4444-444444444444',1000)$$, 'rechaza');
select probar('monto mensual negativo',
  $$insert into lineas_presupuesto (mes_id,categoria_id,monto_mensual_cents)
    values ('3333cccc-3333-3333-3333-333333333333','55555555-5555-5555-5555-555555555555',-100)$$, 'rechaza');

\echo '--- avisos ---'
select probar('aviso duplicado (usuario, periodo, tipo, canal)',
  $$insert into envios_aviso (usuario_id,periodo_id,tipo,canal) values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','arranque_periodo','correo')$$, 'rechaza');
select probar('el mismo aviso por otro canal',
  $$insert into envios_aviso (usuario_id,periodo_id,tipo,canal) values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','arranque_periodo','push')$$, 'pasa');

\echo '--- movimientos y cortesías ---'
select probar('transacción asignada sin categoría',
  $$insert into transacciones (hogar_id,fecha,monto_cents,tipo,estado) select hogar_id,'2026-08-04',6200,'gasto','asignada' from ctx$$, 'rechaza');
select probar('transacción pendiente sin categoría',
  $$insert into transacciones (hogar_id,fecha,monto_cents,tipo,estado) select hogar_id,'2026-08-04',6200,'gasto','pendiente' from ctx$$, 'pasa');
select probar('código de cortesía usado a medias',
  $$insert into codigos_cortesia (codigo,vence_en,usado_por) values ('COACH2026','2026-12-31','11111111-1111-1111-1111-111111111111')$$, 'rechaza');

rollback;
