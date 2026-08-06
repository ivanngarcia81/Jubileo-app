-- ============================================================================
-- Seguridad a nivel de fila.
--
-- Se actúa como cada usuario de verdad: `set local role authenticated` más
-- `set local request.jwt.claims`, que es de donde Supabase saca `auth.uid()`.
-- Lo que se comprueba son las políticas, no una imitación.
--
-- Ojo con cómo se mide un UPDATE. El RLS **no lanza error** cuando una fila no
-- te toca: simplemente no la ve, y el UPDATE afecta cero filas sin quejarse.
-- Un `execute` que no revienta no prueba nada. Por eso aquí se cuentan las
-- filas afectadas, y cero filas cuenta como rechazo.
-- ============================================================================
\set QUIET on
\pset tuples_only on

begin;

\set ivan   '''dddddddd-0000-0000-0000-000000000001'''
\set rosa   '''dddddddd-0000-0000-0000-000000000002'''
\set ajeno  '''dddddddd-0000-0000-0000-000000000003'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:ivan,  'ivan@casa.com', '{"nombre":"Iván"}'),
  (:rosa,  'rosa@casa.com', '{"nombre":"Rosa"}'),
  (:ajeno, 'otro@otra.com', '{"nombre":"Ajeno"}');

-- Rosa se muda al hogar de Iván: el presupuesto es uno solo.
delete from miembros_hogar where usuario_id = :rosa;
insert into miembros_hogar (hogar_id, usuario_id, rol)
  select hogar_id, :rosa, 'pareja' from miembros_hogar where usuario_id = :ivan;

-- El id del hogar viaja en una variable de psql, no en una tabla temporal:
-- el rol `authenticated` no tiene permiso sobre las temporales y el rechazo
-- saldría por el motivo equivocado.
select hogar_id as casa from miembros_hogar where usuario_id = :ivan \gset
select hogar_id as otra from miembros_hogar where usuario_id = :ajeno \gset

insert into meses (id, hogar_id, anio, mes) values
  ('cccccccc-0000-0000-0000-000000000001', :'casa', 2026, 8);
insert into periodos (hogar_id, mes_id, usuario_id, numero, fecha_inicio, fecha_fin, fecha_pago) values
  (:'casa', 'cccccccc-0000-0000-0000-000000000001', :ivan, 1, '2026-08-03','2026-08-16','2026-08-03'),
  (:'casa', 'cccccccc-0000-0000-0000-000000000001', :rosa, 1, '2026-08-01','2026-08-14','2026-08-01');
insert into categorias (hogar_id, nombre, grupo) values (:'casa', 'Comida', 'variable');
insert into deudas (hogar_id, nombre, saldo_inicial_cents, saldo_cents, pago_minimo_cents)
  values (:'casa', 'Capital One', 387500, 124000, 3500);

grant select, insert, update, delete on all tables in schema public to authenticated;

\o /dev/null
create or replace function como(quien uuid, consulta text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', quien)::text, true);
  execute consulta into n;
  return n;
end $$;

-- Cuenta como rechazo tanto el error como el "cero filas afectadas", que es
-- como el RLS bloquea de verdad un UPDATE o un DELETE.
create or replace function intentar(etiqueta text, quien uuid, sentencia text, espera text) returns text
language plpgsql as $$
declare filas bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', quien)::text, true);
  execute sentencia;
  get diagnostics filas = row_count;
  if filas = 0 then
    return case when espera='rechaza' then '  ok   ' else '  FALLA' end || '  ' || etiqueta
           || ' -> no tocó ninguna fila';
  end if;
  return case when espera='pasa' then '  ok   ' else '  FALLA' end || '  ' || etiqueta
         || ' -> aceptado (' || filas || ' fila)';
exception when others then
  return case when espera='rechaza' then '  ok   ' else '  FALLA' end || '  ' || etiqueta
         || ' -> rechazado (' || left(SQLERRM, 76) || ')';
end $$;
\o

set local role authenticated;

\echo ''
\echo '--- los dos miembros ven el mismo presupuesto ---'
select case when a = 1 and b = 1 then '  ok     los dos ven el mes del hogar'
            else '  FALLA  Iván ve ' || a || ' meses, Rosa ve ' || b end
  from (select como(:ivan, 'select count(*) from meses') a,
               como(:rosa, 'select count(*) from meses') b) t;

select case when a = 2 and b = 2 then '  ok     los dos ven los dos juegos de periodos'
            else '  FALLA  Iván ve ' || a || ' periodos, Rosa ve ' || b end
  from (select como(:ivan, 'select count(*) from periodos') a,
               como(:rosa, 'select count(*) from periodos') b) t;

select case when a = 1 and b = 1 then '  ok     los dos ven las deudas del hogar'
            else '  FALLA  deudas: Iván ' || a || ', Rosa ' || b end
  from (select como(:ivan, 'select count(*) from deudas') a,
               como(:rosa, 'select count(*) from deudas') b) t;

\echo '--- cada quien ve el nombre del otro ---'
select case when a = 2 and b = 2 then '  ok     se ven entre ellos, y a nadie más'
            else '  FALLA  Iván ve ' || a || ' usuarios, Rosa ve ' || b end
  from (select como(:ivan, 'select count(*) from usuarios') a,
               como(:rosa, 'select count(*) from usuarios') b) t;

\echo '--- la persona de otro hogar no ve nada ---'
select case when meses = 0 and periodos = 0 and deudas = 0 and categorias = 0
            then '  ok     no ve meses, ni periodos, ni deudas, ni categorías'
            else '  FALLA  ve meses ' || meses || ', periodos ' || periodos
                 || ', deudas ' || deudas || ', categorías ' || categorias end
  from (select como(:ajeno, 'select count(*) from meses')      meses,
               como(:ajeno, 'select count(*) from periodos')   periodos,
               como(:ajeno, 'select count(*) from deudas')     deudas,
               como(:ajeno, 'select count(*) from categorias') categorias) t;

select case when n = 1 then '  ok     solo se ve a sí misma en usuarios'
            else '  FALLA  ve ' || n || ' usuarios' end
  from (select como(:ajeno, 'select count(*) from usuarios') n) t;

\echo '--- y no puede escribir en el hogar ajeno ---'
select intentar('meter un mes en el hogar ajeno', :ajeno,
  format($$insert into meses (hogar_id, anio, mes) values (%L, 2026, 12)$$, :'casa'), 'rechaza');
select intentar('meter una deuda en el hogar ajeno', :ajeno,
  format($$insert into deudas (hogar_id,nombre,saldo_inicial_cents,saldo_cents,pago_minimo_cents) values (%L,'Robo',100,100,10)$$, :'casa'), 'rechaza');
select intentar('borrar la deuda del hogar ajeno', :ajeno,
  $$delete from deudas where nombre = 'Capital One'$$, 'rechaza');
select intentar('Rosa sí mete un mes en su hogar', :rosa,
  format($$insert into meses (hogar_id, anio, mes) values (%L, 2026, 12)$$, :'casa'), 'pasa');

\echo '--- nadie edita el perfil de nadie más ---'
select intentar('la ajena cambiándole el nombre a Iván', :ajeno,
  $$update usuarios set nombre = 'Otro' where correo = 'ivan@casa.com'$$, 'rechaza');
select intentar('Rosa cambiándole el nombre a Iván', :rosa,
  $$update usuarios set nombre = 'Otro' where correo = 'ivan@casa.com'$$, 'rechaza');
select intentar('Rosa cambiando el suyo', :rosa,
  $$update usuarios set nombre = 'Rosita' where correo = 'rosa@casa.com'$$, 'pasa');

reset role;

\echo '--- y el nombre de Iván sigue intacto ---'
select case when nombre = 'Iván' then '  ok     nadie se lo cambió'
            else '  FALLA  ahora se llama ' || nombre end
  from usuarios where correo = 'ivan@casa.com';

rollback;
