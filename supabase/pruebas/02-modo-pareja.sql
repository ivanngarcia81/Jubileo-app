-- ============================================================================
-- Modo pareja — la prueba que justifica cómo están puestas las llaves.
--
-- El modo pareja es fase 4, pero el SPEC pide diseñar las llaves con eso en
-- mente desde el día uno. Esta prueba comprueba hoy lo que la fase 4 va a
-- necesitar, para no descubrir en un año que hay que migrar:
--
--   · Dos personas de un hogar cobran con frecuencias distintas — Iván cada
--     dos semanas, Rosa los días 1 y 15 — y sus dos juegos de periodos
--     conviven en el mismo mes.
--   · Los dos tienen un "cheque 1" y no chocan.
--   · Una misma línea del presupuesto se reparte entre los cheques de ambos.
--   · La invariante cuadra sobre el total, sin importar de quién sea cada
--     cheque, y `cerrar_mes` acepta.
--   · Si se descuadra, `cerrar_mes` rechaza.
-- ============================================================================
\set QUIET on
\pset tuples_only on

begin;

\set ivan  '''aaaaaaaa-0000-0000-0000-000000000001'''
\set rosa  '''aaaaaaaa-0000-0000-0000-000000000002'''

-- Los dos se registran; el perfil y el hogar de cada quien aparecen solos.
insert into auth.users (id, email, raw_user_meta_data) values
  (:ivan, 'ivan@casa.com', '{"nombre":"Iván"}'),
  (:rosa, 'rosa@casa.com', '{"nombre":"Rosa"}');

-- Y cada quien configura cómo le pagan. Iván cada dos semanas, Rosa los 1 y 15.
update usuarios set frecuencia_pago = 'cada_dos_semanas', fecha_ancla = '2026-08-03',
                    ingreso_esperado_cents = 124000 where id = :ivan;
update usuarios set frecuencia_pago = 'dos_veces_al_mes', fecha_ancla = '2026-08-01',
                    dias_pago = '{1,15}', ingreso_esperado_cents = 90000 where id = :rosa;

-- Cada quien estrenó su hogar al registrarse. En modo pareja, Rosa se muda al
-- de Iván: el presupuesto es uno solo.
create temporary table casa as select hogar_id from miembros_hogar where usuario_id = :ivan;
delete from miembros_hogar where usuario_id = :rosa;
insert into miembros_hogar (hogar_id, usuario_id, rol) select hogar_id, :rosa, 'pareja' from casa;

insert into meses (id, hogar_id, anio, mes)
  select '77777777-0000-0000-0000-000000000001', hogar_id, 2026, 8 from casa;

-- Los cheques de Iván en agosto: 3 y 17, más el extra del 31.
insert into periodos (hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, es_extra, ingreso_esperado_cents)
  select hogar_id, '77777777-0000-0000-0000-000000000001', :ivan, 1, '2026-08-03','2026-08-16','2026-08-03', false, 124000 from casa;
insert into periodos (hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, es_extra, ingreso_esperado_cents)
  select hogar_id, '77777777-0000-0000-0000-000000000001', :ivan, 2, '2026-08-17','2026-08-30','2026-08-17', false, 124000 from casa;
insert into periodos (hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, es_extra, ingreso_esperado_cents)
  select hogar_id, '77777777-0000-0000-0000-000000000001', :ivan, 3, '2026-08-31','2026-09-13','2026-08-31', true, 124000 from casa;

-- Los de Rosa: 1 y 15. Su "cheque 1" convive con el de Iván.
insert into periodos (hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, ingreso_esperado_cents)
  select hogar_id, '77777777-0000-0000-0000-000000000001', :rosa, 1, '2026-08-01','2026-08-14','2026-08-01', 90000 from casa;
insert into periodos (hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago, ingreso_esperado_cents)
  select hogar_id, '77777777-0000-0000-0000-000000000001', :rosa, 2, '2026-08-15','2026-08-31','2026-08-15', 90000 from casa;

\echo ''
\echo '--- dos frecuencias en un mes ---'
select case when count(*) = 5 then '  ok     conviven los 5 periodos del mes (3 de Iván, 2 de Rosa)'
            else '  FALLA  se esperaban 5 periodos, hay ' || count(*) end
  from periodos where mes_id = '77777777-0000-0000-0000-000000000001';

select case when count(*) = 2 then '  ok     los dos tienen su "cheque 1" y no chocan'
            else '  FALLA  se esperaban 2 periodos número 1, hay ' || count(*) end
  from periodos where mes_id = '77777777-0000-0000-0000-000000000001' and numero = 1;

select case when count(*) = 1 then '  ok     solo el tercer cheque de Iván es extra'
            else '  FALLA  cheques extra: ' || count(*) end
  from periodos where mes_id = '77777777-0000-0000-0000-000000000001' and es_extra;

-- Una línea del presupuesto, repartida entre los cheques de los dos.
insert into categorias (id, hogar_id, nombre, grupo, es_fija, dia_vencimiento)
  select '88888888-0000-0000-0000-000000000001', hogar_id, 'Renta', 'fijo', true, 3 from casa;
