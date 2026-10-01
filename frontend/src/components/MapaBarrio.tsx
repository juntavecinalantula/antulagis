import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapaML } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { insforge, faltaConfig } from '../lib/insforgeClient';
import {
  bboxDeFCs,
  claseDeCalle,
  ENTRADA_ACTUAL,
  ENTRADA_PROYECTO,
  escapeHtml,
  ETIQUETAS,
  filasAFeatureCollection,
  TIPO_ASFALTO,
  TIPO_RIPIO,
  type CapasVisibles,
  type Conteos,
  type Fila,
} from '../lib/datos';
import { aplicarBase, estiloBase, type BaseId } from '../lib/baseMap';

export type EstadoMapa =
  | { fase: 'cargando' }
  | { fase: 'listo'; conteos: Conteos }
  | { fase: 'error'; mensaje: string };

type Props = {
  visibles: CapasVisibles;
  base: BaseId;
  onEstado: (estado: EstadoMapa) => void;
};

/** Capas de MapLibre que conmuta cada checkbox. */
const GRUPOS: Record<keyof CapasVisibles, string[]> = {
  manzanas: ['manzanas-fill', 'manzanas-label'],
  callesAsfalto: ['calles-asfalto-line'],
  callesRipio: ['calles-ripio-line'],
  cauces: ['cauces-line'],
  entradasActual: ['entradas-actual-line'],
  entradasProyecto: ['entradas-proyecto-line'],
};

/** Capas de MapLibre que reciben popup (incluye las dos de calles). */
const CAPAS_CON_POPUP = [
  'manzanas-fill',
  'calles-asfalto-line',
  'calles-ripio-line',
  'cauces-line',
  'entradas-actual-line',
  'entradas-proyecto-line',
];

