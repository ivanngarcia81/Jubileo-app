-- ============================================================================
-- Reglas que valen para TODA tabla, incluidas las que todavía no existen.
--
-- Las otras pruebas comprueban lo que ya está escrito. Estas comprueban lo que
-- se va a escribir: no enumeran tablas ni columnas, las descubren. Una tabla
-- nueva que llegue sin RLS, o una columna de dinero que llegue sin su CHECK,
-- revientan aquí sin que nadie se acuerde de venir a agregarlas.
--
--   1. Toda tabla de `public` tiene RLS activado y al menos una política.
--      Sin RLS, una tabla nueva queda abierta a cualquiera con la anon key,
--      que es pública por diseño.
--   2. Todo el dinero va en `bigint` de centavos y con un CHECK que lo
--      acota. `bigint` ya garantiza el entero; el CHECK es lo que impide un
--      saldo negativo o una meta en cero.
--   3. Ninguna función de `public` se queda con el `search_path` heredado, y
--      ninguna queda publicada a `anon` sin decirlo. Todo lo que vive en
--      `public` sale por `/rest/v1/rpc/` en cuanto existe: una función nueva
--      nace publicada, no privada.
-- ============================================================================
\set QUIET on
\pset tuples_only on

\echo ''
\echo '--- 1. RLS en todas las tablas ---'

-- Tablas sin RLS activado.
select '  FALLA  la tabla ' || c.relname || ' no tiene RLS activado'
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- Tablas con RLS pero sin ninguna política: niegan todo, incluso a su dueño.
-- Casi siempre es un olvido, no una decisión.
select '  FALLA  la tabla ' || c.relname || ' tiene RLS pero ninguna política'
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
   and not exists (select 1 from pg_policy p where p.polrelid = c.oid);

select case when count(*) = 0
            then '  ok     las ' || (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                                      where n.nspname = 'public' and c.relkind = 'r')
                 || ' tablas tienen RLS y política'
            else '  FALLA  ' || count(*) || ' tabla(s) sin proteger' end
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
   and (not c.relrowsecurity
        or not exists (select 1 from pg_policy p where p.polrelid = c.oid));

\echo '--- 2. el dinero, en enteros y acotado ---'

-- Cualquier columna que hable de dinero: por sufijo `_cents`, o por nombre.
create temporary view columnas_de_dinero as
  select c.table_name, c.column_name, c.data_type,
         (c.table_name || '.' || c.column_name) as ruta
    from information_schema.columns c
   where c.table_schema = 'public'
     and (c.column_name like '%_cents' or c.column_name like '%monto%' or c.column_name like '%saldo%');

select '  FALLA  ' || ruta || ' guarda dinero en ' || data_type || ', no en bigint'
  from columnas_de_dinero where data_type <> 'bigint';

-- Y cada una tiene que aparecer en alguna restricción CHECK de su tabla.
select '  FALLA  ' || d.ruta || ' no tiene ningún CHECK que la acote'
  from columnas_de_dinero d
 where not exists (
   select 1
     from pg_constraint k
     join pg_class t on t.oid = k.conrelid
     join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = d.table_name and k.contype = 'c'
      and pg_get_constraintdef(k.oid) like '%' || d.column_name || '%'
 );

select case when count(*) = 0
            then '  ok     las ' || (select count(*) from columnas_de_dinero)
                 || ' columnas de dinero son bigint y llevan CHECK'
            else '  FALLA  ' || count(*) || ' columna(s) de dinero sin acotar' end
  from columnas_de_dinero d
 where d.data_type <> 'bigint'
    or not exists (
   select 1
     from pg_constraint k
     join pg_class t on t.oid = k.conrelid
     join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = d.table_name and k.contype = 'c'
      and pg_get_constraintdef(k.oid) like '%' || d.column_name || '%'
 );

\echo '--- 3. nada de flotantes en ninguna parte ---'
select '  FALLA  ' || table_name || '.' || column_name || ' es ' || data_type
  from information_schema.columns
 where table_schema = 'public' and data_type in ('real', 'double precision');

select case when count(*) = 0 then '  ok     ninguna columna usa punto flotante'
            else '  FALLA  ' || count(*) || ' columna(s) en punto flotante' end
  from information_schema.columns
 where table_schema = 'public' and data_type in ('real', 'double precision');

\echo '--- 4. las funciones: search_path fijo y quién puede llamarlas ---'

create temporary view funciones_de_public as
  select p.oid, p.proname,
         pg_get_function_identity_arguments(p.oid) as args,
         exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c
                  where c like 'search_path=%') as fija_el_camino
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     -- Las de una extensión no son nuestras. Aquí `pgcrypto` cae en `public`
     -- porque es un Postgres pelado; en Supabase vive en su propio esquema.
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e');

select '  FALLA  ' || proname || '(' || args || ') no fija su search_path'
  from funciones_de_public where not fija_el_camino;

-- Las que se dejan abiertas a `anon` a propósito, y por qué. Cualquier otra
-- que aparezca aquí es un olvido: en Supabase una función nace con `execute`
-- para `anon`, así que abrirse es lo que pasa solo — cerrarse hay que
-- escribirlo.
create temporary view abiertas_a_proposito (proname, motivo) as values
  ('es_miembro_del_hogar',  'la usan las políticas de RLS, que corren con los permisos de quien consulta'),
  ('comparte_hogar_conmigo','la usan las políticas de RLS, que corren con los permisos de quien consulta');

select '  FALLA  ' || f.proname || '(' || f.args || ') la puede llamar cualquiera con la llave publicable'
  from funciones_de_public f
 where has_function_privilege('anon', f.oid, 'execute')
   and f.proname not in (select proname from abiertas_a_proposito);

select case when count(*) = 0
            then '  ok     las ' || (select count(*) from funciones_de_public)
                 || ' funciones fijan su search_path y ninguna se publicó sin querer'
            else '  FALLA  ' || count(*) || ' función(es) mal puestas' end
  from funciones_de_public f
 where not f.fija_el_camino
    or (has_function_privilege('anon', f.oid, 'execute')
        and f.proname not in (select proname from abiertas_a_proposito));
