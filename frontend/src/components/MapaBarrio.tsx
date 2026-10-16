import { useEffect, useRef, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapaML } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { insforge, faltaConfig } from '../lib/insforgeClient';
import {
  bboxDeFCs,
  claseDeCalle,
  escapeHtml,
  etiquetaCategoria,
  etiquetaEstado,
  ESTADOS_REPORTE,
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

/** Filtros activos sobre las capas vecinales (problemas / propuestas). */
export type FiltroReportes = {
  estado: string; // '' = todos
  categoria: string; // '' = todas
};

type Props = {
  visibles: CapasVisibles;
  base: BaseId;
  onEstado: (estado: EstadoMapa) => void;
  filtros?: FiltroReportes;
  /** Cambia para recargar problemas/propuestas tras un nuevo reporte. */
  refreshKey?: number;
  /** Callback del popup de propuestas: apoyar / retirar apoyo. */
  onApoyarPropuesta?: (id: number, apoyado: boolean) => void;
  /** Cuando true, el siguiente click en el mapa elige la ubicación (no abre popup). */
  modoUbicacion?: boolean;
  /** Llamado con [lng, lat] cuando el usuario elige una ubicación en el mapa. */
  onUbicacionElegida?: (ubicacion: [number, number]) => void;
};

/** Capas de MapLibre que conmuta cada checkbox. */
const GRUPOS: Record<keyof CapasVisibles, string[]> = {
  manzanas: ['manzanas-fill', 'manzanas-label'],
  callesAsfalto: ['calles-asfalto-line'],
  callesRipio: ['calles-ripio-line'],
  cauces: ['cauces-line'],
  informacion: ['informacion-circle'],
  luminaria: ['luminaria-circle'],
  entradas: ['entradas-line'],
  problemas: ['problemas-circle'],
  propuestas: ['propuestas-circle'],
};

/** Capas de MapLibre que reciben popup (incluye las dos de calles). */
const CAPAS_CON_POPUP = [
  'manzanas-fill',
  'calles-asfalto-line',
  'calles-ripio-line',
  'cauces-line',
  'informacion-circle',
  'luminaria-circle',
  'entradas-line',
  'problemas-circle',
  'propuestas-circle',
];

/** Propiedades que no deben mostrarse crudas en el popup. */
const POPUP_OMITIR = new Set(['geom', 'dominio_categoria', 'dominio_estado', 'dominio_prioridad', 'dominio_canal', 'autor_id', 'barrio_id']);

function contenidoPopup(
  propiedades: Record<string, unknown> | null | undefined,
): string {
  if (!propiedades) return '';
  const filas = Object.entries(propiedades)
    .filter(([k, v]) => !POPUP_OMITIR.has(k) && v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      let valor: unknown = v;
      // Traducir catálogo a etiqueta legible (estilo Pulso Ciudadano / Munify)
      if (k === 'estado') valor = etiquetaEstado(v);
      else if (k === 'categoria') valor = etiquetaCategoria(v);
      else if ((k === 'created_at' || k === 'resuelto_en' || k === 'updated_at') && v) {
        valor = new Date(String(v)).toLocaleString('es-AR');
      }
      return `<tr><td style="color:#64748b;padding-right:8px;vertical-align:top;">${escapeHtml(ETIQUETAS[k] ?? k)}</td><td><b>${escapeHtml(valor)}</b></td></tr>`;
    })
    .join('');
  return `<div style="font-family:sans-serif;font-size:13px;"><table>${filas}</table></div>`;
}

/** Color del punto según el estado del reporte (catálogo `estado_reporte`). */
function expresionColorEstado(): maplibregl.ExpressionSpecification {
  const steps: unknown[] = [];
  for (const e of ESTADOS_REPORTE) steps.push(e.valor, e.color);
  return ['coalesce', ['match', ['get', 'estado'], ...steps, '#64748b']] as unknown as maplibregl.ExpressionSpecification;
}

