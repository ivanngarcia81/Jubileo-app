-- ---------------------------------------------------------------------------
-- 0006 — El guardia cuida lo repartible, y el puente para el cliente viejo
-- ---------------------------------------------------------------------------
--
-- Corrige tres cosas que un panel adversario le encontró a 0005 después de
-- que ya había corrido (por eso van aquí y no editando 0005: una migración
-- que ya corrió no se toca).
--
-- 1. **El guardia contaba los fijos, y eso volvía meses incerrables sin
--    remedio.** Una renta que vence el día 1 con el primer cheque el 15 dejaba
--    la semana 1 sobregirada para siempre: el fijo no se puede mover porque su
--    semana la decide su fecha de vencimiento, no el usuario. Vivir un mes
--    atrás —pagar la renta de junio con el dinero de mayo— es exactamente como
--    sobrevive quien va cheque a cheque, y castigarlo con un mes que no cierra
--    es castigar la realidad. El guardia ahora cuida solo lo que el usuario
--    reparte a mano: cada semana que señala se puede arreglar moviendo dinero.
--    Los fijos entran a la bandera de "apretada" en la interfaz — que informa,
--    no bloquea. Y con el guardia acotado a lo repartible, la regla del cheque
--    extra vuelve a tener quién la cuide: lo repartible se fondea con los
--    cheques normales — el extra va completo al enfoque (regla 2 de la
--    sección 6), así que aquí no cuenta como entrada. En el eje viejo eso lo
--    vigilaba el disparador del extra; en el nuevo lo vigila esto.
--
-- 2. **Nada impedía escribir donde no toca.** Una fila semanal para un fijo
--    contaba dinero que no es repartible, y una fila en la semana 5 de un
--    febrero de 28 podía esconder centavos que ninguna vista enseña si las
--    semanas válidas cuadraban solas. Ahora un disparador rechaza las dos al
--    escribir, y `lineas_descuadradas` marca como descuadrada cualquier línea
--    con filas en semanas que no existen — cinturón y tirantes.
--
-- 3. **El cliente viejo dejaba huérfano el eje nuevo.** Editar un monto o
--    abrir septiembre escribía solo asignaciones por cheque: las líneas nacían
--    descuadradas en el eje semanal y el mes no se podía cerrar desde ahí.
--    El puente siembra y re-siembra el plan semanal proporcional cada vez que
--    un monto mensual cambia, así el cliente viejo sigue completo mientras
--    llega el nuevo. El puente se retira en la migración de contracción, junto
--    con las asignaciones por cheque.

-- ---------------------------------------------------------------------------
-- El disparador de la tabla semanal: solo lo repartible, solo semanas reales
-- ---------------------------------------------------------------------------

create or replace function semana_valida_y_repartible()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  grupo_linea grupo_categoria;
  n_semanas   int;
begin
  select c.grupo,
         (extract(day from (make_date(m.anio, m.mes, 1) + interval '1 month - 1 day'))::int + 6) / 7
    into grupo_linea, n_semanas
    from lineas_presupuesto l
    join categorias c on c.id = l.categoria_id
    join meses m      on m.id = l.mes_id
   where l.id = new.linea_presupuesto_id;

  if grupo_linea in ('fijo', 'deuda') then
    raise exception
      'Los fijos y las deudas no se reparten por semana: su semana la decide su fecha de vencimiento.'
      using errcode = 'check_violation';
  end if;

  if new.semana > n_semanas then
    raise exception
      'La semana % no existe en ese mes: tiene % semanas.', new.semana, n_semanas
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger semana_valida_y_repartible
  before insert or update on asignaciones_semana
  for each row execute function semana_valida_y_repartible();

-- ---------------------------------------------------------------------------
-- El puente: el cliente viejo sigue entero mientras llega el nuevo
-- ---------------------------------------------------------------------------
--
-- Cada vez que un monto mensual nace o cambia, el plan semanal de esa línea se
-- re-siembra proporcional a los días. Así una edición desde el cliente viejo
-- —que solo sabe de cheques— deja el eje semanal cuadrado, y el mes nuevo que
-- el cliente viejo abra nace cuadrado también. El cliente nuevo escribe su
-- plan semanal DESPUÉS de guardar el monto, así que lo que el usuario acomode
-- a mano sobrevive: la siembra solo pasa cuando el monto cambió.

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

  return new;
