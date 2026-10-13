-- =============================================================================
--  0003_vecinos.sql · Barrio Mama Antula · InsForge (PostgreSQL + PostGIS)
-- -----------------------------------------------------------------------------
--  Identidad y permisos del lado de la base de datos.
--
--    perfiles .............. un registro por vecino registrado (1:1 con auth.users)
--    rol_actual() .......... rol del vecino que hace la consulta
--    es_editor() ........... colaborador o admin
--    es_admin() ............ admin
--
--  Las funciones son SECURITY DEFINER a propósito: leen `perfiles` sin pasar por
--  sus propias políticas de RLS (si no, se produciría una recursión infinita al
--  evaluar una política sobre `perfiles`).
--
--  Idempotente. Ver docs/04-seguridad-rls.md.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Perfiles
-- ---------------------------------------------------------------------------
create table if not exists public.perfiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  nombre        text,
  apodo         text,
  email         text,
  telefono      text,
  rol           text not null default 'vecino',
  dominio_rol   text generated always as ('rol_vecino') stored,
  manzana_id    integer,
  verificado    boolean not null default false,
  activo        boolean not null default true,
  observaciones text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint perfiles_nombre_largo check (nombre is null or length(nombre) between 2 and 80)
);

create index if not exists perfiles_rol_idx     on public.perfiles (rol) where activo;
create index if not exists perfiles_manzana_idx on public.perfiles (manzana_id);

drop trigger if exists trg_perfiles_updated_at on public.perfiles;
create trigger trg_perfiles_updated_at
  before update on public.perfiles
  for each row execute function public.set_updated_at();

comment on table public.perfiles is
  'Datos del vecino registrado. La fila se crea sola al registrarse (trigger sobre auth.users). '
  'El rol decide qué puede hacer en el mapa: vecino (leer + reclamar), colaborador (editar capas), admin.';
comment on column public.perfiles.telefono is
  'Dato personal: NO exponer en la API pública. Ver las políticas de RLS en 0007_rls.sql.';

-- ---------------------------------------------------------------------------
-- 2. Perfil automático al registrarse
--    Se usa to_jsonb(new) para no depender de que auth.users tenga exactamente
--    las columnas de Supabase. Cualquier fallo se convierte en un aviso: nunca
--    puede romper el registro de un vecino.
-- ---------------------------------------------------------------------------
create or replace function public.crear_perfil_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_email  text;
  v_nombre text;
begin
  v_email := nullif(to_jsonb(new) ->> 'email', '');
  v_nombre := coalesce(
    nullif(to_jsonb(new) ->> 'name', ''),
    nullif(to_jsonb(new) -> 'user_metadata' ->> 'name', ''),
    nullif(split_part(coalesce(v_email, ''), '@', 1), '')
  );

  begin
    insert into public.perfiles (id, email, nombre, rol)
    values (new.id, v_email, v_nombre, 'vecino')
    on conflict (id) do nothing;
  exception when others then
    raise warning 'No se pudo crear el perfil de % (%): %', new.id, v_email, sqlerrm;
  end;

  return new;
end
$fn$;

do $do$
begin
  if to_regclass('auth.users') is not null then
    execute 'drop trigger if exists trg_auth_users_crear_perfil on auth.users';
    execute 'create trigger trg_auth_users_crear_perfil
               after insert on auth.users
               for each row execute function public.crear_perfil_al_registrarse()';
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 3. Funciones de rol para las políticas de RLS
-- ---------------------------------------------------------------------------
create or replace function public.usuario_actual()
returns uuid
language sql
stable
as $fn$
  select auth.uid()
$fn$;

create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select p.rol
    from public.perfiles p
   where p.id = auth.uid()
     and p.activo
$fn$;

create or replace function public.es_editor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(public.rol_actual() in ('colaborador', 'admin'), false)
$fn$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(public.rol_actual() = 'admin', false)
$fn$;

comment on function public.es_editor() is
  'true si quien consulta es colaborador o admin. Se usa en las políticas de escritura de las capas del mapa.';
comment on function public.es_admin() is
  'true si quien consulta es admin. Se usa para gestionar perfiles y catálogos.';

-- ---------------------------------------------------------------------------
-- 4. Claves foráneas de perfiles
-- ---------------------------------------------------------------------------
do $do$
declare
  r       record;
  v_malos bigint;
  v_nombre text;
begin
  -- manzana_id → manzanas(id)
  if not exists (
    select 1 from pg_constraint
     where conname = 'perfiles_manzana_id_fk' and conrelid = 'public.perfiles'::regclass
  ) then
    execute 'alter table public.perfiles add constraint perfiles_manzana_id_fk
               foreign key (manzana_id) references public.manzanas (id) not valid';
  end if;
  begin
    execute 'alter table public.perfiles validate constraint perfiles_manzana_id_fk';
  exception when foreign_key_violation then
    select count(*) into v_malos from public.perfiles p
     where p.manzana_id is not null
       and not exists (select 1 from public.manzanas m where m.id = p.manzana_id);
    raise warning 'perfiles.manzana_id: % fila(s) sin manzana válida.', v_malos;
  end;

  -- rol → catálogo rol_vecino
  if not exists (
    select 1 from pg_constraint
     where conname = 'perfiles_rol_cat_fk' and conrelid = 'public.perfiles'::regclass
  ) then
    execute 'alter table public.perfiles add constraint perfiles_rol_cat_fk
               foreign key (dominio_rol, rol) references public.catalogos (dominio, codigo) not valid';
  end if;
  begin
    execute 'alter table public.perfiles validate constraint perfiles_rol_cat_fk';
  exception when foreign_key_violation then
    select count(*) into v_malos from public.perfiles p
     where not exists (select 1 from public.catalogos c
                        where c.dominio = 'rol_vecino' and c.codigo = p.rol);
    raise warning 'Catálogo rol_vecino: % perfil(es) con rol inválido.', v_malos;
  end;
end
$do$;
