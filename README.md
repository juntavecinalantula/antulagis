# AntulaGIS · Gestión Vecinal

Visor SIG y mesa de gestión de participación vecinal para el barrio **Mama Antula**
(Santiago del Estero). React + TypeScript + Vite + MapLibre GL sobre
[InsForge](https://insforge.dev) (Postgres + PostGIS, auth, storage).

## Estructura

```
frontend/src
├── App.tsx                     shell con sidebar y enrutado por hash (#tablero, #mapa, ...)
├── components
│   ├── VisorMapa.tsx           mapa a pantalla completa + panel flotante (capas/filtros/reportar/seguimiento)
│   ├── MapaBarrio.tsx          mapa MapLibre: capas territoriales, reportes, popups, modo "ubicar"
│   ├── PanelCapas.tsx          checklist de capas + leyenda + mapa base
│   ├── formularios/             alta de problemas (wizard 3 pasos) y de propuestas
│   ├── filtros/                filtros por estado y categoría
│   ├── visualizacion/          KPIs y seguimiento público con código de seguimiento
│   └── vistas/                 tablero, reclamos, obras, catastro, asistente, sistema
└── lib
    ├── datos.ts                catálogos, etiquetas y utilidades de geometría
    ├── reportes.ts             capa de datos vecinales (fetch + resumen + hooks)
    ├── territorio.ts            catastro (calles y manzanas) con nombres reales de OSM
    └── insforgeClient.ts       cliente de solo lectura (anon key)
```

## Desarrollo

```bash
cd frontend
npm install
cp .env.example .env.local     # completar URL y ANON_KEY
npm run dev                    # http://localhost:5173
```

Variables de entorno (públicas, van en el bundle):

```
VITE_INSFORGE_URL=https://ii8ya6m7.us-west.insforge.app
VITE_INSFORGE_ANON_KEY=anon_...
```

La ANON_KEY se obtiene con `npx -y @insforge/cli secrets get ANON_KEY`. La API key de
administración (`ik_...`) **nunca** va en el frontend.

## Build y publicación

```bash
npm run build      # tsc + vite build (copia el worker de MapLibre a dist/assets)
npm run lint       # oxlint
npm run deploy     # publica en la rama gh-pages
```

El workflow `.github/workflows/deploy.yml` recompila y publica en GitHub Pages con cada
push a `main`.

## Backend

Las migraciones viven en `migrations/` y se aplican con la CLI de InsForge:

```bash
npx -y @insforge/cli link --project-id <id>
npx -y @insforge/cli db migrations up <archivo>.sql
npx -y @insforge/cli db query "select ... "
```

Ver `docs/` para el modelo de datos GIS (`02-modelo-gis.md`), el estado de la base
(`01-estado-actual.md`) y el benchmark de plataformas vecinales
(`04-benchmark-paginas-vecinales.md`).
