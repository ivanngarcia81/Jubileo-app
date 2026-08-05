-- Las piezas que Supabase ya trae puestas. Solo para probar el esquema en un
-- Postgres local: en el proyecto real esto ya existe y no se aplica.
--
-- `auth.uid()` se simula leyendo `request.jwt.claims`, que es exactamente de
-- donde lo saca Supabase. Gracias a eso las pruebas de RLS pueden actuar como
-- un usuario concreto con `set local request.jwt.claims`, y lo que se comprueba
-- son las políticas de verdad y no una imitación.

create schema if not exists auth;

create table auth.users (id uuid primary key default gen_random_uuid());

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
$$;

-- El rol con el que PostgREST atiende a alguien con sesión iniciada. Las
-- políticas de RLS no se aplican al dueño de las tablas, así que sin este rol
-- las pruebas de RLS no probarían nada.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

grant usage on schema public, auth to authenticated;
