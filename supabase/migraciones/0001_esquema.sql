-- ============================================================================
-- Jubileo — esquema inicial
--
-- El modelo de la sección 5 del SPEC, versionado, para que la migración real
-- salga de aquí y no de la memoria de nadie.
--
-- Tres decisiones que no se pueden posponer, porque arreglarlas después
-- significa migrar tablas con datos de usuarios encima:
--
--   1. Todo el dinero va en `bigint` de centavos. Nunca `numeric`, nunca
--      `float`. El formateo es cosa de la interfaz.
--
--   2. El presupuesto cuelga del **hogar**, no del usuario. El modo pareja es
--      fase 4, pero el SPEC pide diseñar las llaves con eso en mente desde el
--      día uno. Al registrarse se crea un hogar de un solo miembro.
--
--   3. Los **periodos cuelgan del usuario**, no solo del hogar. En modo pareja
--      cada quien cobra con su propia frecuencia — uno cada dos semanas, otro
--      los días 1 y 15 — así que un mes trae dos juegos de periodos. Sin
--      `usuario_id` no hay forma de saber de quién es cada cheque, y un
--      `unique (mes_id, numero)` haría chocar los dos "cheque 1".
--
-- Se prueba con `./supabase/pruebas/probar-esquema.sh`, que levanta un
-- Postgres desechable y comprueba las restricciones y las políticas de RLS.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type nivel_usuario       as enum ('gratis', 'premium');
create type frecuencia_pago     as enum ('semanal', 'cada_dos_semanas', 'dos_veces_al_mes', 'mensual', 'variable');
create type estado_mes          as enum ('borrador', 'activo', 'cerrado');
create type estado_periodo      as enum ('futuro', 'activo', 'cerrado');
create type grupo_categoria     as enum ('mayordomia', 'fijo', 'variable', 'deuda', 'fondo');
create type tipo_transaccion    as enum ('gasto', 'ingreso');
create type origen_transaccion  as enum ('manual', 'plaid');
create type estado_transaccion  as enum ('pendiente', 'asignada');
create type canal_aviso         as enum ('push', 'correo', 'sms');
create type tipo_aviso          as enum ('arranque_periodo', 'cierre_periodo');
create type rol_hogar           as enum ('titular', 'pareja');

-- ---------------------------------------------------------------------------
-- Usuarios y hogares
-- ---------------------------------------------------------------------------

create table usuarios (
  id                      uuid primary key references auth.users (id) on delete cascade,
  correo                  text not null unique,
  nombre                  text,
  zona_horaria            text not null default 'America/New_York',
  creado_en               timestamptz not null default now(),
  onboarding_terminado_en timestamptz,

  -- ---- Membresía. Los webhooks de Stripe son la única fuente de verdad. ----
  nivel                   nivel_usuario not null default 'gratis',
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  -- Hasta cuándo está pagado. Al vencer, la cuenta baja a gratis **sin borrar
  -- datos**: el historial viejo se queda visible en modo lectura (sección 10).
  nivel_vence_en          timestamptz,

  -- ---- Cómo le pagan. De aquí sale todo el calendario de periodos. ----
  frecuencia_pago         frecuencia_pago,
  -- Fecha de un cheque conocido.
  fecha_ancla             date,
  -- Solo para `dos_veces_al_mes`, ej. '{1,15}'.
  dias_pago               smallint[],
  -- Nulo cuando el ingreso es variable. Nunca se presupuesta lo que no entró.
  ingreso_esperado_cents  bigint check (ingreso_esperado_cents is null or ingreso_esperado_cents >= 0),

  -- `dos_veces_al_mes` necesita exactamente dos días, entre 1 y 31.
  constraint dias_pago_coherentes check (
    frecuencia_pago is distinct from 'dos_veces_al_mes'
    or (
      array_length(dias_pago, 1) = 2
      and dias_pago[1] between 1 and 31
      and dias_pago[2] between 1 and 31
    )
  )
);

create table hogares (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  creado_en timestamptz not null default now()
);

