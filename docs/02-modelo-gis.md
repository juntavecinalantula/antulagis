# 02 · Modelo GIS — Barrio Mama Antula

> Modelo de capas, geometrías, atributos y relaciones. Deriva del estado actual
> (docs/01-estado-actual.md) y es el destino de las 7 migraciones.

---

## 1. Jerarquía de capas

```
BARRIO (barrios)                          ← 1 fila, MultiPolygon, capa madre
│
├── MANZANAS (manzanas)                   ← 132, Polygon
│     └── PARCELAS (parcelas)             ← N, Polygon, FK manzana_id
│
├── CALLES (calles)                       ← 70, MultiLineString
│
├── CAUCES (waterways)                    ← 3, LineString
│
├── ENTRADAS (entradas)                   ← 9, MultiLineString, FK calle_id
│
├── ESPACIOS PÚBLICOS (espacios_publicos) ← N, MultiPolygon, FK manzana_id/barrio_id
│
├── EQUIPAMIENTO (equipamiento)           ← N, Point, FK manzana_id/barrio_id
│
├── SERVICIOS (servicios)                 ← N, Geometry (Point/Line/Polygon), FK manzana_id/barrio_id
│
├── LUMINARIAS (luminaria_publica)        ← 79, Point, FK calle_id/manzana_id/barrio_id
│
├── PROBLEMAS (problemas)                 ← N, Point, FK barrio_id/manzana_id/calle_id + autor_id (auth.users)
│
├── PROPUESTAS (propuestas)               ← N, Point, FK barrio_id/manzana_id + autor_id
│     └── APOYOS (propuestas_apoyos)      ← N, PK (propuesta_id, usuario_id)
│
├── HISTORIAL DE ESTADOS (historial_estados) ← N, tabla log (problemas/propuestas)
│
└── ARCHIVOS (archivos)                   ← N, polimórfico (entidad + entidad_id), bucket Storage "archivos"
```

---

## 2. Convenciones de geometría

| Capa | Tipo PostGIS | SRID almacenamiento | SRID cálculo |
|------|--------------|---------------------|--------------|
| Todas | Geometry / Geography | **4326 (WGS 84)** | **Geography** (funciones `st_area(geom::geography)`, `st_perimeter`, `st_length`) |

> **Por qué NO usamos 5346**: el PostGIS de InsForge no tiene cargado el SRID 5346 (POSGAR 2007 faja 4).  
> Las funciones de *geography* son **IMMUTABLE**, precisas en metros y no requieren SRID proyectado.

**Columnas generadas** (siempre actualizadas):
- `superficie_m2` = `st_area(geom::geography)` → m² (manzanas, parcelas, barrios, espacios_publicos)
- `perimetro_m` = `st_perimeter(geom::geography)` → m (manzanas)
- `longitud_m` = `st_length(geom::geography)` → m (calles, waterways, entradas)
- `material` (calles) = `CASE tipo WHEN 1 THEN 'asfalto' WHEN 2 THEN 'ripio' WHEN 3 THEN 'tierra' ELSE 'otro' END`

---

## 3. Claves de negocio vs. claves técnicas

| Capa | PK técnica | Clave de negocio (única) | FKs principales |
|------|------------|--------------------------|-----------------|
| barrios | `id` serial | `codigo` | — |
| manzanas | `id` serial | `codigo` | `barrio_id → barrios(id)` |
| parcelas | `id` serial | `nomenclatura` (o `codigo`) | `manzana_id → manzanas(id)` |
| calles | `id` serial | — | `barrio_id` (opcional) |
| waterways | `id` serial | — | — |
| entradas | `id` serial | — | `calle_id → calles(id)` |
| espacios_publicos | `id` serial | `codigo` | `manzana_id`, `barrio_id` |
| equipamiento | `id` serial | `codigo` | `manzana_id`, `barrio_id` |
| servicios | `id` serial | `codigo` | `manzana_id`, `barrio_id` |
| luminaria_publica | `id` serial | `codigo` | `calle_id`, `manzana_id`, `barrio_id` |
| problemas | `id` serial | — | `barrio_id`, `manzana_id`, `calle_id`, `autor_id → auth.users(id)` |
| propuestas | `id` serial | — | `barrio_id`, `manzana_id`, `autor_id → auth.users(id)` |
| propuestas_apoyos | PK compuesta | — | `propuesta_id → propuestas(id)`, `usuario_id → auth.users(id)` |
| historial_estados | `id` bigserial | — | `entidad + entidad_id`, `usuario_id` |
| perfiles | `id` uuid (FK auth.users) | — | `manzana_id → manzanas(id)` |
| archivos | `id` uuid | — | `entidad + entidad_id` (polimórfico), `subido_por → auth.users(id)` |

