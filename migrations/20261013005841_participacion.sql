-- =============================================================================
--  20261013005841_participacion.sql · Barrio Mama Antula
-- -----------------------------------------------------------------------------
--  El contenido que carga el vecino.
--
--    problemas ............ (existe, 0 filas) reclamos y problemas del barrio
--    propuestas ........... (existe, 0 filas) propuestas vecinales
--    propuestas_apoyos .... (NUEVA) un apoyo por vecino y propuesta
--    historial_estados .... (NUEVA) traza de cada cambio de estado
--
--  La tabla canónica de «problemas / reclamos» es `problemas`. NO se crea una
--  tabla `reclamos` para no tener dos verdades.
--
--  Normalización de valores: `problemas.estado` traía el default 'Nuevo' y
--  `propuestas.estado` el default 'Nueva'; los catálogos usan minúscula
--  ('nuevo'). Ambas tablas están vacías, así que el cambio no mueve datos.
--
--  Idempotente. Ver docs/03-base-de-datos.md.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Punto ↔ lat/lon: una sola verdad, sincronizada
--    Las columnas `lat` y `lon` son heredadas. Si hay geometría, manda la
--    geometría; si solo hay coordenadas, se arma el punto.
-- ---------------------------------------------------------------------------
create or replace function public.sincronizar_lat_lon()
returns trigger
language plpgsql
as $fn$
begin
  if new.geom is not null then
    new.lon := st_x(new.geom);
    new.lat := st_y(new.geom);
  elsif new.lon is not null and new.lat is not null then
    new.geom := st_setsrid(st_makepoint(new.lon, new.lat), 4326);
  end if;
  return new;
end
$fn$;

comment on function public.sincronizar_lat_lon() is
  'BEFORE INSERT/UPDATE: mantiene coherentes geom y las columnas heredadas lat/lon. Si hay geom, manda geom.';

-- ---------------------------------------------------------------------------
-- 2. Problemas / reclamos
--    (existente: id, categoria NOT NULL, descripcion NOT NULL, lat, lon, geom,
--     estado NOT NULL default 'Nuevo', created_at)
-- ---------------------------------------------------------------------------
alter table public.problemas add column if not exists titulo         text;
alter table public.problemas add column if not exists direccion      text;
alter table public.problemas add column if not exists canal          text not null default 'web';
alter table public.problemas add column if not exists prioridad      text not null default 'media';
alter table public.problemas add column if not exists barrio_id      integer;
alter table public.problemas add column if not exists manzana_id     integer;
alter table public.problemas add column if not exists calle_id       integer;
alter table public.problemas add column if not exists autor_id       uuid;
alter table public.problemas add column if not exists resuelto_en    timestamptz;
alter table public.problemas add column if not exists updated_at     timestamptz not null default now();
alter table public.problemas add column if not exists dominio_categoria text generated always as ('categoria_problema') stored;
alter table public.problemas add column if not exists dominio_estado    text generated always as ('estado_reporte') stored;
alter table public.problemas add column if not exists dominio_prioridad text generated always as ('prioridad') stored;
alter table public.problemas add column if not exists dominio_canal     text generated always as ('canal_reporte') stored;

-- Normalizar estado: el default heredado era 'Nuevo' (mayúscula); catálogo usa 'nuevo'.
-- La tabla está vacía, así que solo se cambia el default y se deja NOT NULL.
update public.problemas set estado = lower(estado) where estado is not null;
alter table public.problemas alter column estado set default 'nuevo';

-- Sin categoría no se puede agrupar ni dibujar leyenda.
update public.problemas set categoria = lower(categoria) where categoria is not null;
alter table public.problemas alter column categoria set default 'otro';
alter table public.problemas alter column categoria set not null;

create index if not exists problemas_geom_gix      on public.problemas using gist (geom) where geom is not null;
create index if not exists problemas_estado_idx    on public.problemas (estado);
create index if not exists problemas_categoria_idx on public.problemas (categoria);
create index if not exists problemas_created_idx   on public.problemas (created_at desc);
create index if not exists problemas_autor_idx     on public.problemas (autor_id);

drop trigger if exists trg_problemas_updated_at on public.problemas;
create trigger trg_problemas_updated_at
  before update on public.problemas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_problemas_lat_lon on public.problemas;
create trigger trg_problemas_lat_lon
  before insert or update of geom, lon, lat on public.problemas
  for each row execute function public.sincronizar_lat_lon();

comment on table public.problemas is
  'Problemas y reclamos del barrio. Es la capa pública que alimenta el visor. '
  'Regla de privacidad: nada de datos personales en titulo/descripcion; el contacto vive en perfiles, que no es público.';
comment on column public.problemas.lat is
  'Latitud heredada. Se mantiene sincronizada con geom por el trigger trg_problemas_lat_lon.';
comment on column public.problemas.canal is
  'Cómo llegó el reclamo: web, qgis, oficina, whatsapp, papel, otro (catálogo canal_reporte).';