create table miembros_hogar (
  hogar_id   uuid not null references hogares (id) on delete cascade,
  usuario_id uuid not null references usuarios (id) on delete cascade,
  rol        rol_hogar not null default 'titular',
  creado_en  timestamptz not null default now(),
  primary key (hogar_id, usuario_id)
);

create index on miembros_hogar (usuario_id);

-- ---------------------------------------------------------------------------
-- El mes y sus periodos
-- ---------------------------------------------------------------------------

create table meses (
  id         uuid primary key default gen_random_uuid(),
  hogar_id   uuid not null references hogares (id) on delete cascade,
  anio       smallint not null check (anio between 1970 and 2200),
  mes        smallint not null check (mes between 1 and 12),
  estado     estado_mes not null default 'borrador',
  cerrado_en timestamptz,
  -- En modo pareja importa quién cerró el mes.
  cerrado_por uuid references usuarios (id) on delete set null,

  unique (hogar_id, anio, mes),
  constraint cierre_coherente check (
    (estado = 'cerrado') = (cerrado_en is not null)
  )
);

create table periodos (
  id                     uuid primary key default gen_random_uuid(),
  hogar_id               uuid not null references hogares (id) on delete cascade,
  mes_id                 uuid not null references meses (id) on delete cascade,
  -- De quién es este cheque. En modo pareja un mes trae dos juegos de
  -- periodos, uno por cada persona que cobra, y se numeran por separado.
  usuario_id             uuid not null references usuarios (id) on delete cascade,
  numero                 smallint not null check (numero >= 1),

  fecha_inicio           date not null,
  fecha_fin              date not null,
  fecha_pago             date not null,

  ingreso_esperado_cents bigint check (ingreso_esperado_cents is null or ingreso_esperado_cents >= 0),
  -- Nulo hasta que el usuario confirma cuánto entró de verdad.
  ingreso_real_cents     bigint,

  -- Tercer cheque de un mes de 3. No se reparte entre categorías.
  es_extra               boolean not null default false,
  estado                 estado_periodo not null default 'futuro',

  unique (mes_id, usuario_id, numero),
  constraint rango_coherente check (fecha_inicio <= fecha_pago and fecha_pago <= fecha_fin)
);

create index on periodos (hogar_id, fecha_pago);
create index on periodos (usuario_id, fecha_pago);

-- ---------------------------------------------------------------------------
-- Categorías, líneas y asignaciones
-- ---------------------------------------------------------------------------

create table categorias (
  id              uuid primary key default gen_random_uuid(),
  hogar_id        uuid not null references hogares (id) on delete cascade,
  nombre          text not null,
  grupo           grupo_categoria not null,
  orden           smallint not null default 0,
  activa          boolean not null default true,
  es_fija         boolean not null default false,
  dia_vencimiento smallint check (dia_vencimiento between 1 and 31),

  -- El SPEC lo llama obligatorio para las fijas: sin día de vencimiento el
  -- aviso semanal pierde la mitad de su valor.
  constraint fija_con_vencimiento check (not es_fija or dia_vencimiento is not null),
  unique (hogar_id, nombre)
);

create table lineas_presupuesto (
  id                  uuid primary key default gen_random_uuid(),
  mes_id              uuid not null references meses (id) on delete cascade,
  categoria_id        uuid not null references categorias (id) on delete restrict,
  monto_mensual_cents bigint not null check (monto_mensual_cents >= 0),
  unique (mes_id, categoria_id)
);

-- Para poder amarrar las asignaciones a un solo mes con llaves foráneas
-- compuestas hace falta que el mes viaje en la llave del padre.
alter table lineas_presupuesto add unique (id, mes_id);
alter table periodos           add unique (id, mes_id);

