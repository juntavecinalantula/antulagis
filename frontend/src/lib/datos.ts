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
  informacion: number;
  luminaria: number;
  entradas: number;
};

/** Estado de visibilidad de cada capa del visor. */
export type CapasVisibles = {
  manzanas: boolean;
  callesAsfalto: boolean;
  callesRipio: boolean;
  cauces: boolean;
  informacion: boolean;
  luminaria: boolean;
  entradas: boolean;
  problemas: boolean;
  propuestas: boolean;
};

/**
 * Estados del catálogo `estado_reporte` (migración participacion.sql), con el
 * color oficial del catálogo. Inspirado en el circuito visible de
 * pulsociudadano.app: nuevo → en revisión → en proceso → resuelto.
 */
export const ESTADOS_REPORTE: { valor: string; etiqueta: string; color: string }[] = [
  { valor: 'nuevo',       etiqueta: 'Nuevo',       color: '#64748b' },
  { valor: 'en_revision', etiqueta: 'En revisión', color: '#eab308' },
  { valor: 'en_proceso',  etiqueta: 'En proceso',  color: '#0ea5e9' },
  { valor: 'resuelto',    etiqueta: 'Resuelto',    color: '#22c55e' },
  { valor: 'rechazado',   etiqueta: 'Rechazado',   color: '#ef4444' },
  { valor: 'archivado',   etiqueta: 'Archivado',   color: '#94a3b8' },
];

/** Mapa valor → etiqueta/color para popups y listados. */
export const ESTADO_INFO = new Map(ESTADOS_REPORTE.map((e) => [e.valor, e]));

/** Prioridades del catálogo `prioridad`. */
export const PRIORIDADES: { valor: string; etiqueta: string; color: string }[] = [
  { valor: 'baja',    etiqueta: 'Baja',    color: '#22c55e' },
  { valor: 'media',   etiqueta: 'Media',   color: '#eab308' },
  { valor: 'alta',    etiqueta: 'Alta',    color: '#f97316' },
  { valor: 'urgente', etiqueta: 'Urgente', color: '#dc2626' },
];

/** Categorías del catálogo `categoria_problema` (las que acepta la BD). */
export const CATEGORIAS_PROBLEMA: { valor: string; etiqueta: string }[] = [
  { valor: 'calle',           etiqueta: 'Calle en mal estado' },
  { valor: 'alumbrado',       etiqueta: 'Alumbrado público' },
  { valor: 'agua',            etiqueta: 'Agua potable' },
  { valor: 'cloaca',          etiqueta: 'Cloacas / desagües' },
  { valor: 'residuos',        etiqueta: 'Residuos y limpieza' },
  { valor: 'arbolado',        etiqueta: 'Arbolado' },
  { valor: 'seguridad',       etiqueta: 'Seguridad' },
  { valor: 'transito',        etiqueta: 'Tránsito y señalética' },
  { valor: 'inundacion',      etiqueta: 'Inundación / anegamiento' },
  { valor: 'ruido',           etiqueta: 'Ruido y molestias' },
  { valor: 'espacio_publico', etiqueta: 'Espacio público' },
  { valor: 'animales',        etiqueta: 'Animales sueltos' },
  { valor: 'otro',            etiqueta: 'Otro' },
];

/** Categorías del catálogo `categoria_propuesta`. */
export const CATEGORIAS_PROPUESTA: { valor: string; etiqueta: string }[] = [
  { valor: 'calle',           etiqueta: 'Mejora de calle / vereda' },
  { valor: 'alumbrado',       etiqueta: 'Alumbrado público' },
  { valor: 'agua',            etiqueta: 'Agua' },
  { valor: 'cloaca',          etiqueta: 'Cloaca' },
  { valor: 'residuos',        etiqueta: 'Residuos' },
  { valor: 'arbolado',        etiqueta: 'Arbolado / espacios verdes' },
  { valor: 'seguridad',       etiqueta: 'Seguridad' },
  { valor: 'transito',        etiqueta: 'Tránsito' },
  { valor: 'espacio_publico', etiqueta: 'Espacio público' },
  { valor: 'cultura',         etiqueta: 'Cultura' },
  { valor: 'deporte',         etiqueta: 'Deporte' },
  { valor: 'ambiente',        etiqueta: 'Medio ambiente' },
  { valor: 'otro',            etiqueta: 'Otro' },
];

const ETIQUETA_POR_CATEGORIA = new Map<string, string>(
  [...CATEGORIAS_PROBLEMA, ...CATEGORIAS_PROPUESTA].map((c) => [c.valor, c.etiqueta]),
);

