import type { Feature, FeatureCollection, Geometry, LineString, MultiLineString } from 'geojson';
import type { Fila } from './datos';

/** Feature lineal (una calle) con las propiedades que arma `filasAFeatureCollection`. */
export type FeatureLinea = Feature<LineString | MultiLineString, Fila>;

/** Nombre de calle por `fid` de la capa curada (tabla `road` = export OSM). */
export function nombresDeCalles(filas: Fila[]): Map<string, string> {
  const nombres = new Map<string, string>();
  for (const fila of filas) {
    if (fila.fid === undefined || fila.fid === null) continue;
    const nombre = fila.name ?? fila.nombre;
    if (nombre) nombres.set(String(fila.fid), String(nombre));
  }
  return nombres;
}

/** Recorre las coordenadas de una geometría GeoJSON. */
function recorrer(coords: unknown, visitar: (p: [number, number]) => void): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    visitar([coords[0], coords[1]]);
    return;
  }
  for (const sub of coords) recorrer(sub, visitar);
}

/** Diagonal de la caja envolvente: aproximación de la longitud de un tramo. */
export function largoAproximado(feature: FeatureLinea): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  recorrer(feature.geometry?.coordinates, ([x, y]) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  if (!Number.isFinite(minX)) return 0;
  return Math.hypot(maxX - minX, maxY - minY);
}

/**
 * Copia el nombre de la calle (unido por `fid` con la capa OSM) a las
 * propiedades de cada tramo de la capa curada `calles`.
 */
export function nombrarCalles(fc: FeatureCollection, nombres: Map<string, string>): void {
  for (const feature of fc.features) {
    const props = feature.properties as Fila | null;
    if (!props) continue;
    const nombre =
      (props.nombre_calle as string | undefined) ??
      nombres.get(String(props.fid ?? '')) ??
      undefined;
    if (nombre) props.nombre_calle = nombre;
  }
}

/**
 * Colección de etiquetas: una sola feature por calle (el tramo más largo),
 * para que el nombre no se repita en cada segmento de la misma cuadra.
 */
export function featureCollectionDeEtiquetas(fc: FeatureCollection): FeatureCollection {
  const mejorPorNombre = new Map<string, FeatureLinea>();
  for (const feature of fc.features as FeatureLinea[]) {
    const nombre = (feature.properties as Fila | null)?.nombre_calle as string | undefined;
    if (!nombre) continue;
    const actual = mejorPorNombre.get(nombre);
    if (!actual || largoAproximado(feature) > largoAproximado(actual)) {
      mejorPorNombre.set(nombre, feature);
    }
  }
  const features: Feature<Geometry, Fila>[] = [];
  for (const [nombre, feature] of mejorPorNombre) {
    const props = (feature.properties ?? {}) as Fila;
    features.push({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        nombre_calle: nombre,
        // Pavimento del tramo, para el popup al tocar la etiqueta.
        tipo: props.tipo,
        material: props.material,
        // Longitud aproximada: prioriza la etiqueta de la calle más larga
        // cuando varias se superponen.
        largo: largoAproximado(feature),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Cuántas calles del barrio tienen nombre conocido. */
export function callesConNombre(fc: FeatureCollection): number {
  let total = 0;
  for (const feature of fc.features) {
    const nombre = (feature.properties as Fila | null)?.nombre_calle;
    if (nombre) total++;
  }
  return total;
}
