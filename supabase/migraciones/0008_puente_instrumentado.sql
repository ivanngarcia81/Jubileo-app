-- ---------------------------------------------------------------------------
-- 0008 — El puente dice cuánto se usa, para que su retiro lo decida un número
-- ---------------------------------------------------------------------------
--
-- El puente de 0006 (`siembra_semanas`) existe para que un cliente viejo —el
-- que solo sabe de cheques— deje el eje semanal cuadrado. Se retira en la
-- migración de contracción, junto con las asignaciones por cheque.
--
-- El problema no era el puente: era la condición de retirarlo. "Cuando ya no
-- queden clientes viejos" no se sabe mirando el aire, y con la app en
-- producción con datos de verdad, quitarlo un día antes de tiempo le rompe el
-- mes a alguien que no hizo nada. Así que el puente se instrumenta: cuenta
-- cada vez que **de verdad** siembra por el camino viejo, y lo apunta por día.
-- Cuando `dias_sin_puente()` llegue a 14, la contracción se escribe con un
-- número atrás, no con una corazonada.
--
-- ---------------------------------------------------------------------------
-- Cómo se distingue un cliente del otro
-- ---------------------------------------------------------------------------
--
-- El disparador salta con los dos clientes: los dos cambian el monto mensual.
-- Contar saltos contaría al cliente nuevo también, y el contador nunca bajaría
-- a cero. Hacía falta que el cliente nuevo se anunciara.
--
-- El canal es una columna, `lineas_presupuesto.escrito_por`, porque es lo
-- único que PostgREST deja mandar sin inventar un RPC: el cliente nuevo la
-- incluye en su payload, y el viejo —que no sabe que existe— no puede.
--
-- La columna es un **buzón, no un almacén**: un disparador `before` la lee y
-- la deja en null, y un CHECK obliga a que siempre acabe así. Sin borrarla,
-- una línea que nació en el cliente nuevo quedaría marcada para siempre y una
-- edición posterior desde el cliente viejo pasaría por nueva — el contador
-- mentiría hacia abajo, que es justo la mentira peligrosa: retiraría el puente
-- antes de tiempo.
--
-- El veredicto viaja del disparador `before` al `after` en un ajuste local a
-- la transacción. En una sentencia de varias filas todos los `before` corren
-- antes que los `after`, así que el ajuste llega con el valor de la última
-- fila; da igual, porque las filas de una sentencia vienen todas del mismo
-- cliente.
--
-- La unidad del conteo es **la línea sembrada**, no la sesión: abrir un mes
-- desde el cliente viejo suma tantas como categorías repartibles tenga. Sirve
-- igual — lo que importa es si es cero.

-- ---------------------------------------------------------------------------
-- El buzón
-- ---------------------------------------------------------------------------

alter table lineas_presupuesto
  add column if not exists escrito_por text;

