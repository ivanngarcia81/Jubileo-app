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