end $$;

create trigger siembra_semanas
  after insert or update on lineas_presupuesto
  for each row execute function sembrar_semanas_de_linea();

-- ---------------------------------------------------------------------------
-- El guardia, ahora solo sobre lo repartible
-- ---------------------------------------------------------------------------
--
-- Hasta la semana N no se REPARTE más de lo que entra hasta la semana N. Los
-- fijos y las deudas quedan fuera: su fecha no se escoge, y contarlos hacía
-- incerrable lo que la vida ya decidió. El filtro por grupo es el cinturón
-- por si alguna fila se coló antes del disparador de arriba.
--
-- Lo que entra son los cheques NORMALES, cada uno desde la primera semana que
-- termina en o después de su fecha de pago. El extra no cuenta: va completo a
-- la deuda de enfoque o al fondo (regla 2 de la sección 6), y si fondeara los
-- sobres, presupuestarlo entero en comida pasaría todas las comprobaciones.
-- Las deudas —que sí pueden absorber el extra— no están en esta suma, así que
-- excluirlo no bloquea ningún mes legítimo.

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
                        and not p.es_extra
                        and p.fecha_pago <= s.fin), 0)::bigint as entra,
           coalesce((select sum(a.monto_cents)
                       from asignaciones_semana a
                       join lineas_presupuesto l on l.id = a.linea_presupuesto_id
                       join categorias c on c.id = l.categoria_id
                      where a.mes_id = objetivo
                        and c.grupo in ('mayordomia', 'variable', 'fondo')
                        and a.semana <= s.semana), 0)::bigint as repartido
      from semanas s
  )
  select a.semana, a.entra, a.repartido, (a.repartido - a.entra)::bigint
    from acumulados a
   where a.repartido > a.entra
   order by a.semana;
$$;

-- ---------------------------------------------------------------------------
-- La invariante, con el cinturón de las semanas fantasma
-- ---------------------------------------------------------------------------
--
-- Igual que en 0005, más una cosa: una línea con CUALQUIER fila en una semana
-- que su mes no tiene sale descuadrada, aunque sus semanas válidas cuadren
-- solas. Sin esto, S1–S4 cuadradas más una fila en la S5 de febrero escondían
-- dinero que ninguna vista enseña y el mes cerraba de todos modos.

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
    coalesce(sum(a.monto_cents) filter (where a.semana <= t.n), 0)::bigint,
    (l.monto_mensual_cents - coalesce(sum(a.monto_cents) filter (where a.semana <= t.n), 0))::bigint
  from meses m
  cross join lateral (
    select (extract(day from (make_date(m.anio, m.mes, 1) + interval '1 month - 1 day'))::int + 6) / 7 as n
  ) t
  join lineas_presupuesto l on l.mes_id = m.id
  join categorias c on c.id = l.categoria_id
  left join asignaciones_semana a on a.linea_presupuesto_id = l.id
  where m.id = objetivo
    and c.grupo in ('mayordomia', 'variable', 'fondo')
  group by l.id, c.nombre, l.monto_mensual_cents, t.n
  having coalesce(sum(a.monto_cents) filter (where a.semana <= t.n), 0) <> l.monto_mensual_cents
      or count(*) filter (where a.semana > t.n) > 0;
$$;

-- ---------------------------------------------------------------------------
-- Permisos, patrón de 0003. Las funciones de disparador no las llama nadie.
-- ---------------------------------------------------------------------------

revoke execute on function semana_valida_y_repartible() from public, anon, authenticated;
revoke execute on function sembrar_semanas_de_linea()   from public, anon, authenticated;

-- `semanas_sobregiradas` y `lineas_descuadradas` conservan sus permisos: el
-- REPLACE no toca la lista de quién puede llamarlas.

notify pgrst, 'reload schema';

-- Y el reporte: si esto sale vacío, ningún mes abierto quedó bloqueado por el
-- guardia. Si sale algo, esas semanas se acomodan desde la vista de semanas.
select m.anio, m.mes, s.semana,
       to_char(s.sobregiro_cents / 100.0, 'FM999999990.00') as de_mas
  from meses m
  cross join lateral semanas_sobregiradas(m.id) s
 where m.estado <> 'cerrado'
 order by m.anio, m.mes, s.semana;