---

## 4. Catálogos (tabla `catalogos`)

24 dominios, 143 valores. Cada dominio controla un campo mediante **FK compuesta** `(dominio, codigo)` apoyada en columna generada `dominio_<campo>`.

**Dominios y uso:**

| Dominio | Tablas / campos | Ejemplo valores |
|---------|----------------|-----------------|
| `tipo_manzana` | manzanas.tipo | manzana, baldio, espacio_verde, equipamiento |
| `tipo_calle` | calles.tipo (int heredado) | 1=Asfalto, 2=Ripio con cuneta, 3=Tierra, 4=Peatonal |
| `material_calle` | calles.material (generada) | asfalto, ripio, tierra, otro |
| `jerarquia_calle` | calles.jerarquia | principal, secundaria, pasaje, sin_dato |
| `sentido_calle` | calles.sentido | doble_mano, unico_sentido, peatonal, sin_dato |
| `estado_conservacion` | calles.estado, espacios_publicos.estado, luminaria_publica.estado (via dominio_estado), equipamiento.estado | bueno, regular, malo, sin_dato |
| `tipo_espacio_publico` | espacios_publicos.tipo | plaza, plazoleta, parque, espacio_verde, cancha, vereda, baldio |
| `tipo_equipamiento` | equipamiento.tipo | educativo, salud, seguridad, deportivo, religioso, institucional, cultural, social, servicios |
| `categoria_problema` | problemas.categoria | calle, alumbrado, agua, cloaca, residuos, arbolado, seguridad, transito, inundacion, ruido, espacio_publico, animales, otro |
| `categoria_propuesta` | propuestas.categoria | calle, alumbrado, agua, cloaca, residuos, arbolado, seguridad, transito, espacio_publico, cultura, deporte, ambiente, otro |
| `estado_reporte` | problemas.estado, propuestas.estado | nuevo, en_revision, en_proceso, resuelto, rechazado, archivado |
| `prioridad` | problemas.prioridad | baja, media, alta, urgente |
| `canal_reporte` | problemas.canal, propuestas.canal | web, qgis, oficina, whatsapp, papel, otro |
| `tipo_servicio` | servicios.tipo | agua, cloaca, gas, electricidad, alumbrado, residuos, internet, transporte |
| `estado_servicio` | servicios.estado | existente, proyectado, fuera_de_servicio, sin_dato |
| `tipo_luminaria` | luminaria_publica.tipo | led, sodio, mercurio, halogenuro_metalico, otro |
| `estado_luminaria` | luminaria_publica.estado | funciona, intermitente, apagada, danada, sin_dato |
| `tipo_cauce` | waterways.tipo | canal_principal, canal_secundario, desague, arroyo, zanjon, otro |
| `estado_cauce` | waterways.estado | cielo_abierto, entubado, sin_dato |
| `tipo_entrada` | entradas.tipo | ingreso, egreso, acceso_vehicular, acceso_peatonal, otro |
| `estado_entrada` | entradas.estado | actual, proyecto, clausurada |
| `uso_parcela` | parcelas.uso | residencial, comercial, mixto, equipamiento, espacio_verde, industrial, baldio, sin_dato, otro |
| `tipo_archivo` | archivos.tipo | foto, documento, plano, acta, video, otro |
| `rol_vecino` | perfiles.rol | vecino, colaborador, admin |

> Para agregar un valor: `INSERT INTO public.catalogos (dominio, codigo, nombre, orden, color) VALUES (...)` — no requiere migración.

---

## 5. Relaciones polimórficas

**`archivos`** (bucket Storage "archivos"):
- `entidad` ∈ { 'problemas','propuestas','manzanas','parcelas','calles','waterways','entradas','espacios_publicos','equipamiento','servicios','luminaria_publica','barrios' }
- `entidad_id` = PK de la entidad dueña
- `url` + `storage_key` **ambas obligatorias** (url para mostrar, key para borrar/firmar)