-- ---------------------------------------------------------------------------
-- 3. Propuestas vecinales
--    (existente: id, titulo NOT NULL, categoria NOT NULL, descripcion NOT NULL,
--     estado NOT NULL default 'Nueva', lat, lon, geom, created_at)
-- ---------------------------------------------------------------------------
alter table public.propuestas add column if not exists lng        double precision;
alter table public.propuestas add column if not exists direccion  text;
alter table public.propuestas add column if not exists canal      text not null default 'web';
alter table public.propuestas add column if not exists apoyos     integer not null default 0;
alter table public.propuestas add column if not exists barrio_id  integer;
alter table public.propuestas add column if not exists manzana_id integer;
alter table public.propuestas add column if not exists autor_id   uuid;
alter table public.propuestas add column if not exists updated_at timestamptz not null default now();
alter table public.propuestas add column if not exists dominio_categoria text generated always as ('categoria_propuesta') stored;
alter table public.propuestas add column if not exists dominio_estado    text generated always as ('estado_reporte') stored;
alter table public.propuestas add column if not exists dominio_canal     text generated always as ('canal_reporte') stored;

update public.propuestas set estado = lower(estado) where estado is not null;
alter table public.propuestas alter column estado set default 'nuevo';
alter table public.propuestas alter column estado set not null;

update public.propuestas set categoria = lower(categoria) where categoria is not null;
alter table public.propuestas alter column categoria set default 'otro';
alter table public.propuestas alter column categoria set not null;

update public.propuestas set titulo = left(descripcion, 120) where titulo is null and descripcion is not null;

create index if not exists propuestas_geom_gix      on public.propuestas using gist (geom) where geom is not null;
create index if not exists propuestas_estado_idx    on public.propuestas (estado);
create index if not exists propuestas_categoria_idx on public.propuestas (categoria);
create index if not exists propuestas_apoyos_idx    on public.propuestas (apoyos desc);
create index if not exists propuestas_created_idx   on public.propuestas (created_at desc);
create index if not exists propuestas_autor_idx     on public.propuestas (autor_id);

drop trigger if exists trg_propuestas_updated_at on public.propuestas;
create trigger trg_propuestas_updated_at
  before update on public.propuestas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_propuestas_lat_lon on public.propuestas;
create trigger trg_propuestas_lat_lon
  before insert or update of geom, lng, lat on public.propuestas
  for each row execute function public.sincronizar_lat_lon();

comment on column public.propuestas.apoyos is
  'Contador desnormalizado de apoyos. Lo mantiene el trigger de propuestas_apoyos: no editarlo a mano.';

-- ---------------------------------------------------------------------------
-- 4. Apoyos a las propuestas (un apoyo por vecino y propuesta)
-- ---------------------------------------------------------------------------
create table if not exists public.propuestas_apoyos (
  propuesta_id integer not null,
  usuario_id   uuid    not null references auth.users (id) on delete cascade,
  comentario   text,
  created_at   timestamptz not null default now(),
  constraint propuestas_apoyos_pkey primary key (propuesta_id, usuario_id)
);

create index if not exists propuestas_apoyos_usuario_idx on public.propuestas_apoyos (usuario_id);

create or replace function public.ajustar_contador_apoyos()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $fn$
declare
  v_id integer;
begin
  if tg_op = 'DELETE' then
    v_id := old.propuesta_id;
  else
    v_id := new.propuesta_id;
  end if;

  update public.propuestas p
     set apoyos = (select count(*) from public.propuestas_apoyos a where a.propuesta_id = v_id)
   where p.id = v_id;

  return null;
end
$fn$;

drop trigger if exists trg_apoyos_contador on public.propuestas_apoyos;
create trigger trg_apoyos_contador
  after insert or delete on public.propuestas_apoyos
  for each row execute function public.ajustar_contador_apoyos();

-- ---------------------------------------------------------------------------
-- 5. Historial de estados (quién cambió qué y cuándo)
-- ---------------------------------------------------------------------------
create table if not exists public.historial_estados (
  id               bigint generated by default as identity primary key,
  entidad          text not null,
  entidad_id       integer not null,
  estado_anterior  text,
  estado_nuevo     text not null,
  comentario       text,
  usuario_id       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint historial_estados_entidad_ck check (entidad in ('problemas', 'propuestas'))
);

create index if not exists historial_estados_entidad_idx on public.historial_estados (entidad, entidad_id, created_at desc);

create or replace function public.registrar_cambio_estado()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $fn$
begin
  if new.estado is distinct from old.estado then
    insert into public.historial_estados (entidad, entidad_id, estado_anterior, estado_nuevo, usuario_id)
    values (tg_table_name, new.id, old.estado, new.estado, auth.uid());

    if new.estado = 'resuelto' and to_jsonb(new) ? 'resuelto_en' then
      new.resuelto_en := now();
    elsif to_jsonb(new) ? 'resuelto_en' and new.estado <> 'resuelto' then
      new.resuelto_en := null;
    end if;
  end if;
  return new;
