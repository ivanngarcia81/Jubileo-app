-- ---------------------------------------------------------------------------
-- Quién puede llamar a cada función, y con qué `search_path`
--
-- `0002` decía «solo quien tiene sesión» y hacía `revoke all from public`. En
-- un Postgres pelado eso alcanza. En Supabase no: cada función nueva de
-- `public` nace con `execute` concedido por separado a `anon`, `authenticated`
-- y `service_role`, por privilegios por omisión. Quitarle el permiso a `public`
-- no le quita nada a `anon`, así que `canjear_codigo` quedó publicada en
-- `/rest/v1/rpc/canjear_codigo` para cualquiera con la llave publicable —que es
-- pública por diseño.
--
-- No hubo fuga: la función revienta si `auth.uid()` es nulo. Pero una promesa
-- que no se cumple es peor que no hacerla, porque nadie vuelve a revisarla.
--
-- `0002` ya corrió, así que no se toca. El arreglo va aquí.
-- ---------------------------------------------------------------------------

-- Hay que quitar los dos permisos, no uno. Postgres le regala `execute` a
-- `public` —o sea, a todo rol que exista— en cuanto se crea una función, y
-- Supabase encima se lo concede a `anon` por su cuenta. Quitar solo uno deja
-- el otro en pie, y `anon` sigue entrando por la puerta que quedó abierta.

-- Las que la app llama por RPC. Todas se llaman con sesión: `anon` no tiene
-- nada que hacer aquí, y `cerrar_mes` además escribe.
revoke execute on function canjear_codigo(text)      from public, anon;
revoke execute on function cerrar_mes(uuid)          from public, anon;
revoke execute on function lineas_descuadradas(uuid) from public, anon;
grant  execute on function cerrar_mes(uuid)          to authenticated;
grant  execute on function lineas_descuadradas(uuid) to authenticated;

-- Estas tres son disparadores. Nadie las llama por su nombre, y sin embargo
-- estaban publicadas como RPC. Un disparador se ejecuta con los permisos de su
-- dueño y no comprueba `execute` al dispararse, así que quitarlo no los rompe.
revoke execute on function al_registrarse()            from public, anon, authenticated;
revoke execute on function al_crear_perfil()           from public, anon, authenticated;
revoke execute on function asignacion_no_va_al_extra() from public, anon, authenticated;

-- `es_miembro_del_hogar` y `comparte_hogar_conmigo` se quedan como están, a
-- propósito. Viven dentro de las políticas de RLS, y Postgres evalúa una
-- política con los permisos de quien consulta: quitarles `execute` haría que
-- una consulta reventara con «permission denied for function» en vez de
-- devolver cero filas. Las dos leen `auth.uid()` y devuelven falso cuando no
-- hay sesión, así que llamarlas desde fuera no dice nada que no se supiera.

-- ---------------------------------------------------------------------------
-- `search_path` fijo en el resto
--
-- Sin él, la función resuelve los nombres con el `search_path` de quien la
-- llama. Estas tres no son `security definer`, así que el daño posible es
-- menor, pero el hueco es el mismo y la línea es una.
-- ---------------------------------------------------------------------------

alter function cerrar_mes(uuid)              set search_path = public, pg_temp;
alter function lineas_descuadradas(uuid)     set search_path = public, pg_temp;
alter function asignacion_no_va_al_extra()   set search_path = public, pg_temp;
