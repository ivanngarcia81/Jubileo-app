-- ---------------------------------------------------------------------------
-- 0005 — Semanas presupuestables
-- ---------------------------------------------------------------------------
--
-- El eje del presupuesto cambia: lo variable se presupuesta por SEMANA DEL MES
-- (1–7, 8–14, 15–21, 22–28, y 29–fin cuando existe), lo fijo y las deudas van
-- por su fecha de vencimiento, y el cheque deja de ser el eje para volverse la
-- regla de fondeo — "hasta la semana N no se reparte más de lo que entra hasta
-- la semana N" — y un lente derivado. Ver SEMANAS-PRESUPUESTABLES-JUBILEO.md.
--
-- **Esta migración solo agrega: no borra ni cambia ninguna fila existente.**
-- La tabla `asignaciones` (por cheque) queda intacta como legado, y el cliente
-- desplegado hoy sigue funcionando igual después de correrla. Es el patrón de
-- expandir primero y contraer después: cuando el cliente nuevo lleve un tiempo
-- en producción, una migración futura limpia las filas por periodo de los
-- grupos que ya viven en semanas. Lo único que sí cambia de comportamiento
-- son `lineas_descuadradas` y `cerrar_mes`, que pasan a mirar el eje nuevo —
-- y la traducción de abajo deja todos los meses cuadrados en ese eje, así que
-- cerrar sigue funcionando. La ventana a evitar: entre correr esto y desplegar
-- el cliente nuevo, no edites montos mensuales (el cliente viejo escribiría
-- solo en el eje viejo y el mes quedaría descuadrado en el nuevo hasta
-- tocarlo otra vez).

-- ---------------------------------------------------------------------------
-- La tabla: el plan semanal de lo variable
-- ---------------------------------------------------------------------------
--
-- Igual que `asignaciones` pero sin periodo: la semana es un número (1–5) y no
-- una fila de otra tabla, porque el calendario no se guarda — se calcula.
-- `mes_id` viaja en la llave foránea compuesta por la misma razón de siempre:
-- que una asignación no pueda cruzar de mes.
--
-- Aquí solo viven los grupos que se presupuestan a mano: `variable`,
-- `mayordomia` (no tiene fecha de vencimiento de la cual colgarse) y `fondo`
-- (hoy sin líneas, pero si algún día las tiene, nacen dentro de la
-- invariante, no fuera). Los `fijo` y `deuda` no tienen filas aquí: su semana
-- la decide su fecha de vencimiento, y pedirle al usuario que además los
-- reparta a mano es trabajo doble y la puerta a que no cuadre.

create table asignaciones_semana (
  id                   uuid primary key default gen_random_uuid(),
  mes_id               uuid not null references meses (id) on delete cascade,
  linea_presupuesto_id uuid not null,
  semana               smallint not null check (semana between 1 and 5),
  monto_cents          bigint not null check (monto_cents >= 0),

  foreign key (linea_presupuesto_id, mes_id)
    references lineas_presupuesto (id, mes_id) on delete cascade,

  unique (linea_presupuesto_id, semana)
);

create index on asignaciones_semana (mes_id);

comment on table asignaciones_semana is
  'El plan semanal de los grupos que se presupuestan a mano (variable, '
  'mayordomia, fondo). Los fijos y las deudas no viven aquí: su semana la '
  'decide su fecha de vencimiento.';

alter table asignaciones_semana enable row level security;

create policy del_hogar on asignaciones_semana
  for all using (
    exists (select 1 from meses m where m.id = mes_id and es_miembro_del_hogar(m.hogar_id))
  ) with check (
    exists (select 1 from meses m where m.id = mes_id and es_miembro_del_hogar(m.hogar_id))
  );

-- ---------------------------------------------------------------------------
-- El reparto semanal, del lado del servidor
-- ---------------------------------------------------------------------------
--
-- La misma aritmética que `repartir` en src/lib/dinero: mayor residuo, con los
-- empates rotos por posición. Existe en dos lados a propósito — el cliente no
-- puede correr durante una migración — y la prueba 06 fija los dos al mismo
-- resultado con el mismo monto indivisible, para que no se separen en
-- silencio. Los pesos son los días de cada semana del mes.

create or replace function reparto_semanal(total_cents bigint, anio int, mes int)
returns table (semana smallint, monto_cents bigint)
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  dias_mes  int := extract(day from (make_date(anio, mes, 1) + interval '1 month - 1 day'))::int;
  n         int := (dias_mes + 6) / 7;  -- 28 días → 4 semanas; 29 a 31 → 5
  dias      int[];
  base      bigint[];
  resto     bigint[];
  sobrantes bigint := 0;
  k         int;
  gana      int;
