-- =============================================================================
--  20261013005849_rls.sql · Barrio Mama Antula
-- -----------------------------------------------------------------------------
--  Políticas de Row Level Security (RLS) para todo el esquema público.
--
--  PRINCIPIOS (ver docs/04-seguridad-rls.md y la skill insforge-cli):
--    1. RLS es la ÚLTIMA línea de defensa, no la única.
--    2. InsForge da privilegios amplios (DML) a `anon` y `authenticated` en
--       `public`; las políticas DECIDEN el acceso a nivel de fila.
--    3. Si se quiere una superficie más estrecha que la default, se hace
--       REVOKE del privilegio amplio y GRANT de la operación/columna exacta.
--    4. TODA política INSERT/UPDATE lleva WITH CHECK.
--    5. NINGUNA función de ayuda llamada desde una política consulta tablas
--       con RLS sin ser SECURITY DEFINER con search_path fijado.
--    6. Los campos protegidos (rol, verificado, manzana_id, autor_id) se
--       guardan también con un trigger BEFORE UPDATE, no solo con RLS.
--
--  MAPA DE ACCESO POR TABLA:
--
--  ┌─────────────────────┬────────────────────────────────────────────────────┐
--  │ Tabla               │ SELECT              │ INSERT/UPDATE/DELETE         │
--  ├─────────────────────┼─────────────────────┼──────────────────────────────┤
--  │ barrios             │ anon, auth (public) │ editor (colaborador + admin) │
--  │ manzanas            │ anon, auth (public) │ editor                       │
--  │ parcelas            │ anon, auth (public) │ editor                       │
--  │ calles              │ anon, auth (public) │ editor                       │
--  │ waterways           │ anon, auth (public) │ editor                       │
--  │ entradas            │ anon, auth (public) │ editor                       │
--  │ espacios_publicos   │ anon, auth (public) │ editor                       │
--  │ equipamiento        │ anon, auth (public) │ editor                       │
--  │ servicios           │ anon, auth (public) │ editor                       │
--  │ luminaria_publica   │ anon, auth (public) │ editor                       │
--  ├─────────────────────┼─────────────────────┼──────────────────────────────┤
--  │ perfiles            │ SOLO auth + dueño   │ SOLO auth + dueño (+ admin)  │
--  │ perfiles_públicos   │ anon, auth (RPC)    │ — (función SECURITY DEFINER) │
--  ├─────────────────────┼─────────────────────┼──────────────────────────────┤
--  │ problemas           │ anon, auth (public) │ auth (dueño con autor_id)    │
--  │ propuestas          │ anon, auth (public) │ auth (dueño con autor_id)    │
--  │ propuestas_apoyos   │ auth (dueño)        │ auth (auto, 1 por propuesta) │
--  │ historial_estados   │ auth (dueño)        │ trigger only                 │
--  ├─────────────────────┼─────────────────────┼──────────────────────────────┤
--  │ archivos            │ auth (dueño o editor)│ auth (dueño o editor)       │
--  └─────────────────────┴─────────────────────┴──────────────────────────────┘
--
--  "editor" = colaborador o admin (función es_editor()).
--  "dueño"  = autor_id = auth.uid() (problemas/propuestas) o subido_por = auth.uid() (archivos).
--
--  Se ejecuta como project_admin. Idempotente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Habilitar RLS en TODAS las tablas del modelo
--    (las heredadas que ya lo tienen se saltan)
-- ---------------------------------------------------------------------------
do $do$
declare
  t text;