comment on column lineas_presupuesto.escrito_por is
  'Buzón de un solo uso: el cliente que sabe del eje semanal manda aquí '
  '''eje-semanal'' en cada escritura. El disparador lo lee y lo deja en null. '
  'Nunca guarda nada — el CHECK lo exige. Se va con la contracción.';

alter table lineas_presupuesto
  add constraint escrito_por_es_buzon check (escrito_por is null);

-- ---------------------------------------------------------------------------
-- El conteo
-- ---------------------------------------------------------------------------

create table uso_del_puente (
  dia   date   primary key,
  veces bigint not null default 0 check (veces >= 0)
);

comment on table uso_del_puente is
  'Cuántas líneas sembró el puente por el camino viejo, por día UTC. La fila '
  'con veces = 0 que siembra esta migración marca desde cuándo se cuenta.';

-- El día cero: sin él, catorce días sin filas no se distinguen de catorce días
-- sin haber empezado a contar.
insert into uso_del_puente (dia, veces)
values ((now() at time zone 'utc')::date, 0)
on conflict (dia) do nothing;

alter table uso_del_puente enable row level security;

-- Niega a propósito, y se escribe para que se note que es a propósito: una
-- tabla sin políticas también niega, pero no se distingue de un olvido. Nadie
-- lee esto desde la app; se lee desde el editor de SQL, que entra como dueño.
create policy nadie_toca_el_conteo on uso_del_puente
  for all to authenticated, anon
  using (false) with check (false);

-- ---------------------------------------------------------------------------
-- Anotar
-- ---------------------------------------------------------------------------
--
-- `security definer` porque la política de arriba le cierra la puerta al rol
-- que corre el disparador, y no queremos abrirle la tabla a nadie.
--
-- Se le concede a `authenticated` a propósito: el disparador que la llama
-- corre con los permisos de quien escribe. No recibe argumentos y lo único que
-- puede hacer es subir en uno el contador de hoy — quien la llamara a mano
-- solo lograría **retrasar** el retiro del puente, nunca adelantarlo, que es
-- el lado seguro de equivocarse.

create function anotar_uso_del_puente()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into uso_del_puente (dia, veces)
  values ((now() at time zone 'utc')::date, 1)
  on conflict (dia) do update set veces = uso_del_puente.veces + 1;
$$;

revoke execute on function anotar_uso_del_puente() from public, anon;
grant  execute on function anotar_uso_del_puente() to authenticated;

-- ---------------------------------------------------------------------------
-- Leer el buzón y vaciarlo
-- ---------------------------------------------------------------------------

create function leer_el_buzon()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform set_config(
    'jubileo.camino_viejo',
    case when new.escrito_por is distinct from 'eje-semanal' then '1' else '0' end,
    true);
  new.escrito_por := null;
  return new;
end $$;

create trigger leer_el_buzon
  before insert or update on lineas_presupuesto
  for each row execute function leer_el_buzon();

-- ---------------------------------------------------------------------------
-- El puente, ahora contando
-- ---------------------------------------------------------------------------
--
-- Mismo cuerpo que en 0006 más las tres líneas del conteo, y va justo donde el
-- puente **de verdad** siembra: después de los dos cortes tempranos. Un monto
-- que no cambió y un fijo no usan el camino viejo, así que no cuentan.

create or replace function sembrar_semanas_de_linea()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  presupuestable boolean;
  a int;
  m int;
begin
  if tg_op = 'UPDATE' and new.monto_mensual_cents = old.monto_mensual_cents then
    return new;
  end if;

  select c.grupo in ('mayordomia', 'variable', 'fondo'), me.anio, me.mes
    into presupuestable, a, m
    from categorias c, meses me
   where c.id = new.categoria_id and me.id = new.mes_id;

  if not coalesce(presupuestable, false) then
    return new;
  end if;

  delete from asignaciones_semana where linea_presupuesto_id = new.id;
  insert into asignaciones_semana (mes_id, linea_presupuesto_id, semana, monto_cents)
    select new.mes_id, new.id, r.semana, r.monto_cents
      from reparto_semanal(new.monto_mensual_cents, a, m) r
     where r.monto_cents > 0;

  -- Lo único nuevo. El cliente que sabe del eje semanal borra estas filas y
  -- escribe las suyas enseguida: para él la siembra es andamio, no el camino.
  if current_setting('jubileo.camino_viejo', true) = '1' then
    perform anotar_uso_del_puente();
  end if;

  return new;
end $$;

-- ---------------------------------------------------------------------------
-- La condición de la contracción, en una función
-- ---------------------------------------------------------------------------
--
-- Días seguidos en cero: desde el último uso, o desde que se empezó a contar
-- si nunca se usó. En catorce, el puente se cae — y con él la columna del
-- buzón, esta tabla y estas funciones.

create function dias_sin_puente()
returns int
language sql
stable
set search_path = public, pg_temp
as $$
  select ((now() at time zone 'utc')::date
          - coalesce((select max(dia) from uso_del_puente where veces > 0),
                     (select min(dia) from uso_del_puente)))::int;
$$;

revoke execute on function dias_sin_puente() from public, anon, authenticated;
revoke execute on function leer_el_buzon()   from public, anon, authenticated;

notify pgrst, 'reload schema';

-- El reporte. Con esto se decide el día de la contracción.
select dias_sin_puente() as dias_seguidos_en_cero,
       (select coalesce(sum(veces), 0) from uso_del_puente) as usos_en_total,
       (select max(dia) from uso_del_puente where veces > 0) as ultimo_uso;
