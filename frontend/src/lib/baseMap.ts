import type { Map, StyleSpecification } from 'maplibre-gl';

export type BaseId = 'osm' | 'satelite';

/**
 * Estilo base sin API keys: callejero OSM (raster) + ortofoto Esri (raster).
 * Solo se agrega la capa OSM inicial; la de satélite se añade bajo las capas
 * de datos cuando el usuario la selecciona (ver `aplicarBase`).
 */
export const estiloBase: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© colaboradores de OpenStreetMap',
    },
    esri: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles © Esri — Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'base-osm', type: 'raster', source: 'osm' }],
};

/** Intercambia el mapa base manteniéndolo SIEMPRE por debajo de las capas de datos. */
export function aplicarBase(map: Map, base: BaseId): void {
  if (!map.getLayer('base-osm')) return; // estilo aún no cargado
  if (!map.getLayer('base-esri')) {
    // Insertar inmediatamente por debajo de la capa de datos más baja.
    const debajoDe = map.getLayer('manzanas-fill') ? 'manzanas-fill' : undefined;
    map.addLayer(
      {
        id: 'base-esri',
        type: 'raster',
        source: 'esri',
        layout: { visibility: 'none' },
      },
      debajoDe,
    );
  }
  map.setLayoutProperty('base-osm', 'visibility', base === 'osm' ? 'visible' : 'none');
  map.setLayoutProperty('base-esri', 'visibility', base === 'satelite' ? 'visible' : 'none');
}