begin
  for t in select unnest(array[
    'barrios', 'manzanas', 'parcelas', 'calles', 'waterways', 'entradas',
    'espacios_publicos', 'equipamiento', 'servicios', 'luminaria_publica',
    'perfiles', 'problemas', 'propuestas', 'propuestas_apoyos',
    'historial_estados', 'archivos'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$do$;

-- ---------------------------------------------------------------------------
-- 2. Privilegios SQL (RLS no otorga privilegios; estos sí)
--    InsForge ya da DML amplio. Si se quiere restringir columnas, aquí.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- Capas del mapa: lectura pública total, escritura solo editor
grant select on
  public.barrios, public.manzanas, public.parcelas, public.calles,
  public.waterways, public.entradas, public.espacios_publicos,
  public.equipamiento, public.servicios, public.luminaria_publica
  to anon, authenticated;

grant insert, update, delete on
  public.barrios, public.manzanas, public.parcelas, public.calles,
  public.waterways, public.entradas, public.espacios_publicos,
  public.equipamiento, public.servicios, public.luminaria_publica
  to authenticated;

-- Perfiles: tabla privada (sin SELECT para anon). La proyección pública es vía función RPC.
revoke all on public.perfiles from anon;
grant select, insert, update on public.perfiles to authenticated;

-- Perfiles públicos: expuestos vía función obtener_perfiles_publicos() (RPC), no hay vista.

-- Problemas / propuestas: lectura pública, escritura solo dueño (o editor/admin vía trigger)
grant select on public.problemas, public.propuestas, public.historial_estados to anon, authenticated;
grant insert, update on public.problemas, public.propuestas to authenticated;
grant insert, delete on public.propuestas_apoyos to authenticated;
grant select on public.propuestas_apoyos to authenticated;

-- Archivos: lectura autenticada (dueño/editor), escritura autenticada (dueño/editor)
grant select on public.archivos to authenticated;
grant insert, update, delete on public.archivos to authenticated;

-- Catálogos: lectura para todos (necesaria para validaciones y selects en formularios)
grant select on public.catalogos to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Capas del mapa: lectura pública, escritura solo editor
--    Patrón: una política SELECT para anon+auth, una FOR ALL (con CHECK) para editor.
--    Se usan las funciones SECURITY DEFINER es_editor() / es_admin().
-- ---------------------------------------------------------------------------
do $do$
declare
  t text;
begin
  for t in select unnest(array[
    'barrios', 'manzanas', 'parcelas', 'calles', 'waterways', 'entradas',
    'espacios_publicos', 'equipamiento', 'servicios', 'luminaria_publica'
  ])
  loop
    -- SELECT público
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname = t || '_public_read'
    ) then
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (true)',
        t || '_public_read', t);
    end if;

    -- INSERT/UPDATE/DELETE solo editor (colaborador + admin)
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname = t || '_editor_write'
    ) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.es_editor()) with check (public.es_editor())',
        t || '_editor_write', t);
    end if;
  end loop;
end
$do$;

-- ---------------------------------------------------------------------------
-- 4. Perfiles: tabla privada
--    - SELECT: solo el dueño (o admin)
--    - INSERT: trigger automático al registrarse (ya lo hace crear_perfil_al_registrarse)
--    - UPDATE: solo el dueño, pero campos protegidos (rol, verificado, manzana_id, activo)
--              requieren admin (guarda el trigger proteger_campos_perfil)
-- ---------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='perfiles' and policyname='perfiles_owner_read'
  ) then
    execute 'create policy perfiles_owner_read on public.perfiles
             for select to authenticated using (id = (select auth.uid()))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='perfiles' and policyname='perfiles_owner_write'
  ) then
    execute 'create policy perfiles_owner_write on public.perfiles
             for update to authenticated
             using (id = (select auth.uid()))
             with check (id = (select auth.uid()))';
  end if;

  -- Admin tiene acceso total a perfiles
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='perfiles' and policyname='perfiles_admin_all'
  ) then
    execute 'create policy perfiles_admin_all on public.perfiles
             for all to authenticated using (public.es_admin()) with check (public.es_admin())';
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 5. Función pública segura de perfiles (sustituto de vista para PostgREST)
-- ---------------------------------------------------------------------------
create or replace function public.obtener_perfiles_publicos()
returns table (id uuid, apodo text, rol text)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $fn$
  select id, apodo, rol
  from public.perfiles
  where activo;
$fn$;

grant execute on function public.obtener_perfiles_publicos() to anon, authenticated;

comment on function public.obtener_perfiles_publicos() is
  'Proyección pública segura de perfiles (RPC): solo id, apodo y rol. '
  'NUNCA expone email, teléfono, verificado, manzana_id ni observaciones. '
  'Invocable vía REST RPC de InsForge: /api/database/rpc/obtener_perfiles_publicos';