insert into categorias (id, hogar_id, nombre, grupo)
  select '88888888-0000-0000-0000-000000000002', hogar_id, 'Comida', 'variable' from casa;

insert into lineas_presupuesto (id, mes_id, categoria_id, monto_mensual_cents) values
  ('99999999-0000-0000-0000-000000000001','77777777-0000-0000-0000-000000000001','88888888-0000-0000-0000-000000000001', 90000),
  ('99999999-0000-0000-0000-000000000002','77777777-0000-0000-0000-000000000001','88888888-0000-0000-0000-000000000002', 60001);

-- La renta sale de los cheques de los dos: $500 de Iván y $400 de Rosa.
insert into asignaciones (mes_id, linea_presupuesto_id, periodo_id, monto_cents)
  select '77777777-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', p.id, 50000
    from periodos p where p.mes_id = '77777777-0000-0000-0000-000000000001' and p.usuario_id = :ivan and p.numero = 1;
insert into asignaciones (mes_id, linea_presupuesto_id, periodo_id, monto_cents)
  select '77777777-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', p.id, 40000
    from periodos p where p.mes_id = '77777777-0000-0000-0000-000000000001' and p.usuario_id = :rosa and p.numero = 1;

-- La comida, $600.01, repartida entre los cuatro cheques que sí se reparten:
-- 15001 + 15000 + 15000 + 15000. Ni un centavo se pierde.
insert into asignaciones (mes_id, linea_presupuesto_id, periodo_id, monto_cents)
  select '77777777-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000002', p.id,
         case when row_number() over (order by p.fecha_pago, p.usuario_id) = 1 then 15001 else 15000 end
    from periodos p
   where p.mes_id = '77777777-0000-0000-0000-000000000001' and not p.es_extra;

-- El plan semanal del eje nuevo no se escribe aquí: lo sembró el puente de
-- 0006 al insertar la línea. La renta no lo tiene — es fija y su semana la
-- decide su vencimiento. Las filas por cheque de arriba se quedan como el
-- legado que son: prueban que las llaves compuestas aguantan el modo pareja,
-- aunque ya no cuadren nada.

\echo '--- la invariante sobre el hogar entero ---'
select case when count(*) = 4 then '  ok     la comida se repartió en los 4 cheques que sí se reparten'
            else '  FALLA  asignaciones de comida: ' || count(*) end
  from asignaciones where linea_presupuesto_id = '99999999-0000-0000-0000-000000000002';

select case when count(*) = 0 then '  ok     ninguna línea quedó descuadrada'
            else '  FALLA  descuadradas: ' || string_agg(categoria, ', ') end
  from lineas_descuadradas('77777777-0000-0000-0000-000000000001');

-- El guardia ve el ingreso del hogar entero: los cheques de Rosa (día 1 y 15)
-- y los de Iván (3 y 17) fondean juntos las semanas de los dos.
select case when count(*) = 0 then '  ok     el guardia suma los cheques de los dos'
            else '  FALLA  sobregiradas: ' || string_agg(semana::text, ', ') end
  from semanas_sobregiradas('77777777-0000-0000-0000-000000000001');

\o /dev/null
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

\echo '--- cerrar el mes ---'
select probar_cierre('el mes cuadrado se cierra', '77777777-0000-0000-0000-000000000001', 'pasa');

select case when estado = 'cerrado' and cerrado_en is not null
            then '  ok     quedó marcado como cerrado'
            else '  FALLA  estado ' || estado end
  from meses where id = '77777777-0000-0000-0000-000000000001';

-- Se descuadra a propósito: se le quita un centavo a una SEMANA de la comida.
update meses set estado = 'activo', cerrado_en = null, cerrado_por = null
  where id = '77777777-0000-0000-0000-000000000001';
update asignaciones_semana set monto_cents = monto_cents - 1
  where linea_presupuesto_id = '99999999-0000-0000-0000-000000000002'
    and semana = 1;

select case when count(*) = 1 then '  ok     un centavo de menos ya descuadra la línea'
            else '  FALLA  descuadradas: ' || count(*) end
  from lineas_descuadradas('77777777-0000-0000-0000-000000000001');

-- Y tocar el legado por cheque ya no descuadra nada: el eje es la semana.
update asignaciones set monto_cents = monto_cents - 1
  where linea_presupuesto_id = '99999999-0000-0000-0000-000000000002'
    and monto_cents = 15001;
select case when count(*) = 1 then '  ok     el legado por cheque ya no manda: sigue una sola descuadrada'
            else '  FALLA  descuadradas: ' || count(*) end
  from lineas_descuadradas('77777777-0000-0000-0000-000000000001');

select probar_cierre('el mes descuadrado NO se cierra', '77777777-0000-0000-0000-000000000001', 'rechaza');

select case when estado <> 'cerrado' then '  ok     el mes sigue abierto tras el rechazo'
            else '  FALLA  se cerró de todos modos' end
  from meses where id = '77777777-0000-0000-0000-000000000001';

rollback;