-- ---------------------------------------------------------------------------
-- La capa clave del producto.
--
-- INVARIANTE: para cada línea, la suma de sus asignaciones tiene que igualar
-- `monto_mensual_cents`. No cabe en un CHECK de fila; la comprueban
-- `lineas_descuadradas()` y `cerrar_mes()` más abajo, y también
-- src/lib/periodos/asignaciones.ts del lado del cliente. Si no cuadra, el mes
-- no se cierra: es un rechazo, no una advertencia.
--
-- Lo que sí cabe en el esquema, y por eso va aquí:
--
--   · `mes_id` viaja en las dos llaves foráneas, así que una asignación **no
--     puede cruzar de mes**. Sin esto se podría asignar una línea de agosto a
--     un periodo de septiembre y la suma "cuadraría" con dinero de otro mes.
--
--   · El periodo puede ser de cualquier miembro del hogar. Eso es a propósito:
--     en modo pareja una misma línea se reparte entre los cheques de los dos.
-- ---------------------------------------------------------------------------

create table asignaciones (
  id                   uuid primary key default gen_random_uuid(),
  mes_id               uuid not null references meses (id) on delete cascade,
  linea_presupuesto_id uuid not null,
  periodo_id           uuid not null,
  monto_cents          bigint not null check (monto_cents >= 0),

  foreign key (linea_presupuesto_id, mes_id)
    references lineas_presupuesto (id, mes_id) on delete cascade,
  foreign key (periodo_id, mes_id)
    references periodos (id, mes_id) on delete cascade,

  unique (linea_presupuesto_id, periodo_id)
);

create index on asignaciones (periodo_id);
create index on asignaciones (mes_id);

-- El cheque extra llega completo y el usuario decide a dónde va (regla 2 de la
-- sección 6). Un CHECK no puede mirar otra tabla, así que va un disparador —
-- y va a propósito, porque aquí lo que importa es el mensaje.
create or replace function asignacion_no_va_al_extra()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from periodos p where p.id = new.periodo_id and p.es_extra) then
    raise exception
      'El cheque extra no se reparte entre categorías. Va completo a tu deuda de enfoque, o a tu fondo de emergencia si ya no tienes deudas.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger asignacion_no_va_al_extra
  before insert or update on asignaciones
  for each row execute function asignacion_no_va_al_extra();

-- ---------------------------------------------------------------------------
-- Movimientos
-- ---------------------------------------------------------------------------

create table transacciones (
  id           uuid primary key default gen_random_uuid(),
  hogar_id     uuid not null references hogares (id) on delete cascade,
  -- Quién la anotó. Importa en modo pareja.
  usuario_id   uuid references usuarios (id) on delete set null,
  periodo_id   uuid references periodos (id) on delete set null,
  -- Nulo mientras está pendiente de asignar. Nunca se auto-categoriza sin
  -- que el usuario confirme.
  categoria_id uuid references categorias (id) on delete set null,

  fecha        date not null,
  monto_cents  bigint not null,
  tipo         tipo_transaccion not null,
  descripcion  text,
  comercio     text,
  origen       origen_transaccion not null default 'manual',
  estado       estado_transaccion not null default 'pendiente',
  creado_en    timestamptz not null default now(),

  constraint asignada_tiene_categoria check (estado <> 'asignada' or categoria_id is not null)
);

create index on transacciones (hogar_id, fecha desc);
create index on transacciones (periodo_id);
create index on transacciones (hogar_id, estado) where estado = 'pendiente';

-- ---------------------------------------------------------------------------
-- Deudas y fondos de reserva
-- ---------------------------------------------------------------------------

create table deudas (
  id                  uuid primary key default gen_random_uuid(),
  hogar_id            uuid not null references hogares (id) on delete cascade,
  nombre              text not null,
  -- Con cuánto empezó: la barra de la pantalla mide lo que ya lleva pagado.
  saldo_inicial_cents bigint not null check (saldo_inicial_cents >= 0),
  saldo_cents         bigint not null check (saldo_cents >= 0),
  pago_minimo_cents   bigint not null check (pago_minimo_cents >= 0),
  tasa_interes        numeric(5, 2) check (tasa_interes >= 0),
  orden               smallint not null default 0,
  es_enfoque          boolean not null default false,
  pagada_en           date,

  constraint saldo_no_pasa_del_inicial check (saldo_cents <= saldo_inicial_cents)
);