-- ---------------------------------------------------------------------------
-- 6. Problemas: lectura pública, escritura dueño (o editor/admin)
-- ---------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='problemas' and policyname='problemas_public_read'
  ) then
    execute 'create policy problemas_public_read on public.problemas
             for select to anon, authenticated using (true)';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='problemas' and policyname='problemas_owner_insert'
  ) then
    execute 'create policy problemas_owner_insert on public.problemas
             for insert to authenticated
             with check (autor_id = (select auth.uid()) or public.es_editor())';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='problemas' and policyname='problemas_owner_update'
  ) then
    execute 'create policy problemas_owner_update on public.problemas
             for update to authenticated
             using (autor_id = (select auth.uid()) or public.es_editor())
             with check (autor_id = (select auth.uid()) or public.es_editor())';
  end if;

  -- Admin acceso total
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='problemas' and policyname='problemas_admin_all'
  ) then
    execute 'create policy problemas_admin_all on public.problemas
             for all to authenticated using (public.es_admin()) with check (public.es_admin())';
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 7. Propuestas: lectura pública, escritura dueño (o editor/admin)
-- ---------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='propuestas' and policyname='propuestas_public_read'
  ) then
    execute 'create policy propuestas_public_read on public.propuestas
             for select to anon, authenticated using (true)';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='propuestas' and policyname='propuestas_owner_insert'
  ) then
    execute 'create policy propuestas_owner_insert on public.propuestas
             for insert to authenticated
             with check (autor_id = (select auth.uid()) or public.es_editor())';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='propuestas' and policyname='propuestas_owner_update'
  ) then
    execute 'create policy propuestas_owner_update on public.propuestas
             for update to authenticated
             using (autor_id = (select auth.uid()) or public.es_editor())
             with check (autor_id = (select auth.uid()) or public.es_editor())';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='propuestas' and policyname='propuestas_admin_all'
  ) then
    execute 'create policy propuestas_admin_all on public.propuestas
             for all to authenticated using (public.es_admin()) with check (public.es_admin())';
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 8. Apoyos: solo dueño del apoyo (INSERT/DELETE) y lectura autenticada
-- ---------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='propuestas_apoyos' and policyname='apoyos_owner_insert'
  ) then
    execute 'create policy apoyos_owner_insert on public.propuestas_apoyos
             for insert to authenticated
             with check (usuario_id = (select auth.uid()))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='propuestas_apoyos' and policyname='apoyos_owner_delete'
  ) then
    execute 'create policy apoyos_owner_delete on public.propuestas_apoyos
             for delete to authenticated
             using (usuario_id = (select auth.uid()))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='propuestas_apoyos' and policyname='apoyos_auth_read'
  ) then
    execute 'create policy apoyos_auth_read on public.propuestas_apoyos
             for select to authenticated using (true)';
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 9. Historial: solo dueño (y admin), lectura autenticada
-- ---------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='historial_estados' and policyname='historial_owner_read'
  ) then
    execute 'create policy historial_owner_read on public.historial_estados
             for select to authenticated using (usuario_id = (select auth.uid()) or public.es_admin())';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='historial_estados' and policyname='historial_admin_all'
  ) then
    execute 'create policy historial_admin_all on public.historial_estados
             for all to authenticated using (public.es_admin()) with check (public.es_admin())';
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 10. Archivos: dueño o editor
-- ---------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='archivos' and policyname='archivos_owner_or_editor_read'
  ) then
    execute 'create policy archivos_owner_or_editor_read on public.archivos
             for select to authenticated using (subido_por = (select auth.uid()) or public.es_editor())';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='archivos' and policyname='archivos_owner_or_editor_insert'
  ) then
    execute 'create policy archivos_owner_or_editor_insert on public.archivos
             for insert to authenticated
             with check (subido_por = (select auth.uid()) or public.es_editor())';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='archivos' and policyname='archivos_owner_or_editor_update'
  ) then
    execute 'create policy archivos_owner_or_editor_update on public.archivos
             for update to authenticated
             using (subido_por = (select auth.uid()) or public.es_editor())
             with check (subido_por = (select auth.uid()) or public.es_editor())';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='archivos' and policyname='archivos_owner_or_editor_delete'
  ) then
    execute 'create policy archivos_owner_or_editor_delete on public.archivos
             for delete to authenticated
             using (subido_por = (select auth.uid()) or public.es_editor())';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='archivos' and policyname='archivos_admin_all'
  ) then
    execute 'create policy archivos_admin_all on public.archivos
             for all to authenticated using (public.es_admin()) with check (public.es_admin())';
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 11. Catálogos: solo admin escribe, todos leen
-- ---------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='catalogos' and policyname='catalogos_public_read'
  ) then
    execute 'create policy catalogos_public_read on public.catalogos
             for select to anon, authenticated using (activo)';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='catalogos' and policyname='catalogos_admin_write'
  ) then
    execute 'create policy catalogos_admin_write on public.catalogos
             for all to authenticated using (public.es_admin()) with check (public.es_admin())';
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 12. Verificación rápida: contar políticas por tabla
-- ---------------------------------------------------------------------------
comment on table public.perfiles is
  'RLS: owner_read + owner_write + admin_all. Función pública: obtener_perfiles_publicos().';
comment on table public.problemas is
  'RLS: public_read + owner_write + admin_all. autor_id es la clave de pertenencia.';
comment on table public.propuestas is
  'RLS: public_read + owner_write + admin_all. autor_id es la clave de pertenencia.';
comment on table public.archivos is
  'RLS: owner_or_editor_read + owner_or_editor_write + admin_all. subido_por es la clave.';