---

## 6. Reglas de privacidad (ver docs/04-seguridad-rls.md)

| Tabla | Lectura pública | Escritura |
|-------|-----------------|-----------|
| Capas del mapa (10) | **anon + authenticated** | **colaborador / admin** (`es_editor()`) |
| perfiles | **SOLO dueño + admin** | SOLO dueño (+ admin) |
| perfiles públicos | **anon + authenticated** (vía RPC `obtener_perfiles_publicos()`) | — |
| problemas / propuestas | **anon + authenticated** | dueño (`autor_id`) + editor/admin |
| propuestas_apoyos | authenticated (dueño) | authenticated (dueño, 1 por propuesta) |
| historial_estados | authenticated (dueño + admin) | trigger only |
| archivos | authenticated (dueño + editor) | authenticated (dueño + editor) |
| catalogos | **anon + authenticated** (solo `activo=true`) | **admin** |

**Funciones SECURITY DEFINER** (rompen recursión RLS):
- `rol_actual()` → texto ('vecino' | 'colaborador' | 'admin' | NULL)
- `es_editor()` → bool (colaborador o admin)
- `es_admin()` → bool (admin)
- `obtener_perfiles_publicos()` → TABLE (id, apodo, rol) — **RPC pública**

**Trigger anti-escalada**: `proteger_campos_perfil()` impide que un vecino cambie su `rol`, `verificado`, `activo`, `manzana_id` o `id`.

---

## 7. Capas heredadas (NO editables)

| Capa | Origen | Filas | Uso |
|------|--------|-------|-----|
| `Polygons` | Digitalización original | 231 | Respaldo; solapa 132 manzanas oficiales |
| `road` | Export OSM | 499 | Referencia de nombres/geometría calle |
| `encuestas` | — | 0 | Histórica |
| `solicitudes` | — | 0 | Histórica |
| `actualizaciones_parcela` | — | 0 | Log parcelas |
| `informacion` | 4 puntos (3 policía + Jardín) | 4 | **Trasladar a `equipamiento`** (ver docs/opcionales) |

---

## 8. Flujo QGIS recomendado

1. **Proyecto base**: `antula_db.qgz` (ya conecta a InsForge vía PostgreSQL)
2. **Capas a editar en QGIS**: manzanas, parcelas, calles, waterways, entradas, barrios, espacios_publicos, equipamiento, servicios, luminaria_publica
3. **Capas SOLO LECTURA**: Polygons, road, encuestas, solicitudes, actualizaciones_parcela, informacion
4. **Al crear/editar**:
   - Rellenar campos de catálogo (`tipo`, `estado`, `jerarquia`, etc.) → QGIS valida contra `catalogos` si usas *Value Relation* en el formulario
   - `barrio_id` / `manzana_id` / `calle_id` → usar *Join by location* (intersección) para poblar automáticamente
   - `created_at` / `updated_at` → se mantienen solos (trigger)
   - `superficie_m2` / `longitud_m` / `material` → se calculan solos (columnas generadas / trigger)
5. **Commit**: guardar en QGIS → hace `INSERT/UPDATE` en InsForge → PostgREST refresca → visor web ve cambios al recargar

---

## 9. Actualizar el visor (React + MapLibre)

El visor actual (`frontend/src/lib/datos.ts`) ya mapea:
- `manzanas` → fill + label
- `calles` filtradas por `tipo` (1/2) → líneas asfalto/ripio
- `waterways` → líneas discontinuas
- `informacion` → círculos (migrar a `equipamiento` cuando se haga el traspaso)

**Nuevas capas a agregar al visor** (cuando se pase a React):
- `espacios_publicos` → fill verde + label
- `equipamiento` → puntos con icono por `tipo_equipamiento`
- `servicios` → líneas/puntos/polígonos por `tipo_servicio`
- `luminaria_publica` → puntos con estilo por `estado_luminaria`
- `problemas` / `propuestas` → puntos con popup, filtros por `categoria` y `estado`
- `barrios` → outline del barrio

Los estilos usan los `color` de `catalogos` (ej. `tipo_calle` 1 → `#eb2581`, 2 → `#5af916`).