begin
  if total_cents < 0 then
    raise exception 'El reparto semanal no recibe montos negativos: %', total_cents;
  end if;

  for k in 1..n loop
    dias[k]   := least(k * 7, dias_mes) - (k - 1) * 7;
    base[k]   := (total_cents * dias[k]) / dias_mes;
    resto[k]  := (total_cents * dias[k]) % dias_mes;
    sobrantes := sobrantes - base[k];
  end loop;
  sobrantes := sobrantes + total_cents;

  -- Los centavos sobrantes van, de uno en uno, a la semana con el residuo más
  -- grande; los empates los gana la más temprana. Determinista siempre.
  while sobrantes > 0 loop
    gana := 1;
    for k in 2..n loop
      if resto[k] > resto[gana] then gana := k; end if;
    end loop;
    base[gana]  := base[gana] + 1;
    resto[gana] := -1;
    sobrantes   := sobrantes - 1;
  end loop;

  return query select s::smallint, base[s] from generate_subscripts(base, 1) as s;
end $$;

-- ---------------------------------------------------------------------------
-- La traducción: el punto de partida del plan semanal
-- ---------------------------------------------------------------------------
--
-- Cada línea presupuestable de cada mes se reparte proporcional a los días de
-- cada semana. Es un punto de partida editable, no una sentencia: el usuario
-- lo acomoda después desde la vista de semanas. Se traducen también los meses
-- cerrados para que el historial se lea con el mismo lente. Las semanas que
-- quedan en cero no ocupan fila.

insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
select l.mes_id, l.id, r.semana, r.monto_cents
  from lineas_presupuesto l
  join categorias c on c.id = l.categoria_id
  join meses m      on m.id = l.mes_id
  cross join lateral reparto_semanal(l.monto_mensual_cents, m.anio, m.mes) r
 where c.grupo in ('mayordomia', 'variable', 'fondo')
   and l.monto_mensual_cents > 0
   and r.monto_cents > 0;

-- Cinturón y tirantes: si la traducción perdió o inventó un centavo en
-- cualquier línea, la migración entera se revierte aquí mismo.
do $$
declare
  mal record;
begin
  select c.nombre, l.monto_mensual_cents, coalesce(sum(a.monto_cents), 0) as semanal
    into mal
    from lineas_presupuesto l
    join categorias c on c.id = l.categoria_id
    left join asignaciones_semana a on a.linea_presupuesto_id = l.id
   where c.grupo in ('mayordomia', 'variable', 'fondo')
   group by l.id, c.nombre, l.monto_mensual_cents
  having coalesce(sum(a.monto_cents), 0) <> l.monto_mensual_cents
   limit 1;

  if found then
    raise exception 'La traducción a semanas no cuadró en "%": % semanal contra % mensual. No se aplicó nada.',
      mal.nombre, mal.semanal, mal.monto_mensual_cents;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- La invariante, sobre el eje nuevo
-- ---------------------------------------------------------------------------
--
-- Para los grupos presupuestables: la suma de sus semanas VÁLIDAS tiene que
-- igualar el monto mensual. "Válidas" importa: el CHECK de la tabla permite
-- semana 5 siempre, pero febrero de 28 días solo tiene 4 — una fila en una
-- semana que no existe no cuenta para la suma, así que la línea sale
-- descuadrada en vez de esconder dinero en una semana fantasma.
--
-- Los fijos y las deudas ya no se comprueban: no reparten nada. Su monto vive
-- en su fecha.

