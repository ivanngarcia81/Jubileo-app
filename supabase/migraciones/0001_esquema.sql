-- ============================================================================
-- Jubileo — esquema inicial
--
-- Este archivo todavía no se ejecuta contra ninguna base. Es el modelo de la
-- sección 5 del SPEC, versionado, para que la migración real salga de aquí y
-- no de la memoria de nadie.
--
-- Dos decisiones que no se pueden posponer:
--
--   1. Todo el dinero va en `bigint` de centavos. Nunca `numeric`, nunca
--      `float`. El formateo es cosa de la interfaz.
--   2. El presupuesto cuelga del **hogar**, no del usuario, desde el día uno.
--      El modo pareja es fase 4, pero migrar las llaves después sería
--      rehacer media base. Al registrarse se crea un hogar de un miembro.
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
  id                     uuid primary key references auth.users (id) on delete cascade,
  correo                 text not null unique,
  nombre                 text,
  zona_horaria           text not null default 'America/New_York',
  nivel                  nivel_usuario not null default 'gratis',
  stripe_customer_id     text unique,

  frecuencia_pago        frecuencia_pago,
  -- Fecha de un cheque conocido: la base para generar todos los periodos.
  fecha_ancla            date,
  -- Solo para `dos_veces_al_mes`, ej. '{1,15}'.
  dias_pago              smallint[],
  -- Nulo cuando el ingreso es variable. Nunca se presupuesta lo que no entró.
  ingreso_esperado_cents bigint check (ingreso_esperado_cents is null or ingreso_esperado_cents >= 0),

  creado_en              timestamptz not null default now(),

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
  id        uuid primary key default gen_random_uuid(),
  hogar_id  uuid not null references hogares (id) on delete cascade,
  anio      smallint not null check (anio between 1970 and 2200),
  mes       smallint not null check (mes between 1 and 12),
  estado    estado_mes not null default 'borrador',
  cerrado_en timestamptz,
  unique (hogar_id, anio, mes)
);

create table periodos (
  id                     uuid primary key default gen_random_uuid(),
  hogar_id               uuid not null references hogares (id) on delete cascade,
  mes_id                 uuid not null references meses (id) on delete cascade,
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

  unique (mes_id, numero),
  constraint rango_coherente check (fecha_inicio <= fecha_pago and fecha_pago <= fecha_fin)
);

create index on periodos (hogar_id, fecha_pago);

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

-- La capa clave del producto.
--
-- INVARIANTE: para cada línea, la suma de sus asignaciones tiene que igualar
-- `monto_mensual_cents`. No se puede expresar como CHECK de fila; se valida
-- en src/lib/periodos/asignaciones.ts y se vuelve a comprobar en el servidor
-- al cerrar el mes. Si no cuadra, el mes no se cierra.
create table asignaciones (
  id                    uuid primary key default gen_random_uuid(),
  linea_presupuesto_id  uuid not null references lineas_presupuesto (id) on delete cascade,
  periodo_id            uuid not null references periodos (id) on delete cascade,
  monto_cents           bigint not null check (monto_cents >= 0),
  unique (linea_presupuesto_id, periodo_id)
);

create index on asignaciones (periodo_id);

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
  id                uuid primary key default gen_random_uuid(),
  hogar_id          uuid not null references hogares (id) on delete cascade,
  nombre            text not null,
  saldo_cents       bigint not null check (saldo_cents >= 0),
  pago_minimo_cents bigint not null check (pago_minimo_cents >= 0),
  tasa_interes      numeric(5, 2) check (tasa_interes >= 0),
  orden             smallint not null default 0,
  es_enfoque        boolean not null default false,
  pagada_en         date
);

-- Solo una deuda de enfoque a la vez por hogar.
create unique index deuda_enfoque_unica on deudas (hogar_id) where es_enfoque;

create table fondos_reserva (
  id               uuid primary key default gen_random_uuid(),
  hogar_id         uuid not null references hogares (id) on delete cascade,
  nombre           text not null,
  meta_cents       bigint not null check (meta_cents > 0),
  acumulado_cents  bigint not null default 0 check (acumulado_cents >= 0),
  fecha_objetivo   date
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
  codigo      text primary key,
  meses       smallint not null default 3 check (meses > 0),
  vence_en    date not null,
  usado_por   uuid references usuarios (id) on delete set null,
  usado_en    timestamptz,
  -- Un solo uso.
  constraint uso_coherente check ((usado_por is null) = (usado_en is null))
);

-- ---------------------------------------------------------------------------
-- Seguridad a nivel de fila
--
-- Todo cuelga del hogar, así que la política es siempre la misma: se ve lo
-- del hogar al que perteneces. Se activa en todas las tablas; sin política
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

create policy propio on usuarios
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy del_hogar on hogares
  for all using (es_miembro_del_hogar(id)) with check (es_miembro_del_hogar(id));

create policy del_hogar on miembros_hogar
  for all using (es_miembro_del_hogar(hogar_id)) with check (es_miembro_del_hogar(hogar_id));

create policy del_hogar on meses
  for all using (es_miembro_del_hogar(hogar_id)) with check (es_miembro_del_hogar(hogar_id));

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
    exists (
      select 1 from lineas_presupuesto l
      join meses m on m.id = l.mes_id
      where l.id = linea_presupuesto_id and es_miembro_del_hogar(m.hogar_id)
    )
  ) with check (
    exists (
      select 1 from lineas_presupuesto l
      join meses m on m.id = l.mes_id
      where l.id = linea_presupuesto_id and es_miembro_del_hogar(m.hogar_id)
    )
  );

create policy propio on preferencias_aviso
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- El registro de envíos lo escribe el cron con la llave de servicio; el
-- usuario solo lee lo suyo.
create policy propio_lectura on envios_aviso
  for select using (usuario_id = auth.uid());

-- Los códigos de cortesía se canjean desde el servidor. Nadie los lee desde
-- el cliente: si se pudieran listar, se podrían adivinar.
