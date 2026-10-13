-- =============================================================================
--  20261013005826_cimientos.sql · Barrio Mama Antula · InsForge (PG 15 + PostGIS 3.6)
-- -----------------------------------------------------------------------------
--  Punto de partida de todo el esquema. Crea:
--
--    1. PostGIS (ya está instalado: 3.6.3).
--    2. La función de mantenimiento de `updated_at`.
--    3. La tabla `catalogos` con TODOS los dominios de valores del sistema.
--
--  Esa tercera pieza es la que evita repetir el problema actual: la columna
--  `calles."Asfalto"` tiene 7 variantes de texto para 2 valores reales
--  ("Asfalto", "ripio c/c cuneta", "Ripip c/cuneta", "ripio c/c cuneta", ...).
--
--  Convenciones fijadas acá (detalle en docs/03-base-de-datos.md):
--    · SRID de almacenamiento ..... 4326 (WGS 84), igual que las capas actuales.
--    · Áreas y longitudes .......... `st_area(geom::geography)` / `st_perimeter`,
--                                    que dan metros reales sin depender de un
--                                    SRID proyectado. IMPORTANTE: el PostGIS de
--                                    este proyecto NO tiene cargado el SRID 5346
--                                    (POSGAR 2007 faja 4): `st_transform(geom,5346)`
--                                    falla con «Cannot find SRID (5346)». El
--                                    spheroid geográfico evita el problema y es
--                                    exacto para la escala de un barrio.
--    · Clave primaria de capas .... integer identity / serial, para no romper
--                                    las 13 tablas que ya existen (id integer).
--    · Clave primaria de contenido  uuid (perfiles, archivos).
--    · created_at / updated_at ..... en inglés, como las tablas existentes.
--    · Resto de los campos ......... en español, como las tablas existentes.
--    · Dominios de texto ........... FK compuesta a `catalogos` a través de una
--                                    columna generada `dominio_<campo>`.
--    · Códigos numéricos heredados . CHECK (no admiten FK texto→entero).
--
--  Se ejecuta como `project_admin`, en su propia transacción: no usar BEGIN/COMMIT.
--  Idempotente: se puede volver a aplicar sin errores.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PostGIS
-- ---------------------------------------------------------------------------
create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- 2. Mantenimiento de updated_at
--    InsForge trae `system.update_updated_at()`, equivalente pero en un esquema
--    administrado. Se define una versión propia en `public` para no depender de
--    él y poder validar el mismo SQL contra un PostgreSQL con PostGIS pelado.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE genérico: mantiene la columna updated_at. '
  'Versión portable de system.update_updated_at().';

-- ---------------------------------------------------------------------------
-- 3. Catálogos
-- ---------------------------------------------------------------------------
create table if not exists public.catalogos (
  dominio     text        not null,
  codigo      text        not null,
  nombre      text        not null,
  descripcion text,
  orden       integer     not null default 100,
  color       text,
  icono       text,
  activo      boolean     not null default true,
  extra       jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint catalogos_pkey primary key (dominio, codigo),
  constraint catalogos_dominio_formato check (dominio ~ '^[a-z0-9_]+$'),
  constraint catalogos_codigo_formato  check (codigo  ~ '^[a-z0-9_]+$'),
  constraint catalogos_color_formato   check (color is null or color ~* '^#[0-9a-f]{6}$')
);

create index if not exists catalogos_dominio_idx
  on public.catalogos (dominio, orden, codigo)
  where activo;

drop trigger if exists trg_catalogos_updated_at on public.catalogos;
create trigger trg_catalogos_updated_at
  before update on public.catalogos
  for each row execute function public.set_updated_at();

comment on table public.catalogos is
  'Dominios de valores del sistema. Cada fila es un valor válido de un dominio. '
  'Las tablas lo referencian con una FK compuesta (dominio, codigo) apoyada en una '
  'columna generada `dominio_<campo>`: ningún campo de dominio puede tomar un valor '
  'fuera del catálogo. Para habilitar un valor nuevo, insertarlo acá.';

