-- Las piezas que Supabase ya trae puestas. Solo para probar el esquema en un
-- Postgres local: en el proyecto real esto ya existe y no se aplica.
--
-- `auth.uid()` se simula leyendo `request.jwt.claims`, que es exactamente de
-- donde lo saca Supabase. Gracias a eso las pruebas de RLS pueden actuar como
-- un usuario concreto con `set local request.jwt.claims`, y lo que se comprueba
-- son las políticas de verdad y no una imitación.

create schema if not exists auth;

-- Las columnas de `auth.users` que el disparador `al_registrarse` necesita.
-- En el proyecto real las pone Supabase; aquí solo se imitan las tres.
create table auth.users (
  id                   uuid primary key default gen_random_uuid(),
  email                text,
  raw_user_meta_data   jsonb not null default '{}'::jsonb
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
$$;

-- Los roles con los que PostgREST atiende. `authenticated` es alguien con
-- sesión; `anon` es cualquiera que tenga la llave publicable, que es pública
-- por diseño. Las políticas de RLS no se aplican al dueño de las tablas, así
-- que sin estos roles las pruebas de RLS no probarían nada.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public, auth to authenticated, anon, service_role;

-- Esto es lo que más importa de todo el archivo.
--
-- Supabase le regala `execute` sobre cada función nueva de `public` a los tres
-- roles, por privilegios por omisión. Sin esta línea, un Postgres pelado nace
-- con lo contrario —solo `public` tiene execute— y un `revoke ... from public`
-- en una migración parece suficiente cuando en el proyecto real no quita nada:
-- el permiso de `anon` sigue ahí, concedido aparte. Así fue como
-- `canjear_codigo` quedó abierta a cualquiera con la llave publicable mientras
-- las pruebas locales pasaban en verde.
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- Y lo mismo con las tablas: en Supabase los tres roles nacen con permisos
-- sobre cada tabla nueva y es el RLS quien cuida la puerta. Sin esta línea,
-- una tabla creada en una migración queda sin permisos aquí y con ellos en
-- producción — y las pruebas de RLS fallarían por la razón equivocada.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