export default function MapaBarrio({
  visibles,
  base,
  onEstado,
  filtros,
  refreshKey = 0,
  onApoyarPropuesta,
  modoUbicacion = false,
  onUbicacionElegida,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaML | null>(null);
  const [capasListas, setCapasListas] = useState(false);
  // Última respuesta conocida de problemas/propuestas para poder refiltrar sin recargar.
  const ultimosReportes = useRef<{ fcProb: FeatureCollection; fcProp: FeatureCollection } | null>(null);
  // Refs para leer props actuales desde handlers registrados una sola vez.
  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;
  const apoyarRef = useRef(onApoyarPropuesta);
  apoyarRef.current = onApoyarPropuesta;
  const modoUbicacionRef = useRef(modoUbicacion);
  modoUbicacionRef.current = modoUbicacion;
  const onUbicacionElegidaRef = useRef(onUbicacionElegida);
  onUbicacionElegidaRef.current = onUbicacionElegida;

  /**
   * Carga problemas y propuestas georreferenciados aplicando los filtros de
   * estado/categoría (patrón "mapa público con filtros" de pulsociudadano.app).
   */
  async function recargarReportes(map: MapaML): Promise<void> {
    const f = filtrosRef.current ?? { estado: '', categoria: '' };
    let qProb = insforge.database.from('problemas').select('*').not('geom', 'is', null).limit(2000);
    let qProp = insforge.database.from('propuestas').select('*').not('geom', 'is', null).limit(2000);
    if (f.estado) {
      qProb = qProb.eq('estado', f.estado);
      qProp = qProp.eq('estado', f.estado);
    }
    if (f.categoria) {
      qProb = qProb.eq('categoria', f.categoria);
      qProp = qProp.eq('categoria', f.categoria);
    }
    const [rProb, rProp] = await Promise.all([qProb, qProp]);
    const fallo = rProb.error ?? rProp.error;
    if (fallo) throw fallo;
    const fcProb = filasAFeatureCollection((rProb.data ?? []) as Fila[]);
    const fcProp = filasAFeatureCollection((rProp.data ?? []) as Fila[]);
    ultimosReportes.current = { fcProb, fcProp };
    (map.getSource('problemas') as maplibregl.GeoJSONSource | undefined)?.setData(fcProb);
    (map.getSource('propuestas') as maplibregl.GeoJSONSource | undefined)?.setData(fcProp);
  }

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
        const [rCalles, rManzanas, rCauces, rInformacion, rLuminaria, rEntradas] = await Promise.all([
          insforge.database.from('calles').select('*').limit(1000),
          insforge.database.from('manzanas').select('*').limit(1000),
          insforge.database.from('waterways').select('*').limit(1000),
          insforge.database.from('informacion').select('*').limit(1000),
          insforge.database.from('luminaria_publica').select('*').limit(2000),
          insforge.database.from('entradas').select('*').limit(1000),
        ]);
        if (!vivo) return;
        const fallo =
          rCalles.error ??
          rManzanas.error ??
          rCauces.error ??
          rInformacion.error ??
          rLuminaria.error ??
          rEntradas.error;
        if (fallo) throw fallo;

        const fcCalles = filasAFeatureCollection((rCalles.data ?? []) as Fila[]);
        const fcManzanas = filasAFeatureCollection((rManzanas.data ?? []) as Fila[]);
        const fcCauces = filasAFeatureCollection((rCauces.data ?? []) as Fila[]);
        const fcInformacion = filasAFeatureCollection((rInformacion.data ?? []) as Fila[]);
        const fcLuminaria = filasAFeatureCollection((rLuminaria.data ?? []) as Fila[]);
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
        map.addSource('informacion', { type: 'geojson', data: fcInformacion });
        map.addSource('luminaria', { type: 'geojson', data: fcLuminaria });
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
          paint: { 'line-color': '#0f31ddf0', 'line-width': 4, 'line-dasharray': [3, 1, 1, 1] },
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
        // Información georreferenciada: puntos azules con popup (nombre del lugar)
        map.addLayer({
          id: 'informacion-circle',
          type: 'circle',
          source: 'informacion',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 5, 17, 10],
            'circle-color': '#0ea5e9',
            'circle-stroke-color': '#0c4a6e',
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.9,
          },
        });
        // Luminaria pública: puntos dorados (faroles)
        map.addLayer({
          id: 'luminaria-circle',
          type: 'circle',
          source: 'luminaria',
          minzoom: 14,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 2.5, 18, 6],
            'circle-color': '#f59e0b',
            'circle-stroke-color': '#78350f',
            'circle-stroke-width': 1,
            'circle-opacity': 0.95,
          },
        });
        // Entradas al barrio: líneas verdes (accesos)
        map.addLayer({
          id: 'entradas-line',
          type: 'line',
          source: 'entradas',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#16a34a',
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 17, 5],
          },
        });

        // ── Capas vecinales (problemas / propuestas) ────────────────────────
        // Inspiradas en el "mapa público con cada reclamo activo" de
        // pulsociudadano.app y munify: puntos coloreados por estado.
        map.addSource('problemas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addSource('propuestas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'problemas-circle',
          type: 'circle',
          source: 'problemas',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 5, 17, 9],
            'circle-color': expresionColorEstado(),
            'circle-stroke-color': '#7f1d1d',
            'circle-stroke-width': 1.2,
            'circle-opacity': 0.92,
          },
        });
        map.addLayer({
          id: 'propuestas-circle',
          type: 'circle',
          source: 'propuestas',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 5, 17, 9],
            'circle-color': expresionColorEstado(),
            'circle-stroke-color': '#14532d',
            'circle-stroke-width': 1.2,
            'circle-opacity': 0.92,
          },
        });
        // Anillo punteado para distinguir propuestas (verde) de problemas (rojo)
        map.addLayer({
          id: 'propuestas-ring',
          type: 'circle',
          source: 'propuestas',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 9, 17, 14],
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-color': '#16a34a',
            'circle-stroke-width': 1.5,
          },
        });

        // Cargar los reportes vecinales georreferenciados (con filtros activos)
        await recargarReportes(map);

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

        // Modo "ubicar en el mapa": el siguiente click sobre el suelo (sin feature)
        // elige la coordenada para el formulario activo. Se registra una sola vez
        // aquí (no en cada capa) para que funcione fuera de los puntos existentes.
        map.on('click', (e) => {
          if (!modoUbicacionRef.current) return;
          const feats = (e as unknown as { features?: unknown[] }).features;
          if (feats && feats.length > 0) return; // click sobre un feature → popup
          onUbicacionElegidaRef.current?.([e.lngLat.lng, e.lngLat.lat]);
        });

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
        onEstado({
          fase: 'listo',
          conteos: {
            manzanas: fcManzanas.features.length,
            calles: fcCalles.features.length,
            callesAsfalto,
            callesRipio,
            cauces: fcCauces.features.length,
            informacion: fcInformacion.features.length,
            luminaria: fcLuminaria.features.length,
            entradas: fcEntradas.features.length,
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

    // Popup enriquecido para propuestas: ficha + botón "Apoyar" (Ciudad Abierta).
    map.on('click', 'propuestas-circle', (e) => {
      const f = e.features?.[0];
      if (!f || f.id === undefined && f.properties?.id === undefined) return;
      const id = Number(f.properties?.id);
      const html = contenidoPopup(f.properties);
      new maplibregl.Popup({ closeButton: true })
        .setLngLat(e.lngLat)
        .setHTML(
          `${html}<button id="btn-apoyar-${id}" style="margin-top:8px;width:100%;background:#16a34a;color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:13px;font-weight:600;cursor:pointer;">👍 Apoyar propuesta</button>`,
        )
        .addTo(map);
      // Enlazar el botón después de que el popup esté en el DOM.
      requestAnimationFrame(() => {
        const btn = document.getElementById(`btn-apoyar-${id}`);
        if (btn) btn.onclick = () => apoyarRef.current?.(id, true);
      });
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
    // La visibilidad del anillo de propuestas sigue a la capa base.
    if (map.getLayer('propuestas-ring')) {
      map.setLayoutProperty('propuestas-ring', 'visibility', visibles.propuestas ? 'visible' : 'none');
    }
  }, [visibles, capasListas]);

  // Recargar reportes vecinales cuando cambian los filtros o se refresca (nuevo reporte)
  useEffect(() => {
    const map = mapaRef.current;
    if (!map || !capasListas) return;
    void recargarReportes(map).catch((e) => console.error('refiltrando reportes', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros?.estado, filtros?.categoria, refreshKey, capasListas]);

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
