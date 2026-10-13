-- =============================================================================
--  20261013005845_archivos.sql · Barrio Mama Antula
-- -----------------------------------------------------------------------------
--  Archivos (fotos y documentos) vinculados a cualquier entidad del sistema.
--  Usa InsForge Storage (S3-compatible) para los blobs y esta tabla para
--  la metadata. El bucket se crea con el CLI (`storage create-bucket archivos`).
--
--    archivos .............. (NUEVA) metadata de los archivos subidos
--
--  Relación polimórfica: `entidad` + `entidad_id` apuntan a la tabla y fila
--  dueñas del archivo (problemas, propuestas, manzanas, equipamiento...).
--  No se crea una tabla `fotos` ni `documentos` separada: el tipo está en el
--  campo `tipo` (catálogo tipo_archivo).
--
--  Idempotente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Archivos
-- ---------------------------------------------------------------------------
create table if not exists public.archivos (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null default 'foto',
  dominio_tipo  text generated always as ('tipo_archivo') stored,
  nombre        text not null,
  descripcion   text,
  -- Storage: url pública y key interna. AMBAS son necesarias para descargar/borrar.
  url           text not null,
  storage_key   text not null,
  bucket        text not null default 'archivos',
  mime_type     text,
  tamano_bytes  bigint,
  -- Entidad dueña del archivo (polimórfica)
  entidad       text not null,
  entidad_id    integer not null,
  -- Autor
  subido_por    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint archivos_entidad_ck check (entidad in (
    'problemas', 'propuestas', 'manzanas', 'parcelas', 'calles',
    'waterways', 'entradas', 'espacios_publicos', 'equipamiento',
    'servicios', 'luminaria_publica', 'barrios'
  ))
);

create index if not exists archivos_entidad_idx on public.archivos (entidad, entidad_id);
create index if not exists archivos_tipo_idx on public.archivos (tipo);
create index if not exists archivos_subido_por_idx on public.archivos (subido_por);

drop trigger if exists trg_archivos_updated_at on public.archivos;
create trigger trg_archivos_updated_at
  before update on public.archivos
  for each row execute function public.set_updated_at();

comment on table public.archivos is
  'Metadata de archivos (fotos y documentos) guardados en InsForge Storage (bucket "archivos"). '
  'CAMPO OBLIGATORIO: guardar SIEMPRE tanto `url` como `storage_key`. '
  'La `url` sirve para mostrar; el `storage_key` sirve para borrar o regenerar la URL firmada. '
  'Relación polimórfica: `entidad` + `entidad_id`. Valores válidos en CHECK entidad_ck.';

-- ---------------------------------------------------------------------------
-- 2. Claves foráneas a catálogos
-- ---------------------------------------------------------------------------
do $do$
declare
  r        record;
  v_malos  bigint;
  v_nombre text;
begin
  for r in
    select * from (values
      ('archivos', 'tipo', 'tipo_archivo')
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
end
$do$;

-- ---------------------------------------------------------------------------
-- 3. Bucket de Storage
--    Se crea desde el CLI o desde el panel; acá solo se documenta el comando.
--    El bucket se llama "archivos" y es PRIVADO por defecto (solo sube el
--    dueño; la lectura pública se habilita con una política de Storage).
--    Para probar en local: npx -y @insforge/cli storage create-bucket archivos
-- ---------------------------------------------------------------------------
comment on table public.archivos is
  'Bucket de Storage: "archivos" (crear con `npx -y @insforge/cli storage create-bucket archivos`). '
  'Política de lectura pública sobre archivos públicos: se configura en el panel de Storage '
  'o con RLS sobre storage.objects (ver docs/04-seguridad-rls.md). '
  'Tamaño máximo por defecto: 50 MB. MIME permitidos: image/*, application/pdf, video/mp4.';