-- ---------------------------------------------------------------------------
-- 4. Semilla de catálogos
--    ON CONFLICT DO UPDATE: reaplicar la migración deja los catálogos en el
--    estado definido en este archivo (es la fuente de verdad de los dominios).
--    Códigos siempre en minúscula y snake_case: sirven tal cual como valor de
--    API, como clave de estilo y como nombre de ícono.
-- ---------------------------------------------------------------------------
insert into public.catalogos (dominio, codigo, nombre, orden, color, descripcion) values

  -- Tipo de manzana ----------------------------------------------------------
  ('tipo_manzana','manzana',      'Manzana',         10,'#3b82f6','Manzana urbanizada.'),
  ('tipo_manzana','baldio',       'Baldío',          20,'#a3a3a3','Terreno sin urbanizar. La capa actual tiene 4.'),
  ('tipo_manzana','espacio_verde','Espacio verde',   30,'#22c55e',null),
  ('tipo_manzana','equipamiento', 'Equipamiento',    40,'#ef4444',null),
  ('tipo_manzana','otro',         'Otro / sin dato', 99,'#94a3b8',null),

  -- Tipo y material de calle -------------------------------------------------
  ('tipo_calle','1','Asfalto',          10,'#eb2581','Código NUMÉRICO heredado: calles.tipo = 1. Lo filtra el visor.'),
  ('tipo_calle','2','Ripio con cuneta', 20,'#5af916','Código NUMÉRICO heredado: calles.tipo = 2. Lo filtra el visor.'),
  ('tipo_calle','3','Tierra',           30,'#a16207','Calzada de tierra sin tratamiento.'),
  ('tipo_calle','4','Peatonal',         40,'#64748b','Pasaje o senda peatonal.'),

  ('material_calle','asfalto','Asfalto',10,null,'Derivado de calles.tipo = 1.'),
  ('material_calle','ripio',  'Ripio',  20,null,'Derivado de calles.tipo = 2.'),
  ('material_calle','tierra', 'Tierra', 30,null,'Derivado de calles.tipo = 3.'),
  ('material_calle','otro',   'Otro',   99,null,'Cualquier otro caso.'),

  ('jerarquia_calle','principal', 'Principal',  10,null,'Calle estructurante del barrio.'),
  ('jerarquia_calle','secundaria','Secundaria', 20,null,'Calle interior.'),
  ('jerarquia_calle','pasaje',    'Pasaje',     30,null,'Pasaje o callejón.'),
  ('jerarquia_calle','sin_dato',  'Sin dato',   99,null,'Pendiente de clasificar.'),

  ('sentido_calle','doble_mano',   'Doble mano',   10,null,null),
  ('sentido_calle','unico_sentido','Único sentido',20,null,null),
  ('sentido_calle','peatonal',     'Peatonal',     30,null,null),
  ('sentido_calle','sin_dato',     'Sin dato',     99,null,null),

  -- Estado de conservación (calles, espacios públicos, luminarias, servicios) -
  ('estado_conservacion','bueno',   'Bueno',    10,'#22c55e',null),
  ('estado_conservacion','regular', 'Regular',  20,'#eab308',null),
  ('estado_conservacion','malo',    'Malo',     30,'#ef4444',null),
  ('estado_conservacion','sin_dato','Sin dato', 99,'#94a3b8',null),

  -- Espacios públicos --------------------------------------------------------
  ('tipo_espacio_publico','plaza',        'Plaza',            10,'#22c55e',null),
  ('tipo_espacio_publico','plazoleta',    'Plazoleta',        20,'#4ade80',null),
  ('tipo_espacio_publico','parque',       'Parque',           30,'#16a34a',null),
  ('tipo_espacio_publico','espacio_verde','Espacio verde',    40,'#86efac',null),
  ('tipo_espacio_publico','cancha',       'Cancha deportiva', 50,'#0ea5e9',null),
  ('tipo_espacio_publico','vereda',       'Vereda / senda',   60,'#cbd5e1',null),
  ('tipo_espacio_publico','baldio',       'Baldío',           70,'#a3a3a3',null),
  ('tipo_espacio_publico','otro',         'Otro',             99,'#94a3b8',null),

  -- Equipamiento -------------------------------------------------------------
  ('tipo_equipamiento','educativo',    'Educativo',         10,'#8b5cf6',null),
  ('tipo_equipamiento','salud',        'Salud',             20,'#ef4444',null),
  ('tipo_equipamiento','seguridad',    'Seguridad',         30,'#1d4ed8',null),
  ('tipo_equipamiento','deportivo',    'Deportivo',         40,'#0ea5e9',null),
  ('tipo_equipamiento','religioso',    'Religioso',         50,'#a855f7',null),
  ('tipo_equipamiento','institucional','Institucional',     60,'#475569',null),
  ('tipo_equipamiento','cultural',     'Cultural',          70,'#ec4899',null),
  ('tipo_equipamiento','social',       'Social / vecinal',  80,'#f59e0b',null),
  ('tipo_equipamiento','servicios',    'Servicios urbanos', 90,'#78716c',null),
  ('tipo_equipamiento','otro',         'Otro',              99,'#94a3b8',null),

  -- Problemas / reclamos -----------------------------------------------------
  ('categoria_problema','calle',          'Calle en mal estado',     10,'#f97316',null),
  ('categoria_problema','alumbrado',      'Alumbrado',               20,'#facc15',null),
  ('categoria_problema','agua',           'Agua potable',            30,'#0ea5e9',null),
  ('categoria_problema','cloaca',         'Cloacas / desagües',      40,'#7c3aed',null),
  ('categoria_problema','residuos',       'Residuos y limpieza',     50,'#65a30d',null),
  ('categoria_problema','arbolado',       'Arbolado',                60,'#15803d',null),
  ('categoria_problema','seguridad',      'Seguridad',               70,'#dc2626',null),
  ('categoria_problema','transito',       'Tránsito y señalética',   80,'#ea580c',null),
  ('categoria_problema','inundacion',     'Inundación / anegamiento',90,'#0369a1',null),
  ('categoria_problema','ruido',          'Ruido y molestias',       95,'#9333ea',null),
  ('categoria_problema','espacio_publico','Espacio público',        100,'#16a34a',null),
  ('categoria_problema','animales',       'Animales sueltos',       105,'#a16207',null),
  ('categoria_problema','otro',           'Otro',                   999,'#94a3b8',null),

  -- Propuestas vecinales -----------------------------------------------------
  ('categoria_propuesta','calle',           'Calles y pavimento',     10,'#f97316',null),
  ('categoria_propuesta','alumbrado',       'Alumbrado',              20,'#facc15',null),
  ('categoria_propuesta','agua',            'Agua potable',           30,'#0ea5e9',null),
  ('categoria_propuesta','cloaca',          'Cloacas y desagües',     40,'#7c3aed',null),
  ('categoria_propuesta','residuos',        'Residuos',               50,'#65a30d',null),
  ('categoria_propuesta','arbolado',        'Arbolado y forestación', 60,'#15803d',null),
  ('categoria_propuesta','seguridad',       'Seguridad',              70,'#dc2626',null),
  ('categoria_propuesta','transito',        'Tránsito',               80,'#ea580c',null),
  ('categoria_propuesta','espacio_publico', 'Espacio público',        90,'#16a34a',null),
  ('categoria_propuesta','cultura',         'Cultura',               100,'#ec4899',null),
  ('categoria_propuesta','deporte',         'Deporte',               110,'#0ea5e9',null),
  ('categoria_propuesta','ambiente',        'Ambiente',              120,'#22c55e',null),
  ('categoria_propuesta','otro',            'Otra',                  999,'#94a3b8',null),

  -- Estado y prioridad del contenido vecinal ---------------------------------
  ('estado_reporte','nuevo',      'Nuevo',       10,'#64748b','Cargado, sin revisar.'),
  ('estado_reporte','en_revision','En revisión', 20,'#eab308','La comisión lo está evaluando.'),
  ('estado_reporte','en_proceso', 'En proceso',  30,'#0ea5e9','Derivado o en ejecución.'),
  ('estado_reporte','resuelto',   'Resuelto',    40,'#22c55e','Cerrado con solución.'),
  ('estado_reporte','rechazado',  'Rechazado',   50,'#ef4444','No corresponde o duplicado.'),
  ('estado_reporte','archivado',  'Archivado',   60,'#94a3b8','Sin seguimiento.'),

  ('prioridad','baja',   'Baja',    10,'#22c55e',null),
  ('prioridad','media',  'Media',   20,'#eab308',null),
  ('prioridad','alta',   'Alta',    30,'#f97316',null),
  ('prioridad','urgente','Urgente', 40,'#dc2626',null),

  -- Cómo llegó el reclamo o la propuesta ------------------------------------
  ('canal_reporte','web',     'Cargado en el visor',10,null,null),
  ('canal_reporte','qgis',    'Cargado en QGIS',    20,null,'Lo carga la comisión desde el escritorio.'),
  ('canal_reporte','oficina', 'Mesa de entrada',    30,null,null),
  ('canal_reporte','whatsapp','WhatsApp',           40,null,null),
  ('canal_reporte','papel',   'Planilla en papel',  50,null,null),
  ('canal_reporte','otro',    'Otro',               99,null,null),

  -- Servicios urbanos --------------------------------------------------------
  ('tipo_servicio','agua',        'Red de agua',            10,'#0ea5e9',null),
  ('tipo_servicio','cloaca',      'Red cloacal',            20,'#7c3aed',null),
  ('tipo_servicio','gas',         'Gas natural',            30,'#f59e0b',null),
  ('tipo_servicio','electricidad','Energía eléctrica',      40,'#facc15',null),
  ('tipo_servicio','alumbrado',   'Alumbrado público',      50,'#eab308',null),
  ('tipo_servicio','residuos',    'Recolección de residuos',60,'#65a30d',null),
  ('tipo_servicio','internet',    'Internet / telefonía',   70,'#06b6d4',null),
  ('tipo_servicio','transporte',  'Transporte',             80,'#6366f1',null),
  ('tipo_servicio','otro',        'Otro',                  999,'#94a3b8',null),

  ('estado_servicio','existente',        'Existente',        10,'#22c55e',null),
  ('estado_servicio','proyectado',       'Proyectado',       20,'#0ea5e9',null),
  ('estado_servicio','fuera_de_servicio','Fuera de servicio',30,'#ef4444',null),
  ('estado_servicio','sin_dato',         'Sin dato',         99,'#94a3b8',null),

  ('tipo_luminaria','led',                'LED',                10,null,null),
  ('tipo_luminaria','sodio',              'Sodio',              20,null,null),
  ('tipo_luminaria','mercurio',           'Mercurio',           30,null,null),
  ('tipo_luminaria','halogenuro_metalico','Halogenuro metálico',40,null,null),
  ('tipo_luminaria','otro',               'Otro / sin dato',    99,null,null),

  ('estado_luminaria','funciona',    'Funciona',     10,'#22c55e',null),
  ('estado_luminaria','intermitente','Intermitente', 20,'#eab308',null),
  ('estado_luminaria','apagada',     'Apagada',      30,'#64748b',null),
  ('estado_luminaria','danada',      'Dañada',       40,'#ef4444',null),
  ('estado_luminaria','sin_dato',    'Sin dato',     99,'#94a3b8',null),

  -- Cauces / hidrología ------------------------------------------------------
  ('tipo_cauce','canal_principal', 'Canal principal',  10,'#0369a1',null),
  ('tipo_cauce','canal_secundario','Canal secundario', 20,'#0284c7',null),
  ('tipo_cauce','desague',         'Desagüe',          30,'#0ea5e9',null),
  ('tipo_cauce','arroyo',          'Arroyo',           40,'#06b6d4',null),
  ('tipo_cauce','zanjon',          'Zanjón',           50,'#0891b2',null),
  ('tipo_cauce','otro',            'Otro / sin dato',  99,'#94a3b8',null),

  ('estado_cauce','cielo_abierto','A cielo abierto',10,null,null),
  ('estado_cauce','entubado',     'Entubado',       20,null,null),
  ('estado_cauce','sin_dato',     'Sin dato',       99,null,null),

  -- Accesos al barrio (capa heredada `entradas`) -----------------------------
  ('tipo_entrada','ingreso',          'Ingreso',          10,null,null),
  ('tipo_entrada','egreso',           'Egreso',           20,null,null),
  ('tipo_entrada','acceso_vehicular', 'Acceso vehicular', 30,null,null),
  ('tipo_entrada','acceso_peatonal',  'Acceso peatonal',  40,null,null),
  ('tipo_entrada','otro',             'Otro',             99,null,null),

  ('estado_entrada','actual',    'Actual',     10,'#22c55e',null),
  ('estado_entrada','proyecto',  'Proyecto',   20,'#0ea5e9',null),
  ('estado_entrada','clausurada','Clausurada', 30,'#ef4444',null),

  -- Parcelas -----------------------------------------------------------------
  ('uso_parcela','residencial',  'Residencial',  10,'#3b82f6',null),
  ('uso_parcela','comercial',    'Comercial',    20,'#f59e0b',null),
  ('uso_parcela','mixto',        'Mixto',        30,'#8b5cf6',null),
  ('uso_parcela','equipamiento', 'Equipamiento', 40,'#ef4444',null),
  ('uso_parcela','espacio_verde','Espacio verde',50,'#22c55e',null),
  ('uso_parcela','industrial',   'Industrial',   60,'#78716c',null),
  ('uso_parcela','baldio',       'Baldío',       70,'#a3a3a3',null),
  ('uso_parcela','sin_dato',     'Sin dato',     99,'#94a3b8',null),
  ('uso_parcela','otro',         'Otro',        999,'#94a3b8',null),

  -- Archivos (fotos y documentos) --------------------------------------------
  ('tipo_archivo','foto',     'Foto',      10,'#0ea5e9',null),
  ('tipo_archivo','documento','Documento', 20,'#64748b',null),
  ('tipo_archivo','plano',    'Plano',     30,'#8b5cf6',null),
  ('tipo_archivo','acta',     'Acta',      40,'#f59e0b',null),
  ('tipo_archivo','video',    'Video',     50,'#ec4899',null),
  ('tipo_archivo','otro',     'Otro',      99,'#94a3b8',null),

  -- Roles de vecino (los usa RLS) --------------------------------------------
  ('rol_vecino','vecino',     'Vecino',       10,null,'Lee el mapa y crea sus propios reclamos y propuestas.'),
  ('rol_vecino','colaborador','Colaborador',  20,null,'Además edita las capas del mapa.'),
  ('rol_vecino','admin',      'Administrador',30,null,'Control total, incluidos roles y catálogos.')

on conflict (dominio, codigo) do update
  set nombre      = excluded.nombre,
      orden       = excluded.orden,
      color       = coalesce(excluded.color, public.catalogos.color),
      descripcion = coalesce(excluded.descripcion, public.catalogos.descripcion),
      activo      = true,
      updated_at  = now();