function contenidoPopup(propiedades: Record<string, unknown> | null | undefined): string {
  if (!propiedades) return '';
  const filas = Object.entries(propiedades)
    .filter(([k, v]) => k !== 'geom' && v !== null && v !== undefined && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="color:#64748b;padding-right:8px;vertical-align:top;">${escapeHtml(ETIQUETAS[k] ?? k)}</td><td><b>${escapeHtml(v)}</b></td></tr>`,
    )
    .join('');
  return `<div style="font-family:sans-serif;font-size:13px;"><table>${filas}</table></div>`;
}

export default function MapaBarrio({ visibles, base, onEstado }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaML | null>(null);
  const [capasListas, setCapasListas] = useState(false);

  // Inicialización única del mapa (React.StrictMode la ejecuta dos veces en dev;
  // la limpieza remove() + el guard `vivo` cubren el primer montaje).
  useEffect(() => {
    const cont = mapContainer.current;
    if (!cont) return;
    let vivo = true;

    const map = new maplibregl.Map({
      container: cont,
      style: estiloBase,
      center: [-64.24, -27.71], // barrio (Santiago del Estero); se reajusta con fitBounds
      zoom: 13,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapaRef.current = map;

    async function cargar(): Promise<void> {
      onEstado({ fase: 'cargando' });
      if (faltaConfig) {
        onEstado({
          fase: 'error',
          mensaje: 'Faltan VITE_INSFORGE_URL / VITE_INSFORGE_ANON_KEY en frontend/.env',
        });
        return;
      }
      try {
        // geom ya llega como geometría GeoJSON desde la REST de InsForge.
        const [rCalles, rManzanas, rCauces, rEntradas] = await Promise.all([
          insforge.database.from('calles').select('*').limit(1000),
          insforge.database.from('manzanas').select('*').limit(1000),
          insforge.database.from('waterways').select('*').limit(1000),
          insforge.database.from('entradas').select('*').limit(1000),
        ]);
        if (!vivo) return;
        const fallo = rCalles.error ?? rManzanas.error ?? rCauces.error ?? rEntradas.error;
        if (fallo) throw fallo;

        const fcCalles = filasAFeatureCollection((rCalles.data ?? []) as Fila[]);
        const fcManzanas = filasAFeatureCollection((rManzanas.data ?? []) as Fila[]);
        const fcCauces = filasAFeatureCollection((rCauces.data ?? []) as Fila[]);
        const fcEntradas = filasAFeatureCollection((rEntradas.data ?? []) as Fila[]);
        // Asegurar que el estilo esté cargado antes de añadir fuentes y capas
        if (!map.isStyleLoaded()) {
          await new Promise<void>((resolve) => {
            map.once('style.load', () => resolve());
          });
        }
        if (!vivo) return;

        map.addSource('manzanas', { type: 'geojson', data: fcManzanas });
        map.addSource('calles', { type: 'geojson', data: fcCalles });
        map.addSource('cauces', { type: 'geojson', data: fcCauces });
        map.addSource('entradas', { type: 'geojson', data: fcEntradas });
        map.addLayer({
          id: 'manzanas-fill',
          type: 'fill',
          source: 'manzanas',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.15,
            'fill-outline-color': '#2563eb',
          },
        });
        map.addLayer({
          id: 'cauces-line',
          type: 'line',
          source: 'cauces',
          paint: { 'line-color': '#0f31ddf0', 'line-width': 12, 'line-dasharray': [3, 2] },
        });
        map.addLayer({
          id: 'entradas-actual-line',
          type: 'line',
          source: 'entradas',
          // entradas actuales del barrio (ámbar, trazo continuo)
          filter: ['==', ['get', 'Entradas_barrio'], ENTRADA_ACTUAL],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#f53e0b',
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 17, 5],
          },
        });
        map.addLayer({
          id: 'entradas-proyecto-line',
          type: 'line',
          source: 'entradas',
          // entradas proyectadas (violeta, trazo discontinuo)
          filter: ['==', ['get', 'Entradas_barrio'], ENTRADA_PROYECTO],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#4b0988',
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 17, 5],
            'line-dasharray': [2, 1.5],
          },
        });
        map.addLayer({
          id: 'calles-asfalto-line',
          type: 'line',
          source: 'calles',
          // tipo 1 = asfalto (azul)
          filter: ['==', ['get', 'tipo'], TIPO_ASFALTO],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#eb2581',
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 17, 4],
          },
        });
        map.addLayer({
          id: 'calles-ripio-line',
          type: 'line',
          source: 'calles',
          // tipo 2 = ripio con cuneta (naranja)
          filter: ['==', ['get', 'tipo'], TIPO_RIPIO],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#5af916',
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 17, 4],
          },
        });
        map.addLayer({
          id: 'manzanas-label',
          type: 'symbol',
          source: 'manzanas',
          minzoom: 14.5,
          layout: {
            'text-field': ['coalesce', ['get', 'mza'], ['get', 'codigo'], ''],
            'text-size': 11,
            'text-padding': 2,
          },
          paint: {
            'text-color': '#1e3a8a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        });

        // Popups + cursor puntero en todas las capas clicables
        for (const id of CAPAS_CON_POPUP) {
          map.on('click', id, (e) => {
            const f = e.features?.[0];
            if (!f) return;
            new maplibregl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(contenidoPopup(f.properties))
              .addTo(map);
          });
          map.on('mouseenter', id, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', id, () => {
            map.getCanvas().style.cursor = '';
          });
        }

        // Encuadre sobre el barrio (manzanas + calles; los cauces se extienden más al norte)
        const bb = bboxDeFCs([fcManzanas, fcCalles]);
        if (bb && vivo) {
          map.fitBounds(
            [
              [bb[0], bb[1]],
              [bb[2], bb[3]],
            ],
            { padding: 56, maxZoom: 16, duration: 0 },
          );
        }

        setCapasListas(true);
        // Reparto de calles por tipo de pavimento (para los porcentajes del panel)
        let callesAsfalto = 0;
        let callesRipio = 0;
        for (const f of fcCalles.features) {
          const clase = claseDeCalle(f.properties?.tipo);
          if (clase === 'asfalto') callesAsfalto++;
          else if (clase === 'ripio') callesRipio++;
        }
        // Reparto de entradas por estado (Actual / Proyecto)
        let entradasActual = 0;
        let entradasProyecto = 0;
        for (const f of fcEntradas.features) {
          const estado = f.properties?.Entradas_barrio;
          if (estado === ENTRADA_ACTUAL) entradasActual++;
          else if (estado === ENTRADA_PROYECTO) entradasProyecto++;
        }
        onEstado({
          fase: 'listo',
          conteos: {
            manzanas: fcManzanas.features.length,
            calles: fcCalles.features.length,
            callesAsfalto,
            callesRipio,
            cauces: fcCauces.features.length,
            entradasActual,
            entradasProyecto,
          },
        });

      } catch (e) {
        if (!vivo) return;
        onEstado({ fase: 'error', mensaje: e instanceof Error ? e.message : String(e) });
      }
    }

    map.on('load', () => {
      void cargar();
    });

    return () => {
      vivo = false;
      mapaRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplicar visibilidad de capas (y re-aplicar cuando termina la carga)
  useEffect(() => {
    const map = mapaRef.current;
    if (!map || !capasListas) return;
    for (const [capa, visible] of Object.entries(visibles)) {
      for (const id of GRUPOS[capa as keyof CapasVisibles]) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
      }
    }
  }, [visibles, capasListas]);

  // Aplicar mapa base
  useEffect(() => {
    const map = mapaRef.current;
    if (!map || !capasListas) return;
    aplicarBase(map, base);
  }, [base, capasListas]);

  // Estilo inline a propósito: la hoja de estilos de MapLibre
  // (`.maplibregl-map{position:relative}`) se emite DESPUÉS de las utilidades
  // de Tailwind y le gana al mismo nivel de especificidad; sin `position:absolute`
  // en línea el contenedor colapsa a altura 0 y el canvas no se ve nunca.
  return <div ref={mapContainer} className="absolute inset-0" style={{ position: 'absolute', inset: 0 }} />;
}