-- Solo una deuda de enfoque a la vez por hogar.
create unique index deuda_enfoque_unica on deudas (hogar_id) where es_enfoque;

create table fondos_reserva (
  id              uuid primary key default gen_random_uuid(),
  hogar_id        uuid not null references hogares (id) on delete cascade,
  nombre          text not null,
  meta_cents      bigint not null check (meta_cents > 0),
  acumulado_cents bigint not null default 0 check (acumulado_cents >= 0),
  fecha_objetivo  date
  -- Cuánto apartar por periodo es derivado, no se guarda.
);

-- ---------------------------------------------------------------------------
-- Avisos
-- ---------------------------------------------------------------------------

create table preferencias_aviso (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios (id) on delete cascade,
  canal      canal_aviso not null,
  dia_semana smallint check (dia_semana between 0 and 6),
  hora_local time not null default '08:00',
  activo     boolean not null default true,
  unique (usuario_id, canal)
);

-- Registro de envíos. La idempotencia del aviso es del esquema, no del cron:
-- un cron que corre dos veces no manda el aviso dos veces.
--
-- El SPEC pide idempotencia por (usuario, periodo, tipo). El canal entra en la
-- llave porque un premium con correo y push activos debe recibir los dos, y
-- eso son dos renglones con el mismo (usuario, periodo, tipo).
create table envios_aviso (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios (id) on delete cascade,
  periodo_id uuid not null references periodos (id) on delete cascade,
  tipo       tipo_aviso not null,
  canal      canal_aviso not null,
  enviado_en timestamptz not null default now(),
  unique (usuario_id, periodo_id, tipo, canal)
);

-- ---------------------------------------------------------------------------
-- Códigos de cortesía (premium gratis para clientes de coaching)
-- ---------------------------------------------------------------------------

create table codigos_cortesia (
  codigo    text primary key,
  meses     smallint not null default 3 check (meses > 0),
  vence_en  date not null,
  usado_por uuid references usuarios (id) on delete set null,
  usado_en  timestamptz,
  -- Un solo uso.
  constraint uso_coherente check ((usado_por is null) = (usado_en is null))
);

-- ---------------------------------------------------------------------------
-- La invariante, del lado del servidor
--
-- El cliente ya la valida en src/lib/periodos/asignaciones.ts, pero el cliente
-- puede mentir. El mes solo se cierra si aquí también cuadra.
-- ---------------------------------------------------------------------------

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
as $$
  select
    l.id,
    c.nombre,
    l.monto_mensual_cents,
    coalesce(sum(a.monto_cents), 0)::bigint,
    (l.monto_mensual_cents - coalesce(sum(a.monto_cents), 0))::bigint
  from lineas_presupuesto l
  join categorias c on c.id = l.categoria_id
  left join asignaciones a on a.linea_presupuesto_id = l.id
  where l.mes_id = objetivo
  group by l.id, c.nombre, l.monto_mensual_cents
  having coalesce(sum(a.monto_cents), 0) <> l.monto_mensual_cents;
$$;

create or replace function cerrar_mes(objetivo uuid)
returns meses
language plpgsql
as $$
declare
  descuadre text;
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
-- Al registrarse, cada quien estrena su hogar de un miembro.
-- ---------------------------------------------------------------------------

create or replace function al_crear_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nuevo uuid;
begin
  insert into hogares (nombre)
       values (coalesce(new.nombre, split_part(new.correo, '@', 1)))
    returning id into nuevo;

  insert into miembros_hogar (hogar_id, usuario_id, rol)
       values (nuevo, new.id, 'titular');

  return new;
end $$;

create trigger al_crear_usuario
  after insert on usuarios
  for each row execute function al_crear_usuario();

