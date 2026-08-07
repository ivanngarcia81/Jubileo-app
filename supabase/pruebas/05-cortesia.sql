-- ---------------------------------------------------------------------------
-- Los códigos de cortesía (migración 0002)
--
-- Es una puerta a premium sin pagar: lo que importa es que se cruce una sola
-- vez, que no se cruce vencida, y que nadie pueda leer la lista de códigos
-- desde el cliente para irlos probando.
--
-- Dos cuidados al escribir estas pruebas:
--
--   · Cada canje va dentro de un CTE, nunca suelto en un `between`. `x between
--     a and b` se expande a `x >= a and x <= b`, y con eso la función se llama
--     **dos veces**: el segundo canje choca contra el "un solo uso" que la
--     prueba quería comprobar, y todo falla sin que la función tenga nada malo.
--   · Cada intento que debe fallar pasa por `probar`, que atrapa la excepción.
--     Dejarla salir abortaría la transacción y el corredor la contaría como
--     falla — pero el rechazo es justamente lo que se está comprobando.
-- ---------------------------------------------------------------------------
\set ON_ERROR_STOP off
\set QUIET on
\pset pager off
\pset tuples_only on

begin;

-- Supabase le da permisos de tabla a `authenticated` y deja que las políticas
-- de RLS decidan; el simulado no, y sin esto se probaría contra una base más
-- cerrada que la de verdad. `codigos_cortesia` sigue negando todo por política,
-- que es lo que aquí se comprueba.
grant select, insert, update, delete on all tables in schema public to authenticated;

insert into auth.users (id, email) values
  ('aaaa1111-0000-0000-0000-000000000001', 'ana@cortesia.com'),
  ('bbbb2222-0000-0000-0000-000000000002', 'beto@cortesia.com');

insert into codigos_cortesia (codigo, meses, vence_en) values
  ('COACH2026', 3, current_date + 30),
  ('YAVENCIO',  3, current_date - 1),
  ('OTRO',      2, current_date + 30);

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaa1111-0000-0000-0000-000000000001"}';

with r as (select canjear_codigo('COACH2026') as hasta)
select case when hasta between now() + interval '88 days' and now() + interval '93 days'
            then '   ok    canjear sube a premium por los meses del código'
            else '   FALLA los meses del código no se aplicaron: ' || hasta end
  from r;

select case when nivel = 'premium' then '   ok    el nivel quedó en premium'
            else '   FALLA el nivel no cambió' end
  from usuarios where id = 'aaaa1111-0000-0000-0000-000000000001';

-- Se escribe como sea: mayúsculas y espacios no deben importar.
savepoint s1;
with r as (select canjear_codigo('  otro  ') as hasta)
select case when hasta is not null
            then '   ok    el código se reconoce con espacios y en minúsculas'
            else '   FALLA' end from r;
rollback to s1;

-- Los meses se suman a lo que le quedaba, no lo reemplazan: nadie debe perder
-- tiempo pagado por canjear un regalo.
savepoint s2;
with r as (select canjear_codigo('OTRO') as hasta)
select case when hasta between now() + interval '148 days' and now() + interval '155 days'
            then '   ok    los meses se suman a lo que ya tenía, no lo reemplazan'
            else '   FALLA canjear un segundo código borró el tiempo que le quedaba' end
  from r;
rollback to s2;

-- --- Lo que debe rechazarse ------------------------------------------------
reset role;
\o /dev/null
create or replace function probar_canje(etiqueta text, codigo text) returns text
language plpgsql as $$
declare r timestamptz;
begin
  r := canjear_codigo(codigo);
  return '   FALLA ' || etiqueta || ' -> se canjeó';
exception when others then
  return '   ok    ' || etiqueta;
end $$;
\o
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbb2222-0000-0000-0000-000000000002"}';

select probar_canje('el mismo código no se canjea dos veces', 'COACH2026');
select probar_canje('un código vencido no se canjea', 'YAVENCIO');
select probar_canje('un código inventado no se canjea', 'LOQUESEA');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbb2222-0000-0000-0000-000000000002"}';

-- --- Nadie lee la lista ----------------------------------------------------
select case when count(*) = 0 then '   ok    desde el cliente no se ve ningún código'
            else '   FALLA se pueden leer los códigos y probarlos uno por uno' end
  from codigos_cortesia;

rollback;
