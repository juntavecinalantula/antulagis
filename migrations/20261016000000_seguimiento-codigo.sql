-- =============================================================================
--  20261016000000_seguimiento_codigo.sql · Barrio Mama Antula
-- -----------------------------------------------------------------------------
--  Inspirado en Pulso Ciudadano (códigos tipo PC-1048) y Munify (trazabilidad
--  "de punta a punta"): cada problema y cada propuesta recibe un CÓDIGO PÚBLICO
--  legible que el vecino puede usar para consultar su seguimiento.
--
--    formato: MA-AAAA-NNNN   (MA = Mama Antula, año de carga, correlativo anual)
--
--  Idempotente. Ver docs/04-benchmark-paginas-vecinales.md.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Secuencia correlativa por año + función generadora
-- ---------------------------------------------------------------------------
create sequence if not exists public.seq_reporte_anio;

create or replace function public.siguiente_codigo_reporte()
returns text
language sql
volatile
as $fn$
  select format('MA-%s-%s', to_char(now(), 'YYYY'),
                 lpad(nextval('public.seq_reporte_anio')::text, 4, '0'));
$fn$;

comment on function public.siguiente_codigo_reporte() is
  'Genera el código público de seguimiento (MA-AAAA-NNNN). Correlativo global.';

-- ---------------------------------------------------------------------------
-- 2. Columna `codigo` en problemas y propuestas
-- ---------------------------------------------------------------------------
alter table public.problemas  add column if not exists codigo text unique
  default public.siguiente_codigo_reporte();
alter table public.propuestas add column if not exists codigo text unique
  default public.siguiente_codigo_reporte();

-- Backfill de filas existentes sin código (hoy ambas tablas están vacías).
do $do$
declare r record;
begin
  for r in select id from public.problemas where codigo is null loop
    update public.problemas set codigo = public.siguiente_codigo_reporte() where id = r.id;
  end loop;
  for r in select id from public.propuestas where codigo is null loop
    update public.propuestas set codigo = public.siguiente_codigo_reporte() where id = r.id;
  end loop;
end
$do$;

create index if not exists problemas_codigo_idx  on public.problemas  (codigo);
create index if not exists propuestas_codigo_idx on public.propuestas (codigo);

comment on column public.problemas.codigo is
  'Código público de seguimiento (MA-AAAA-NNNN). Lo ve el vecino al reportar y sirve para buscar su reporte.';
comment on column public.propuestas.codigo is
  'Código público de la propuesta (MA-AAAA-NNNN).';
