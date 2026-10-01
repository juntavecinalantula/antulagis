import type { FeatureCollection, Geometry } from 'geojson';

/** Fila plana devuelta por la REST de InsForge (una columna `geom` GeoJSON). */
export type Fila = Record<string, unknown>;

/** Conteos de features por capa. `calles` es el total (asfalto + ripio). */
export type Conteos = {
  manzanas: number;
  calles: number;
  callesAsfalto: number;
  callesRipio: number;
  cauces: number;
  entradasActual: number;
  entradasProyecto: number;
};

/** Estado de visibilidad de cada capa del visor. */
export type CapasVisibles = {
  manzanas: boolean;
  callesAsfalto: boolean;
  callesRipio: boolean;
  cauces: boolean;
  entradasActual: boolean;
  entradasProyecto: boolean;
};

/** Valores del atributo `tipo` de la tabla `calles`. */
export const TIPO_ASFALTO = 1;
export const TIPO_RIPIO = 2;

/** Valores del atributo `Entradas_barrio` de la tabla `entradas`. */
export const ENTRADA_ACTUAL = 'Actual';
export const ENTRADA_PROYECTO = 'Proyecto';

/** Clasifica una calle según su atributo `tipo` (1 = asfalto, 2 = ripio). */
export function claseDeCalle(tipo: unknown): 'asfalto' | 'ripio' | 'otra' {
  const t = Number(tipo);
  if (t === TIPO_ASFALTO) return 'asfalto';
  if (t === TIPO_RIPIO) return 'ripio';
  return 'otra';
}

/** Porcentaje entero (0–100) de `n` sobre `total`; 0 si no hay total. */
export function porcentaje(n: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((n / total) * 100);
}

/** Etiquetas en español para los atributos de los popups. */
export const ETIQUETAS: Record<string, string> = {
  codigo: 'Código',
  nombre: 'Nombre',
  mza: 'Manzana',
  tipo: 'Tipo',
  Asfalto: 'Pavimento',
  waterway: 'Tipo de cauce',
  name: 'Nombre (OSM)',
  osm_id: 'ID OSM',
  osm_type: 'Tipo OSM',
  full_id: 'ID completo',
  fid: 'fid',
  Entradas_barrio: 'Estado',
};

/** Escapa HTML para los popups (los properties vienen de la base de datos). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/**
 * Convierte filas de la REST (con `geom` como geometría GeoJSON) a un
 * FeatureCollection listo para MapLibre. Las filas sin geometría se ignoran.
 */
export function filasAFeatureCollection(filas: Fila[]): FeatureCollection {
  const features = [];
  for (const fila of filas) {
    if (!fila.geom || typeof fila.geom !== 'object') continue;
    const props: Fila = { ...fila };
    const geom = props.geom as Geometry;
    delete props.geom;
    features.push({ type: 'Feature' as const, geometry: geom, properties: props });
  }
  return { type: 'FeatureCollection', features };
}

export type BBox = [number, number, number, number];

function encerrar(coords: unknown, acc: BBox): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    acc[0] = Math.min(acc[0], coords[0]);
    acc[1] = Math.min(acc[1], coords[1]);
    acc[2] = Math.max(acc[2], coords[0]);
    acc[3] = Math.max(acc[3], coords[1]);
    return;
  }
  for (const anillo of coords) encerrar(anillo, acc);
}

function encerrarGeometria(geometria: Geometry | null | undefined, acc: BBox): void {
  if (!geometria) return;
  if (geometria.type === 'GeometryCollection') {
    for (const sub of geometria.geometries) encerrarGeometria(sub, acc);
    return;
  }
  encerrar(geometria.coordinates, acc);
}

/** Bounding box que une todos los FeatureCollections dados (o null si están vacíos). */
export function bboxDeFCs(fcs: FeatureCollection[]): BBox | null {
  const acc: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const fc of fcs) {
    for (const f of fc.features) encerrarGeometria(f.geometry, acc);
  }
  return Number.isFinite(acc[0]) ? acc : null;
}