create or replace function lineas_descuadradas(objetivo uuid)
returns table (
  linea_presupuesto_id uuid,
  categoria            text,
  monto_mensual_cents  bigint,
  asignado_cents       bigint,
  faltante_cents       bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    l.id,
    c.nombre,
    l.monto_mensual_cents,
    coalesce(sum(a.monto_cents), 0)::bigint,
    (l.monto_mensual_cents - coalesce(sum(a.monto_cents), 0))::bigint
  from meses m
  join lineas_presupuesto l on l.mes_id = m.id
  join categorias c on c.id = l.categoria_id
  left join asignaciones_semana a
         on a.linea_presupuesto_id = l.id
        and a.semana <= (extract(day from (make_date(m.anio, m.mes, 1) + interval '1 month - 1 day'))::int + 6) / 7
  where m.id = objetivo
    and c.grupo in ('mayordomia', 'variable', 'fondo')
  group by l.id, c.nombre, l.monto_mensual_cents
  having coalesce(sum(a.monto_cents), 0) <> l.monto_mensual_cents;
$$;

-- ---------------------------------------------------------------------------
-- El guardia: el cheque como regla de fondeo
-- ---------------------------------------------------------------------------
--
-- Hasta la semana N no se puede repartir más de lo que entra hasta la semana
-- N. Es acumulado: la semana 3 puede vivir del cheque del 20 porque ese
-- cheque llega antes de que la semana 3 termine.
--
-- Lo que entra: TODOS los cheques del mes, el extra incluido, cada uno desde
-- la primera semana que termina en o después de su fecha de pago. El cheque
-- de julio que financia agosto cuenta desde la semana 1. El extra cuenta
-- porque el guardia protege el CUÁNDO, no el destino — que el extra vaya a la
-- deuda de enfoque es otra regla, y excluirlo aquí bloquearía meses que sí
-- cuadran. Un cheque cuya fecha de pago cae después del fin del mes no fondea
-- ninguna semana: dinero que llega en septiembre no paga agosto.
--
-- Lo repartido: las semanas asignadas de los grupos presupuestables, más los
-- fijos y deudas contados en la semana de su vencimiento (el día se recorta
-- al último del mes, igual que hace el cliente: "el 31" en febrero es el 28).
-- Un fijo sin día de vencimiento cuenta en la última semana: no se sabe
-- cuándo, así que no se le exige antes de tiempo.

create or replace function semanas_sobregiradas(objetivo uuid)
returns table (
  semana                    smallint,
  entra_acumulado_cents     bigint,
  repartido_acumulado_cents bigint,
  sobregiro_cents           bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  with el_mes as (
    select m.id, m.anio, m.mes,
           extract(day from (make_date(m.anio, m.mes, 1) + interval '1 month - 1 day'))::int as dias
      from meses m
     where m.id = objetivo
  ),
  semanas as (
    select n::smallint as semana,
           make_date(e.anio, e.mes, least(n * 7, e.dias)) as fin
      from el_mes e, generate_series(1, (e.dias + 6) / 7) as n
  ),
  acumulados as (
    select s.semana,
           coalesce((select sum(coalesce(p.ingreso_real_cents, p.ingreso_esperado_cents, 0))
                       from periodos p, el_mes e
                      where p.mes_id = e.id
                        and p.fecha_pago <= s.fin), 0)::bigint as entra,
           ( coalesce((select sum(a.monto_cents)
                         from asignaciones_semana a
                        where a.mes_id = objetivo
                          and a.semana <= s.semana), 0)
           + coalesce((select sum(l.monto_mensual_cents)
                         from lineas_presupuesto l
                         join categorias c on c.id = l.categoria_id,
                              el_mes e
                        where l.mes_id = objetivo
                          and c.grupo in ('fijo', 'deuda')
                          and ((least(coalesce(c.dia_vencimiento, e.dias), e.dias) - 1) / 7) + 1 <= s.semana), 0)
           )::bigint as repartido
      from semanas s
  )
  select a.semana, a.entra, a.repartido, (a.repartido - a.entra)::bigint
    from acumulados a
   where a.repartido > a.entra
   order by a.semana;
$$;

-- ---------------------------------------------------------------------------
-- Cerrar el mes: las dos comprobaciones
-- ---------------------------------------------------------------------------
--
-- Primero el descuadre, como siempre. Después el guardia: un mes cuyo plan
-- promete dinero antes de que entre no se archiva así — se acomoda la semana
-- y se cierra. El mensaje dice cuál y por cuánto.

create or replace function cerrar_mes(objetivo uuid)
returns meses
language plpgsql
set search_path = public, pg_temp
as $$
declare
  descuadre text;
  promesa   text;
  cerrado   meses;
begin
  select string_agg(
           format('%s (falta %s)', d.categoria, to_char(d.faltante_cents / 100.0, 'FM999999990.00')),
           ', ' order by d.categoria)
    into descuadre
    from lineas_descuadradas(objetivo) d;

  if descuadre is not null then
    raise exception
      'El mes no se cierra: te falta repartir en %. Cuadra esas líneas y vuelve a intentar.', descuadre
      using errcode = 'check_violation';
  end if;

  select string_agg(
           format('la semana %s (%s de más)', s.semana, to_char(s.sobregiro_cents / 100.0, 'FM999999990.00')),
           ', ' order by s.semana)
    into promesa
    from semanas_sobregiradas(objetivo) s;

  if promesa is not null then
    raise exception
      'El mes no se cierra: repartes dinero antes de que entre — %. Muévelo a una semana que ya tenga cheque y vuelve a intentar.', promesa
      using errcode = 'check_violation';
  end if;

  update meses
     set estado      = 'cerrado',
         cerrado_en  = now(),
         cerrado_por = auth.uid()
   where id = objetivo
  returning * into cerrado;

  if cerrado is null then
    raise exception 'No existe ese mes.' using errcode = 'no_data_found';
  end if;

  return cerrado;
end $$;

-- ---------------------------------------------------------------------------
-- Permisos, con el patrón de 0003: cerrar es lo que hay que escribir
-- ---------------------------------------------------------------------------
--
-- `cerrar_mes` y `lineas_descuadradas` conservan los permisos que 0003 les
-- dejó (el REPLACE no toca la lista de quién puede llamarlas), pero su
-- `search_path` sí se pierde al reemplazar — por eso las dos lo vuelven a
-- declarar adentro. Las nuevas nacen abiertas por los permisos por omisión de
-- Supabase, así que se cierran aquí.

revoke execute on function reparto_semanal(bigint, int, int) from public, anon;
grant  execute on function reparto_semanal(bigint, int, int) to authenticated;

revoke execute on function semanas_sobregiradas(uuid) from public, anon;
grant  execute on function semanas_sobregiradas(uuid) to authenticated;

-- PostgREST se entera de la tabla nueva sin esperar su recarga periódica.
notify pgrst, 'reload schema';