export function etiquetaCategoria(valor: unknown): string {
  return ETIQUETA_POR_CATEGORIA.get(String(valor ?? '')) ?? String(valor ?? '');
}

export function etiquetaEstado(valor: unknown): string {
  return ESTADO_INFO.get(String(valor ?? ''))?.etiqueta ?? String(valor ?? '—');
}

/** «hace 3 días», «hace 2 meses»… para los listados tipo "últimos reclamos". */
export function haceTiempo(iso: unknown): string {
  const fecha = new Date(String(iso ?? ''));
  if (Number.isNaN(fecha.getTime())) return '';
  const s = Math.max(0, (Date.now() - fecha.getTime()) / 1000);
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  if (s < 30 * 86400) return `hace ${Math.round(s / 86400)} días`;
  if (s < 365 * 86400) return `hace ${Math.round(s / (30 * 86400))} meses`;
  return `hace ${Math.round(s / (365 * 86400))} años`;
}

/** Valores del atributo `tipo` de la tabla `calles`. */
export const TIPO_ASFALTO = 1;
export const TIPO_RIPIO = 2;

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
  informacion: 'Información',
  ubicacion: 'Ubicación',
  // Luminaria pública
  potencia_w: 'Potencia (W)',
  soporte: 'Soporte',
  altura_m: 'Altura (m)',
  estado: 'Estado',
  // Entradas al barrio
  Entradas_barrio: 'Tipo de acceso',
  longitud_m: 'Longitud (m)',
  // Participación vecinal (problemas / propuestas)
  titulo: 'Título',
  descripcion: 'Descripción',
  direccion: 'Dirección',
  prioridad: 'Prioridad',
  canal: 'Canal',
  codigo: 'Código de seguimiento',
  apoyos: 'Apoyos',
  created_at: 'Creado',
  resuelto_en: 'Resuelto el',
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

/** Par de coordenadas [lng, lat] (un vértice GeoJSON). */
type Punto = [number, number];

/**
 * Recorre de forma recursiva las coordenadas de una geometría GeoJSON y
 * acumula cada vértice (posición [lng, lat]) en `puntos`.
 */
function recolectarPuntos(coords: unknown, puntos: Punto[]): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    puntos.push([coords[0], coords[1]]);
    return;
  }
  for (const sub of coords) recolectarPuntos(sub, puntos);
}

function puntosDeGeometria(geometria: Geometry | null | undefined, puntos: Punto[]): void {
  if (!geometria) return;
  if (geometria.type === 'GeometryCollection') {
    for (const sub of geometria.geometries) puntosDeGeometria(sub, puntos);
    return;
  }
  recolectarPuntos(geometria.coordinates, puntos);
}

/** Mediana de una lista de números (0 si está vacía). */
function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 1
    ? ordenados[mid]
    : (ordenados[mid - 1] + ordenados[mid]) / 2;
}

/**
 * Distancia máxima (en grados) que puede separar a un vértice de la mediana del
 * conjunto para seguir considerándose parte del barrio. Un barrio tiene unos
 * pocos kilómetros; 0,5° ≈ 55 km, holgado para cualquier barrio pero suficiente
 * para descartar geometrías corruptas o de prueba (p. ej. vértices en (0,0)).
 */
const UMBRAL_OUTLIER_GRADOS = 0.5;

/**
 * Bounding box que une todos los FeatureCollections dados (o null si están vacíos).
 *
 * Es robusto a valores atípicos: calcula la mediana de todos los vértices y solo
 * tiene en cuenta los que caen dentro de `UMBRAL_OUTLIER_GRADOS` de ese centro.
 * Así, una sola geometría corrupta (p. ej. un cuadrado de prueba en (0,0)) no
 * desencuadra el mapa a escala continental.
 */
export function bboxDeFCs(fcs: FeatureCollection[]): BBox | null {
  const puntos: Punto[] = [];
  for (const fc of fcs) {
    for (const f of fc.features) puntosDeGeometria(f.geometry, puntos);
  }
  if (puntos.length === 0) return null;

  const cx = mediana(puntos.map((p) => p[0]));
  const cy = mediana(puntos.map((p) => p[1]));
  const validos = puntos.filter(
    (p) =>
      Math.abs(p[0] - cx) <= UMBRAL_OUTLIER_GRADOS &&
      Math.abs(p[1] - cy) <= UMBRAL_OUTLIER_GRADOS,
  );
  if (validos.length === 0) return null;

  const acc: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of validos) {
    acc[0] = Math.min(acc[0], x);
    acc[1] = Math.min(acc[1], y);
    acc[2] = Math.max(acc[2], x);
    acc[3] = Math.max(acc[3], y);
  }
  return Number.isFinite(acc[0]) ? acc : null;
}