-- ---------------------------------------------------------------------------
-- Seguridad a nivel de fila
--
-- Todo cuelga del hogar, así que la política es siempre la misma: se ve lo del
-- hogar al que perteneces. Se activa en todas las tablas; sin política
-- explícita, Postgres niega el acceso.
-- ---------------------------------------------------------------------------

create or replace function es_miembro_del_hogar(objetivo uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from miembros_hogar
    where hogar_id = objetivo and usuario_id = auth.uid()
  );
$$;

-- ¿Comparto hogar con esta persona? En modo pareja hace falta: las
-- transacciones muestran quién las anotó, y sin esto no se vería el nombre.
create or replace function comparte_hogar_conmigo(otro uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from miembros_hogar mio
      join miembros_hogar suyo on suyo.hogar_id = mio.hogar_id
     where mio.usuario_id = auth.uid() and suyo.usuario_id = otro
  );
$$;

alter table usuarios           enable row level security;
alter table hogares            enable row level security;
alter table miembros_hogar     enable row level security;
alter table meses              enable row level security;
alter table periodos           enable row level security;
alter table categorias         enable row level security;
alter table lineas_presupuesto enable row level security;
alter table asignaciones       enable row level security;
alter table transacciones      enable row level security;
alter table deudas             enable row level security;
alter table fondos_reserva     enable row level security;
alter table preferencias_aviso enable row level security;
alter table envios_aviso       enable row level security;
alter table codigos_cortesia   enable row level security;

-- Cada quien lee a los de su hogar, pero solo se edita a sí mismo.
create policy leer_los_de_mi_hogar on usuarios
  for select using (id = auth.uid() or comparte_hogar_conmigo(id));
create policy editar_lo_mio on usuarios
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy del_hogar on hogares
  for all using (es_miembro_del_hogar(id)) with check (es_miembro_del_hogar(id));

create policy del_hogar on miembros_hogar
  for all using (es_miembro_del_hogar(hogar_id)) with check (es_miembro_del_hogar(hogar_id));

create policy del_hogar on meses
  for all using (es_miembro_del_hogar(hogar_id)) with check (es_miembro_del_hogar(hogar_id));

-- Los dos miembros ven los dos juegos de periodos: el presupuesto es del hogar.
create policy del_hogar on periodos
  for all using (es_miembro_del_hogar(hogar_id)) with check (es_miembro_del_hogar(hogar_id));

create policy del_hogar on categorias
  for all using (es_miembro_del_hogar(hogar_id)) with check (es_miembro_del_hogar(hogar_id));

create policy del_hogar on transacciones
  for all using (es_miembro_del_hogar(hogar_id)) with check (es_miembro_del_hogar(hogar_id));

create policy del_hogar on deudas
  for all using (es_miembro_del_hogar(hogar_id)) with check (es_miembro_del_hogar(hogar_id));

create policy del_hogar on fondos_reserva
  for all using (es_miembro_del_hogar(hogar_id)) with check (es_miembro_del_hogar(hogar_id));

-- Estas dos cuelgan del mes, así que el hogar se alcanza por la llave.
create policy del_hogar on lineas_presupuesto
  for all using (
    exists (select 1 from meses m where m.id = mes_id and es_miembro_del_hogar(m.hogar_id))
  ) with check (
    exists (select 1 from meses m where m.id = mes_id and es_miembro_del_hogar(m.hogar_id))
  );

create policy del_hogar on asignaciones
  for all using (
    exists (select 1 from meses m where m.id = mes_id and es_miembro_del_hogar(m.hogar_id))
  ) with check (
    exists (select 1 from meses m where m.id = mes_id and es_miembro_del_hogar(m.hogar_id))
  );

create policy propio on preferencias_aviso
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- El registro de envíos lo escribe el cron con la llave de servicio; el
-- usuario solo lee lo suyo.
create policy propio_lectura on envios_aviso
  for select using (usuario_id = auth.uid());

-- Los códigos de cortesía se canjean desde el servidor. Nadie los lee desde el
-- cliente: si se pudieran listar, se podrían adivinar.
