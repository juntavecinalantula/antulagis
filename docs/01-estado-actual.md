# 01 · Estado actual (lo que ya existe en InsForge)

> Inventario real del proyecto **mama_antula** (InsForge, API `https://ii8ya6m7.us-west.insforge.app`)
> levantado el 2026-10-12. Este documento es la foto fija *antes* de cualquier migración.

---

## 1. Capas territoriales (13 tablas/vistas con RLS)

| Tabla | Filas | Geometría | SRID | Descripción |
|-------|-------|-----------|------|-------------|
| **manzanas** | 132 | POLYGON | 4326 | Manzanas curadas (150 ha). La **capa oficial**. |
| **calles** | 70 | MULTILINESTRING | 4326 | Tramos curados. `tipo` = 1 (asfalto, 29) / 2 (ripio, 41). Fuente de verdad del visor. |
| **waterways** | 3 | LINESTRING | 4326 | Cauces/canales (OSM). Solo 3 líneas: canal principal + 2 secundarios. |
| **entradas** | 9 | MULTILINESTRING | 4326 | Accesos al barrio. `"Entradas_barrio"` = 'Actual' (5) / 'Proyecto' (4). |
| **luminaria_publica** | 79 | POINT | 4326 | Alumbrado público (origen: `luminaria.gpkg`). Solo `fid` + geom, sin atributos técnicos. |
| **informacion** | 4 | POINT | 4326 | **Capa heredada**: 3 puntos de policía + Jardín Mama Antula. Se traspasa a `equipamiento`. |
| **parcelas** | 0 | POLYGON | 4326 | Vacía. Ya trae booleanos de servicios: `agua`, `cloacas`, `electricidad`, `pavimento`, `alumbrado`. |
| **problemas** | 0 | POINT | 4326 | Vacía. `categoria`, `descripcion`, `estado`='Nuevo'. |
| **propuestas** | 0 | POINT | 4326 | Vacía. `titulo`, `categoria`, `descripcion`, `estado`='Nueva'. |

---

## 2. Capas heredadas NO tocadas por las migraciones

| Tabla | Filas | Geometría | SRID | Estado |
|-------|-------|-----------|------|--------|
| **Polygons** | 231 | POLYGON | 4326 | Digitalización de origen (mezcla manzanas + lotes). 206 ha. 93 tienen `MZA`. **Respaldo, no se edita**. |
| **road** | 499 | LINESTRING | 4326 | Export OSM (`highway`, `surface`, `name`, `maxspeed`). **Referencia**, no se edita. |
| **encuestas** | 0 | POINT | 4326 | Vacía. `obra_prioritaria`, `sector`. |
| **solicitudes** | 0 | POINT | 4326 | Vacía. `tipo`, `descripcion`, `estado`='Nueva'. |
| **actualizaciones_parcela** | 0 | — | — | Vacía. Log de cambios por `parcela_codigo`. |

---

## 3. Problemas de calidad detectados (origen de los catálogos)

| Columna | Valores reales | Problema | Solución en migraciones |
|---------|----------------|----------|-------------------------|
| `calles.tipo` | 1, 2 | **Numérico heredado**, lo filtra el visor. Se mantiene como fuente de verdad. | Se mantiene `tipo` (int); se deriva `material` (texto controlado). |
| `calles."Asfalto"` | "Asfalto", "ripio c/c cuneta", "Ripip c/cuneta", "ripio c/c cuneta", "Ripio c/cuneta", "", NULL | **7 variantes de texto para 2 valores reales**. | `DEPRECADA`. No se borra; se usa `calles.material` (derivada de `tipo`). |
| `manzanas.codigo` | "M-039", "200", "10", "Baldio 10" | **3 formatos conviven**: M-0NN (125), NNN (3), "Baldio NN" (4). | Se documenta; `codigo` sigue siendo la clave de negocio. |
| `waterways.full_id/osm_id/osm_type/waterway` | 3/3/3/3 NULL | Columnas heredadas de OSM, **todas en NULL**. | `DEPRECADAS`. Se usan `tipo`/`nombre` (catálogos). |
| `entradas."Entradas_barrio"` | "Actual", "Proyecto" | Solo 2 valores, texto libre. | `DEPRECADA`. Reemplazada por `entradas.estado` (catálogo). |
| `problemas.estado` | 'Nuevo' (default) | Mayúscula inicial. | Normalizado a minúscula `'nuevo'` (catálogo). |
| `propuestas.estado` | 'Nueva' (default) | Mayúscula inicial + femenino. | Normalizado a `'nuevo'` (catálogo). |

---

## 4. Duplicados / solapamiento

- **132 manzanas** de la capa oficial (`manzanas`) tienen solapamiento espacial con **132 de 231** polígonos de `Polygons` (ST_Intersects = true). Las 99 restantes de `Polygons` son lotes internos.
- Área total: `manzanas` = 150 ha vs `Polygons` = 206 ha.

---

## 5. Políticas RLS existentes (antes de las migraciones)

| Tabla | Políticas | Roles |
|-------|-----------|-------|
| manzanas, calles, parcelas, waterways, problemas, propuestas, road | 1 SELECT | `anon, authenticated` |
| entradas, informacion, luminaria_publica | 1 SELECT | `public` (mal: debería ser `anon,authenticated`) |
| actualizaciones_parcela, encuestas, solicitudes | 1 INSERT + 1 SELECT | `authenticated` / `anon,authenticated` |

> **Nota**: todas las políticas son `USING (true)` sin `WITH CHECK`. No hay control de escritura.

---

## 6. Roles InsForge disponibles

| Rol | Login | Bypass RLS |
|-----|-------|------------|
| `anon` | no | no |
| `authenticated` | no | no |
| `project_admin` (CLI/migraciones) | no | **sí** |
| `postgres` (superusuario) | sí | **sí** |

---

## 7. Extensiones instaladas

- `postgis` 3.6.3
- `pgcrypto`
- `pg_stat_statements`
- `pg_cron`
- `http`
- `vector` 0.7.4

> **IMPORTANTE**: El SRID **5346 (POSGAR 2007 faja 4)** **NO está cargado** en `spatial_ref_sys`.
> Las migraciones usan `st_area(geom::geography)` / `st_perimeter(geom::geography)` /
> `st_length(geom::geography)` (funciones **IMMUTABLE**, precisas en metros) para evitar depender de un SRID proyectado.

---

## 8. Credenciales públicas (ya en el frontend desplegado)

```
VITE_INSFORGE_URL=https://ii8ya6m7.us-west.insforge.app
VITE_INSFORGE_ANON_KEY=anon_reemplazar
```

> Obtené la ANON_KEY real con `npx -y @insforge/cli secrets get ANON_KEY` y copiala a
> `frontend/.env.local` (ese archivo es local y **no** se versiona).

> Estas claves son **públicas** (anon key) y están en el bundle de GitHub Pages.
> La **API key de admin (`ik_...`)** está en `.insforge/project.json` (local, no versionado).