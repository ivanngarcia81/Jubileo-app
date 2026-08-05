\set QUIET on
\pset tuples_only on
begin;
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into usuarios (id, correo) values ('11111111-1111-1111-1111-111111111111','a@b.com');
insert into hogares (id, nombre) values ('22222222-2222-2222-2222-222222222222','Casa');
insert into meses (id,hogar_id,anio,mes) values ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222',2026,8);
insert into periodos (id,hogar_id,mes_id,numero,fecha_inicio,fecha_fin,fecha_pago) values ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333',1,'2026-08-03','2026-08-16','2026-08-03');
insert into envios_aviso (usuario_id,periodo_id,tipo,canal) values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','arranque_periodo','correo');
insert into deudas (hogar_id,nombre,saldo_cents,pago_minimo_cents,es_enfoque) values ('22222222-2222-2222-2222-222222222222','Capital One',124000,3500,true);

\o /dev/null
create or replace function probar(etiqueta text, sentencia text, espera text) returns text
language plpgsql as $$
begin
  execute sentencia;
  return case when espera='pasa' then '  ok   ' else '  FALLA' end || '  ' || etiqueta || ' -> aceptado';
exception when others then
  return case when espera='rechaza' then '  ok   ' else '  FALLA' end || '  ' || etiqueta || ' -> rechazado (' || SQLERRM || ')';
end $$;
\o

select probar('categoria fija sin dia de vencimiento',
  $$insert into categorias (hogar_id,nombre,grupo,es_fija) values ('22222222-2222-2222-2222-222222222222','Renta','fijo',true)$$, 'rechaza');
select probar('categoria fija con dia de vencimiento',
  $$insert into categorias (hogar_id,nombre,grupo,es_fija,dia_vencimiento) values ('22222222-2222-2222-2222-222222222222','Renta','fijo',true,3)$$, 'pasa');
select probar('segunda deuda de enfoque en el mismo hogar',
  $$insert into deudas (hogar_id,nombre,saldo_cents,pago_minimo_cents,es_enfoque) values ('22222222-2222-2222-2222-222222222222','Carro',890000,31000,true)$$, 'rechaza');
select probar('segunda deuda sin enfoque',
  $$insert into deudas (hogar_id,nombre,saldo_cents,pago_minimo_cents) values ('22222222-2222-2222-2222-222222222222','Carro',890000,31000)$$, 'pasa');
select probar('dos_veces_al_mes con un solo dia de pago',
  $$update usuarios set frecuencia_pago='dos_veces_al_mes', dias_pago='{15}' where correo='a@b.com'$$, 'rechaza');
select probar('dos_veces_al_mes con dia 32',
  $$update usuarios set frecuencia_pago='dos_veces_al_mes', dias_pago='{15,32}' where correo='a@b.com'$$, 'rechaza');
select probar('dos_veces_al_mes con [15,31]',
  $$update usuarios set frecuencia_pago='dos_veces_al_mes', dias_pago='{15,31}' where correo='a@b.com'$$, 'pasa');
select probar('semanal sin dias de pago',
  $$update usuarios set frecuencia_pago='semanal', dias_pago=null where correo='a@b.com'$$, 'pasa');
select probar('periodo con fecha_pago fuera de su rango',
  $$insert into periodos (hogar_id,mes_id,numero,fecha_inicio,fecha_fin,fecha_pago) values ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333',2,'2026-08-17','2026-08-30','2026-09-15')$$, 'rechaza');
select probar('el mismo mes dos veces para un hogar',
  $$insert into meses (hogar_id,anio,mes) values ('22222222-2222-2222-2222-222222222222',2026,8)$$, 'rechaza');
select probar('el mismo numero de periodo dos veces en un mes',
  $$insert into periodos (hogar_id,mes_id,numero,fecha_inicio,fecha_fin,fecha_pago) values ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333',1,'2026-08-17','2026-08-30','2026-08-17')$$, 'rechaza');
select probar('aviso duplicado (usuario, periodo, tipo, canal)',
  $$insert into envios_aviso (usuario_id,periodo_id,tipo,canal) values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','arranque_periodo','correo')$$, 'rechaza');
select probar('aviso del mismo periodo por otro canal',
  $$insert into envios_aviso (usuario_id,periodo_id,tipo,canal) values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','arranque_periodo','push')$$, 'pasa');
select probar('transaccion asignada sin categoria',
  $$insert into transacciones (hogar_id,fecha,monto_cents,tipo,estado) values ('22222222-2222-2222-2222-222222222222','2026-08-04',6200,'gasto','asignada')$$, 'rechaza');
select probar('transaccion pendiente sin categoria',
  $$insert into transacciones (hogar_id,fecha,monto_cents,tipo,estado) values ('22222222-2222-2222-2222-222222222222','2026-08-04',6200,'gasto','pendiente')$$, 'pasa');
select probar('monto mensual negativo',
  $$insert into lineas_presupuesto (mes_id,categoria_id,monto_mensual_cents) select '33333333-3333-3333-3333-333333333333', gen_random_uuid(), -100$$, 'rechaza');
select probar('codigo de cortesia usado a medias',
  $$insert into codigos_cortesia (codigo,vence_en,usado_por) values ('COACH2026','2026-12-31','11111111-1111-1111-1111-111111111111')$$, 'rechaza');
rollback;
