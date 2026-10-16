# 04 · Benchmark de plataformas vecinales (investigación 2026-10-16)

Comparativa de **Ciudad Abierta**, **CiudadApp**, **Pulso Ciudadano**, **Munify** y el
visor actual **AntulaGIS**, con las decisiones de diseño que se derivan para este repo.

---

## 1. Qué hace cada una

| Sitio | Modelo | Funcionalidades clave |
|-------|--------|----------------------|
| **ciudadabierta.org** (Decidim, Barcelona-like) | Portal abierto de datos + participación | Reclamos **y** propuestas georreferenciados, **encuestas ciudadanas**, observatorio de datos abiertos, listas de "últimos reclamos / últimas propuestas", PWA instalable, barrios/comunas. |
| **ciudadapp.com.ar** (#seguridad) | App municipal integral (Android/iOS + panel web) | Reclamos **con GPS**, botón de **emergencia/pánico** (mantener 2 s → aviso a familia + destacamento), encuestas, obras, trámites, avisos push, estacionamiento medido, billetera virtual. Registro con DNI. |
| **pulsociudadano.app** | Portal público + bandeja municipal (B2G SaaS) | Cada reclamo recibe un **código seguimiento tipo PC-1048**; circuito visible: *nuevo → en revisión → en curso → finalizado con evidencia (foto, responsable y fecha)*; KPIs ejecutivos (activos, finalizados, en revisión, satisfacción); **mapa público** con filtros por categoría y estado. |
| **munify.com.ar/reclamos-vecinales** | Módulo de reclamos para municipios | Wizard de reporte paso a paso, **foto + GPS**, **IA** que sugiere categoría y detecta duplicados, asignación a cuadrilla, **aviso al vecino** del cambio de estado, métricas (% resueltos a tiempo, tiempo de respuesta, trazabilidad 100 %). |

## 2. AntulaGIS hoy (línea base)

- Visor MapLibre con capas territoriales curadas (manzanas, calles, cauces, luminaria, entradas).
- Formularios `problemas` / `propuestas` → InsForge (`@insforge/sdk`), catálogo real de 13 categorías.
- Panel "Filtros" **decorativo** (no filtra el mapa) y "Datos" con solo 3 números.
- La migración `participacion.sql` ya define en la BD —pero sin uso en el front—:
  - `historial_estados` (traza automática por trigger de cada cambio de estado),
  - `propuestas_apoyos` (1 apoyo por vecino y propuesta, contador `apoyos`),
  - estados normalizados `nuevo / en_revision / en_proceso / resuelto / rechazado / archivado`,
  - prioridades `baja / media / alta / urgente`, canal `web…`.

## 3. Brechas detectadas (lo que nos falta vs. las 4 páginas)

1. **Sin trazabilidad visible**: los sitios comparados muestran el circuito completo de cada
   reclamo; nosotros ni siquiera dibujamos `problemas` en el mapa.
2. **Sin código de seguimiento** estilo Pulso Ciudadano (PC-####).
3. **Filtros no conectados** al mapa ni a listas ("últimos reclamos" de Ciudad Abierta).
4. **Dashboard pobre**: sin KPIs por estado/categoría, sin % resueltos, sin tiempos de respuesta.
5. **Propuestas sin apoyos** ("me interesa") pese a estar listo en la BD.
6. **Reporte sin guía**: los referentes usan wizard paso a paso con foto y ubicación en mapa.
7. **Seguridad/emergencia** (CiudadApp): fuera de alcance para una junta vecinal por RLS y
   privacidad; queda documentado como no-objetivo.

## 4. Decisiones aplicadas en este repo

| # | Cambio | Inspirado en | Archivos |
|---|--------|--------------|----------|
| A | Capas `problemas` y `propuestas` en el mapa, coloreadas por estado, con popup de ficha completa | Munify, Pulso Ciudadano | `MapaBarrio.tsx`, `datos.ts`, `PanelCapas.tsx` |
| B | Filtros por **estado** y **categoría** realmente funcionales (afectan mapa + listado) | Pulso Ciudadano | `PanelFiltros.tsx`, `MapaBarrio.tsx` |
| C | Formulario de reporte en **wizard de 3 pasos** con prioridad y "ubicación en el mapa" (pick por dirección o clic) | Munify (wizard 6 pasos, simplificado) | `FormularioProblema.tsx` |
| D | **Código de seguimiento** generado al reportar (p. ej. `MA-2026-0007`) | Pulso Ciudadano (PC-1048) | `FormularioProblema.tsx` |
| E | Panel "Seguimiento": últimos reportes con estado, antigüedad y **histórico de cambios** (desde `historial_estados`) | Ciudad Abierta ("últimos reclamos"), Munify | `PanelSeguimiento.tsx` |
| F | Dashboard con KPIs: total, **% resueltos**, por estado, top categorías y propuestas más apoyadas | Pulso Ciudadano, Munify | `VisualizacionDatos.tsx` |
| G | Botón **"Apoyar / Retirar apoyo"** en propuestas (tabla ya existe en BD) | Ciudad Abierta | `FormularioPropuesta.tsx`, `MapaBarrio.tsx` |
| H | Encuestas ciudadanas | Ciudad Abierta | **pendiente** (requiere tabla `encuestas` → ya existe heredada vacía; próximo sprint) |
| I | Botón de emergencia | CiudadApp | **no-objetivo**: requiere verificación de identidad y protocolo policial; la junta no puede operarlo con garantías |

## 5. Próximos pasos sugeridos

1. Ejecutar en InsForge la migración de `codigo` de seguimiento (ver `migrations/20261016000000_seguimiento_codigo.sql`).
2. Conectar autenticación InsForge (login vecino) para habilitar apoyos reales y `autor_id`.
3. Publicar vista RPC `problemas_recientes` si el volumen crece (>1000 filas).
4. Iterar el wizard con carga de fotos (bucket `archivos` ya modelado en `20261013005845_archivos.sql`).
