-- ---------------------------------------------------------------------------
-- Canjear un código de cortesía
--
-- La sección 10 del SPEC lo pide: premium gratis por unos meses para clientes
-- de coaching, con vencimiento y un solo uso. La tabla ya existía desde 0001
-- con su política que niega todo desde el cliente — y esa política se queda.
--
-- El canje pasa por esta función y no por la tabla porque son dos cosas que
-- tienen que ocurrir juntas o no ocurrir: marcar el código como usado y subir
-- al usuario a premium. Con permiso directo sobre la tabla, un cliente podría
-- leer todos los códigos y probarlos uno por uno.
-- ---------------------------------------------------------------------------

create or replace function canjear_codigo(codigo_dado text)
returns timestamptz
language plpgsql
security definer
-- `search_path` fijo: sin él, una tabla `usuarios` puesta en otro esquema por
-- alguien con permiso de crearlo se ejecutaría con los privilegios del dueño.
set search_path = public, pg_temp
as $$
declare
  quien   uuid := auth.uid();
  cuantos smallint;
  desde   timestamptz;
  hasta   timestamptz;
begin
  if quien is null then
    raise exception 'Necesitas haber entrado para canjear un código.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Un solo `update` con todas las condiciones adentro. Comprobar y después
  -- marcar dejaría una rendija por la que dos canjes simultáneos del mismo
  -- código pasarían los dos; así el segundo no encuentra nada que actualizar.
  update codigos_cortesia
     set usado_por = quien,
         usado_en  = now()
   where codigo    = upper(trim(codigo_dado))
     and usado_por is null
     and vence_en >= current_date
  returning meses into cuantos;

  if cuantos is null then
    raise exception 'Ese código no sirve: o ya se usó, o ya venció, o está mal escrito.'
      using errcode = 'check_violation';
  end if;

  -- Si ya era premium, los meses se suman a lo que le quedaba en vez de
  -- reemplazarlo. Nadie debe perder tiempo pagado por canjear un regalo.
  select greatest(coalesce(u.nivel_vence_en, now()), now())
    into desde
    from usuarios u
   where u.id = quien;

  hasta := desde + (cuantos || ' months')::interval;

  update usuarios
     set nivel          = 'premium',
         nivel_vence_en = hasta
   where id = quien;

  return hasta;
end $$;

comment on function canjear_codigo(text) is
  'Canjea un código de cortesía y devuelve hasta cuándo queda premium.';

-- Solo quien tiene sesión. `public` incluiría al rol anónimo.
revoke all on function canjear_codigo(text) from public;
grant execute on function canjear_codigo(text) to authenticated;
