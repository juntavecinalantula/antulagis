import { useCallback, useEffect, useMemo, useState } from 'react';
import { insforge } from './insforgeClient';
import { ESTADOS_REPORTE, type Fila } from './datos';

/** Reporte vecinal (problema o propuesta) con los campos que usa la interfaz. */
export type Reporte = {
  id: number;
  codigo?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  categoria: string;
  estado: string;
  prioridad?: string | null;
  direccion?: string | null;
  canal?: string | null;
  lat?: number | null;
  lon?: number | null;
  apoyos?: number | null;
  created_at: string;
  resuelto_en?: string | null;
};

/** Indicadores agregados de la participación vecinal. */
export type Resumen = {
  totalProblemas: number;
  totalPropuestas: number;
  resueltos: number;
  enGestion: number;
  nuevos: number;
  /** Porcentaje entero de problemas resueltos (0–100). */
  pctResueltos: number;
  porEstado: Record<string, number>;
  porCategoria: Record<string, number>;
  porPrioridad: Record<string, number>;
  /** Promedio de días entre la creación y la resolución (null si no hay datos). */
  tiempoMedioResolucionDias: number | null;
};

/** Top de categorías más reportadas (para el tablero). */
export type CategoriaTop = { categoria: string; cantidad: number };

/** Normaliza una fila cruda de la REST al tipo `Reporte`. */
function aReporte(fila: Fila): Reporte {
  return {
    id: Number(fila.id),
    codigo: (fila.codigo as string | null) ?? null,
    titulo: (fila.titulo as string | null) ?? null,
    descripcion: (fila.descripcion as string | null) ?? null,
    categoria: String(fila.categoria ?? 'otro'),
    estado: String(fila.estado ?? 'nuevo'),
    prioridad: (fila.prioridad as string | null) ?? null,
    direccion: (fila.direccion as string | null) ?? null,
    canal: (fila.canal as string | null) ?? null,
    lat: typeof fila.lat === 'number' ? fila.lat : null,
    lon: typeof fila.lon === 'number' ? fila.lon : null,
    apoyos: typeof fila.apoyos === 'number' ? fila.apoyos : null,
    created_at: String(fila.created_at ?? ''),
    resuelto_en: (fila.resuelto_en as string | null) ?? null,
  };
}

/**
 * Descarga los reportes vecinales (problemas y propuestas) con RLS de solo
 * lectura. La anon key es pública: las políticas `SELECT` de `anon` permiten
 * ver las filas.
 */
