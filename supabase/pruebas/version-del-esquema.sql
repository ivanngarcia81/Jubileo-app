-- ============================================================================
-- ¿Qué versión del esquema tiene esta base?
--
-- Se pega en el SQL Editor de cualquier proyecto — el real, uno de prueba, el
-- de un compañero — y dice si le falta algo. Solo lee: no cambia nada.
--
-- Sirve para el problema que ya nos mordió una vez: `0001` se reescribió varias
-- veces antes de que existiera el proyecto, así que una base pudo quedarse con
-- una versión vieja sin que nadie se enterara. Con esto se sabe en diez
-- segundos en vez de descubrirlo cuando la app truena.
--
-- Cada renglón nuevo del esquema que importe de verdad debería sumar aquí una
-- línea más.
-- ============================================================================
select case when ok then '✅' else '❌ FALTA' end || '  ' || que as revision
from (values
  ('periodos.usuario_id — modo pareja',
   exists(select 1 from information_schema.columns where table_name='periodos'  and column_name='usuario_id')),
  ('asignaciones.mes_id — no cruza de mes',
   exists(select 1 from information_schema.columns where table_name='asignaciones' and column_name='mes_id')),
  ('categorias.deuda_id — enfoque por llave',
   exists(select 1 from information_schema.columns where table_name='categorias' and column_name='deuda_id')),
  ('deudas.saldo_inicial_cents',
   exists(select 1 from information_schema.columns where table_name='deudas' and column_name='saldo_inicial_cents')),
  ('usuarios.stripe_subscription_id',
   exists(select 1 from information_schema.columns where table_name='usuarios' and column_name='stripe_subscription_id')),
  ('disparador al_registrarse — el hogar nace solo',
   exists(select 1 from pg_trigger where tgname='al_registrarse')),
  ('disparador al_crear_perfil',
   exists(select 1 from pg_trigger where tgname='al_crear_perfil')),
  ('función cerrar_mes',            exists(select 1 from pg_proc where proname='cerrar_mes')),
  ('función lineas_descuadradas',   exists(select 1 from pg_proc where proname='lineas_descuadradas')),
  ('las 14 tablas',
   (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r') = 14),
  ('todas con RLS activado',
   not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
               where n.nspname='public' and c.relkind='r' and not c.relrowsecurity))
) as t(que, ok)
order by ok, que;
