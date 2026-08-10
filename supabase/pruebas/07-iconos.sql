-- ============================================================================
-- El icono de una categoría — la columna, su CHECK y la siembra.
--
-- Lo que se intenta romper aquí, a propósito:
--   · Que la siembra pise un icono que el usuario ya escogió. Correr una
--     migración dos veces pasa; borrarle la elección a alguien no puede.
--   · Que una clave inventada entre a la tabla. La columna es texto: sin el
--     CHECK, un `'bitcoin'` se guarda y el cliente dibuja el genérico sin que
--     nadie entienda por qué.
--   · Que la siembra y `src/lib/iconos/claves.ts` se separen en silencio. Los
--     mismos nombres están fijados en `src/lib/iconos/iconos.test.ts`: si un
--     lado cambia de criterio, el otro lo delata.
--   · Que el orden de las palabras deje de importar: "Seguro del carro" trae
--     las dos, y tiene que salir seguro.
-- ============================================================================
\set QUIET on
\pset tuples_only on

begin;

\set duena '''cccccccc-0000-0000-0000-000000000001'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:duena, 'duena@iconos.com', '{"nombre":"Dueña"}');

create temporary table casa as
  select hogar_id from miembros_hogar where usuario_id = :duena;

\o /dev/null
create or replace function probar(etiqueta text, sentencia text, espera text) returns text
language plpgsql as $$
begin
  execute sentencia;
  return case when espera='pasa' then '  ok   ' else '  FALLA' end || '  ' || etiqueta || ' -> aceptado';
exception when others then
  return case when espera='rechaza' then '  ok   ' else '  FALLA' end || '  ' || etiqueta
         || ' -> rechazado (' || left(SQLERRM, 90) || ')';
end $$;
\o

\echo ''
\echo '--- la columna acepta las claves de la rejilla y nada más ---'
insert into categorias (hogar_id, nombre, grupo)
  select hogar_id, 'Con icono', 'variable' from casa;

select probar('una clave de la rejilla',
  $$update categorias set icono = 'comida' where nombre = 'Con icono'$$, 'pasa');
select probar('nulo: "no eligió", y manda el grupo',
  $$update categorias set icono = null where nombre = 'Con icono'$$, 'pasa');
select probar('una clave inventada',
  $$update categorias set icono = 'bitcoin' where nombre = 'Con icono'$$, 'rechaza');
-- `fijo`, `variable` e `ingreso` salen del grupo: no se eligen a mano, y
-- aceptarlas dejaría guardar algo que la rejilla no puede volver a enseñar.
select probar('una clave que solo sale del grupo',
  $$update categorias set icono = 'variable' where nombre = 'Con icono'$$, 'rechaza');
select probar('cadena vacía',
  $$update categorias set icono = '' where nombre = 'Con icono'$$, 'rechaza');

-- ---------------------------------------------------------------------------
-- La siembra. Se vuelve a llamar aquí —con los nombres que el hogar de prueba
-- acaba de meter— porque la migración ya pasó sobre una tabla vacía cuando se
-- aplicó el esquema. Desde 0009 es una función, así que esto ejercita el mismo
-- código que corre en producción y no una copia que se puede quedar vieja.
-- ---------------------------------------------------------------------------
delete from categorias where hogar_id in (select hogar_id from casa);

insert into categorias (hogar_id, nombre, grupo)
  select hogar_id, n, 'variable' from casa, (values
    ('Comida'), ('Supermercado'), ('Despensa del mes'),
    ('Gasolina'), ('Pagos del carro'), ('Uber al trabajo'),
    ('Renta'), ('Hipoteca'),
    ('Luz y agua'), ('Electricidad'), ('Internet'), ('Cable e internet'),
    ('Teléfono'), ('TELEFONO'), ('Plan celular'), ('Súper'),
    ('Seguro del carro'), ('Seguro de la casa'),
    ('Diezmo y ofrenda'), ('Personal'), ('Remesa a la familia')
  ) as v(n);

-- Una que el usuario ya escogió a mano, con una palabra que la siembra
-- reconocería: es la que prueba que `where icono is null` sirve de algo.
insert into categorias (hogar_id, nombre, grupo, icono)
  select hogar_id, 'Comida del perro', 'variable', 'mascota' from casa;

\echo '--- la siembra: las mismas palabras que src/lib/iconos ---'
-- Se llama a la función de verdad, no a una copia. Antes esta prueba repetía el
-- `case` a mano, y por eso no se enteró de que a producción le faltaba
-- `electricidad`: la copia de aquí se quedó vieja y siguió pasando igual. Ver
-- `0009_mas_palabras_de_servicios.sql`.
\o /dev/null
select sembrar_iconos();
\o

create temporary table esperado (nombre text, icono text);
insert into esperado values
  ('Comida', 'comida'), ('Supermercado', 'comida'), ('Despensa del mes', 'comida'),
  ('Súper', 'comida'),
  -- `gas` no está en la lista y no puede estar: "Gasolina" lo contiene y
  -- `servicios` se prueba antes. Esta fila es la que lo delata.
  ('Gasolina', 'transporte'), ('Pagos del carro', 'transporte'),
  ('Uber al trabajo', 'transporte'),
  ('Renta', 'casa'), ('Hipoteca', 'casa'),
  ('Luz y agua', 'servicios'), ('Electricidad', 'servicios'),
  ('Internet', 'servicios'), ('Cable e internet', 'servicios'),
  ('Teléfono', 'servicios'), ('TELEFONO', 'servicios'),
  ('Plan celular', 'servicios'),
  -- El orden manda: los dos traen otra palabra que también dispararía.
  ('Seguro del carro', 'seguro'), ('Seguro de la casa', 'seguro'),
  -- Lo que no se parece a nada se queda sin icono: manda el grupo.
  ('Diezmo y ofrenda', null), ('Personal', null), ('Remesa a la familia', null),
  -- Y la que el usuario ya había escogido, intacta.
  ('Comida del perro', 'mascota');

select case when count(*) = 0
            then '  ok     los 22 nombres salen como dice src/lib/iconos/claves.ts'
            else '  FALLA  ' || string_agg(
                   c.nombre || ': ' || coalesce(c.icono, '(nulo)') ||
                   ' en vez de ' || coalesce(e.icono, '(nulo)'), ' | ') end
  from categorias c
  join esperado e on e.nombre = c.nombre
 where c.icono is distinct from e.icono;

select case when icono = 'mascota'
            then '  ok     la siembra NO pisa lo que el usuario ya escogió'
            else '  FALLA  "Comida del perro" quedó en ' || coalesce(icono, '(nulo)') end
  from categorias where nombre = 'Comida del perro';

\echo '--- correrla dos veces no cambia nada ---'
-- Una migración que se corre de nuevo pasa; que le borre la elección a alguien
-- no puede. Se repite la siembra y se comprueba que nada se movió.
create temporary table antes as select id, icono from categorias;

\o /dev/null
select sembrar_iconos();
\o

select case when count(*) = 0
            then '  ok     la segunda pasada deja todo igual'
            else '  FALLA  cambiaron ' || count(*) || ' categorías' end
  from categorias c join antes a on a.id = c.id
 where c.icono is distinct from a.icono;

\echo '--- el icono viaja con la fila, y la RLS sigue mandando ---'
set local role authenticated;
\o /dev/null
select set_config('request.jwt.claims',
  json_build_object('sub', 'cccccccc-0000-0000-0000-000000000001')::text, true);
\o
select case when count(*) filter (where icono is not null) >= 15
            then '  ok     la dueña ve sus iconos'
            else '  FALLA  ve ' || count(*) filter (where icono is not null) end
  from categorias;
select probar('la dueña puede cambiar su icono',
  $$update categorias set icono = 'ahorro' where nombre = 'Personal'$$, 'pasa');
select probar('y tampoco por aquí entra una clave inventada',
  $$update categorias set icono = 'nyan' where nombre = 'Personal'$$, 'rechaza');
reset role;

rollback;