export async function fetchReportes(): Promise<{ problemas: Reporte[]; propuestas: Reporte[] }> {
  const [rProb, rProp] = await Promise.all([
    insforge.database
      .from('problemas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000),
    insforge.database
      .from('propuestas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);
  if (rProb.error) throw rProb.error;
  if (rProp.error) throw rProp.error;
  return {
    problemas: ((rProb.data ?? []) as unknown as Fila[]).map(aReporte),
    propuestas: ((rProp.data ?? []) as unknown as Fila[]).map(aReporte),
  };
}

/** Calcula los indicadores del tablero a partir de las listas ya descargadas. */
export function calcularResumen(
  problemas: Reporte[],
  propuestas: Reporte[],
): Resumen {
  const porEstado: Record<string, number> = {};
  const porCategoria: Record<string, number> = {};
  const porPrioridad: Record<string, number> = {};
  let resueltos = 0;
  let enGestion = 0;
  let nuevos = 0;
  const diasResolucion: number[] = [];

  for (const p of problemas) {
    porEstado[p.estado] = (porEstado[p.estado] ?? 0) + 1;
    porCategoria[p.categoria] = (porCategoria[p.categoria] ?? 0) + 1;
    if (p.prioridad) porPrioridad[p.prioridad] = (porPrioridad[p.prioridad] ?? 0) + 1;
    if (p.estado === 'resuelto') resueltos++;
    else if (p.estado === 'en_proceso' || p.estado === 'en_revision') enGestion++;
    else if (p.estado === 'nuevo') nuevos++;
    if (p.resuelto_en) {
      const dias = (Date.parse(p.resuelto_en) - Date.parse(p.created_at)) / 86_400_000;
      if (Number.isFinite(dias) && dias >= 0) diasResolucion.push(dias);
    }
  }

  for (const p of propuestas) {
    porEstado[p.estado] = (porEstado[p.estado] ?? 0) + 1;
    porCategoria[p.categoria] = (porCategoria[p.categoria] ?? 0) + 1;
  }

  return {
    totalProblemas: problemas.length,
    totalPropuestas: propuestas.length,
    resueltos,
    enGestion,
    nuevos,
    pctResueltos: problemas.length > 0 ? Math.round((resueltos / problemas.length) * 100) : 0,
    porEstado,
    porCategoria,
    porPrioridad,
    tiempoMedioResolucionDias:
      diasResolucion.length > 0
        ? Math.round(
            (diasResolucion.reduce((a, b) => a + b, 0) / diasResolucion.length) * 10,
          ) / 10
        : null,
  };
}

/** Categorías ordenadas por cantidad de reportes (de mayor a menor). */
export function topCategorias(resumen: Resumen, limite = 6): CategoriaTop[] {
  return Object.entries(resumen.porCategoria)
    .map(([categoria, cantidad]) => ({ categoria, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, limite);
}

/** Reportes más recientes (tablero y panel de seguimiento). */
export function masRecientes<T extends Reporte>(lista: T[], limite = 5): T[] {
  return [...lista]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, limite);
}

/** Normaliza texto para búsquedas (minúsculas y sin acentos). */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Filtra una lista de reportes por texto libre, estado y categoría. */
export function filtrarReportes(
  lista: Reporte[],
  opciones: { busqueda?: string; estado?: string; categoria?: string },
): Reporte[] {
  const { busqueda = '', estado = '', categoria = '' } = opciones;
  const texto = normalizar(busqueda.trim());
  return lista.filter((r) => {
    if (estado && r.estado !== estado) return false;
    if (categoria && r.categoria !== categoria) return false;
    if (!texto) return true;
    return (
      normalizar(r.titulo ?? '').includes(texto) ||
      normalizar(r.descripcion ?? '').includes(texto) ||
      normalizar(r.direccion ?? '').includes(texto) ||
      normalizar(r.codigo ?? '').includes(texto)
    );
  });
}

/** Estado y carga de los datos vecinales compartidos por toda la app. */
export type EstadoReportes = {
  problemas: Reporte[];
  propuestas: Reporte[];
  resumen: Resumen;
  loading: boolean;
  error: string | null;
  recargar: () => void;
};

/**
 * Hook único de datos vecinales: descarga problemas y propuestas y calcula los
 * indicadores del tablero. `refreshKey` cambia para forzar la recarga tras un
 * reporte nuevo (mismo patrón que `VisualizacionDatos`).
 */
export function useReportes(refreshKey = 0): EstadoReportes {
  const [problemas, setProblemas] = useState<Reporte[]>([]);
  const [propuestas, setPropuestas] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(refreshKey);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setLoading(true);
      setError(null);
      try {
        const { problemas: p, propuestas: pr } = await fetchReportes();
        if (!vivo) return;
        setProblemas(p);
        setPropuestas(pr);
      } catch (e) {
        if (!vivo) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (vivo) setLoading(false);
      }
    }
    void cargar();
    return () => {
      vivo = false;
    };
  }, [tick, refreshKey]);

  const recargar = useCallback(() => setTick((t) => t + 1), []);

  const resumen = useMemo(() => calcularResumen(problemas, propuestas), [problemas, propuestas]);

  return { problemas, propuestas, resumen, loading, error, recargar };
}

/** Etiquetas de estado ordenadas por el catálogo (para menus y filtros). */
export const ETIQUETAS_ESTADO = ESTADOS_REPORTE;