end
$fn$;

drop trigger if exists trg_problemas_historial on public.problemas;
create trigger trg_problemas_historial
  before update of estado on public.problemas
  for each row execute function public.registrar_cambio_estado();

drop trigger if exists trg_propuestas_historial on public.propuestas;
create trigger trg_propuestas_historial
  before update of estado on public.propuestas
  for each row execute function public.registrar_cambio_estado();

comment on table public.historial_estados is
  'Traza inmutable de cambios de estado de problemas y propuestas. La escribe un trigger, no la aplicación.';

-- ---------------------------------------------------------------------------
-- 6. Claves foráneas y catálogos
-- ---------------------------------------------------------------------------
do $do$
declare
  r        record;
  v_malos  bigint;
  v_nombre text;
begin
  -- 6.a Referencias entre capas --------------------------------------------
  for r in
    select * from (values
      ('problemas',        'barrio_id',  'barrios',  'id'),
      ('problemas',        'manzana_id', 'manzanas', 'id'),
      ('problemas',        'calle_id',   'calles',   'id'),
      ('propuestas',       'barrio_id',  'barrios',  'id'),
      ('propuestas',       'manzana_id', 'manzanas', 'id'),
      ('propuestas_apoyos', 'propuesta_id', 'propuestas', 'id')
    ) as t(tabla, columna, ref_tabla, ref_columna)
  loop
    if not exists (
      select 1 from pg_constraint
       where conname = r.tabla || '_' || r.columna || '_fk'
         and conrelid = format('public.%I', r.tabla)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I (%I) on delete cascade not valid',
        r.tabla, r.tabla || '_' || r.columna || '_fk', r.columna, r.ref_tabla, r.ref_columna);
    end if;

    begin
      execute format('alter table public.%I validate constraint %I',
                     r.tabla, r.tabla || '_' || r.columna || '_fk');
    exception when foreign_key_violation then
      execute format(
        'select count(*) from public.%I x where x.%I is not null and not exists (select 1 from public.%I y where y.%I = x.%I)',
        r.tabla, r.columna, r.ref_tabla, r.ref_columna, r.columna) into v_malos;
      raise warning 'FK %.%: % fila(s) sin destino válido.', r.tabla, r.columna, v_malos;
    end;
  end loop;

  -- 6.b Autor → auth.users -------------------------------------------------
  for r in
    select * from (values ('problemas'), ('propuestas')) as t(tabla)
  loop
    if not exists (
      select 1 from pg_constraint
       where conname = r.tabla || '_autor_id_fk'
         and conrelid = format('public.%I', r.tabla)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (autor_id) references auth.users (id) on delete set null not valid',
        r.tabla, r.tabla || '_autor_id_fk');
    end if;
    execute format('alter table public.%I validate constraint %I', r.tabla, r.tabla || '_autor_id_fk');
  end loop;

  -- 6.c Catálogos ----------------------------------------------------------
  for r in
    select * from (values
      ('problemas',  'categoria', 'categoria_problema'),
      ('problemas',  'estado',    'estado_reporte'),
      ('problemas',  'prioridad', 'prioridad'),
      ('problemas',  'canal',     'canal_reporte'),
      ('propuestas', 'categoria', 'categoria_propuesta'),
      ('propuestas', 'estado',    'estado_reporte'),
      ('propuestas', 'canal',     'canal_reporte')
    ) as t(tabla, columna, dominio)
  loop
    v_nombre := r.tabla || '_' || r.columna || '_cat_fk';

    if not exists (
      select 1 from pg_constraint
       where conname = v_nombre and conrelid = format('public.%I', r.tabla)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I, %I) references public.catalogos (dominio, codigo) not valid',
        r.tabla, v_nombre, 'dominio_' || r.columna, r.columna);
    end if;

    begin
      execute format('alter table public.%I validate constraint %I', r.tabla, v_nombre);
    exception when foreign_key_violation then
      execute format(
        'select count(*) from public.%I x where x.%I is not null and not exists (select 1 from public.catalogos c where c.dominio = %L and c.codigo = x.%I)',
        r.tabla, r.columna, r.dominio, r.columna) into v_malos;
      raise warning 'Catálogo %: %.% tiene % fila(s) fuera del catálogo.', r.dominio, r.tabla, r.columna, v_malos;
    end;
  end loop;

  -- 6.d Toda ubicación tiene que tener alguna referencia -------------------
  for r in
    select * from (values ('problemas'), ('propuestas')) as t(tabla)
  loop
    if not exists (
      select 1 from pg_constraint
       where conname = r.tabla || '_ubicacion_ck'
         and conrelid = format('public.%I', r.tabla)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (geom is not null or direccion is not null or lat is not null)',
        r.tabla, r.tabla || '_ubicacion_ck');
    end if;
  end loop;
end
$do$;