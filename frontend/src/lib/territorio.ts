import { useEffect, useState } from 'react';
import { insforge } from './insforgeClient';
import type { Fila } from './datos';
import { normalizar } from './reportes';

export type Calle = {
  id: number;
  nombre: string | null;
  material: string | null;
  tipo: number | null;
  longitud_m: number | null;
  estado: string | null;
};

export type Manzana = {
  id: number;
  codigo: string | null;
  nombre: string | null;
  mza: string | null;
  superficie_m2: number | null;
  tipo: string | null;
};

export type Territorio = {
  calles: Calle[];
  manzanas: Manzana[];
  loading: boolean;
  error: string | null;
};

const VACIO: Territorio = { calles: [], manzanas: [], loading: true, error: null };

/** Descarga el catastro territorial (calles y manzanas) desde InsForge. */
export function useTerritorio(): Territorio {
  const [datos, setDatos] = useState<Territorio>(VACIO);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      try {
        // `calles` es la capa curada (pavimento y longitud); el nombre real de
        // la calle vive en `road` (export OSM) y se une por `fid`.
        const [rCalles, rManzanas, rRoad] = await Promise.all([
          insforge.database
            .from('calles')
            .select('id, fid, nombre, material, tipo, longitud_m, estado')
            .limit(2000),
          insforge.database
            .from('manzanas')
            .select('id, codigo, nombre, mza, superficie_m2, tipo')
            .limit(2000),
          insforge.database.from('road').select('fid, name').limit(5000),
        ]);
        if (!vivo) return;
        if (rCalles.error) throw rCalles.error;
        if (rManzanas.error) throw rManzanas.error;
        const nombresRoad = new Map<string, string>();
        for (const f of (rRoad.data ?? []) as unknown as Fila[]) {
          if (f.fid !== undefined && f.name) nombresRoad.set(String(f.fid), String(f.name));
        }
        setDatos({
          calles: ((rCalles.data ?? []) as unknown as Fila[]).map((f) => ({
            id: Number(f.id),
            nombre:
              (f.nombre as string | null) ??
              nombresRoad.get(String(f.fid ?? '')) ??
              null,
            material: (f.material as string | null) ?? null,
            tipo: typeof f.tipo === 'number' ? f.tipo : null,
            longitud_m: typeof f.longitud_m === 'number' ? f.longitud_m : null,
            estado: (f.estado as string | null) ?? null,
          })),
          manzanas: ((rManzanas.data ?? []) as unknown as Fila[]).map((f) => ({
            id: Number(f.id),
            codigo: (f.codigo as string | null) ?? null,
            nombre: (f.nombre as string | null) ?? null,
            mza: (f.mza as string | null) ?? null,
            superficie_m2: typeof f.superficie_m2 === 'number' ? f.superficie_m2 : null,
            tipo: (f.tipo as string | null) ?? null,
          })),
          loading: false,
          error: null,
        });
      } catch (e) {
        if (!vivo) return;
        setDatos({
          calles: [],
          manzanas: [],
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    void cargar();
    return () => {
      vivo = false;
    };
  }, []);

  return datos;
}

/** Filtra calles por texto libre (nombre, material o estado). */
export function filtrarCalles(calles: Calle[], busqueda: string): Calle[] {
  const texto = normalizar(busqueda.trim());
  if (!texto) return calles;
  return calles.filter(
    (c) =>
      normalizar(c.nombre ?? '').includes(texto) ||
      normalizar(c.material ?? '').includes(texto) ||
      normalizar(c.estado ?? '').includes(texto),
  );
}

/** Filtra manzanas por texto libre (código, nombre o mza). */
export function filtrarManzanas(manzanas: Manzana[], busqueda: string): Manzana[] {
  const texto = normalizar(busqueda.trim());
  if (!texto) return manzanas;
  return manzanas.filter(
    (m) =>
      normalizar(m.codigo ?? '').includes(texto) ||
      normalizar(m.nombre ?? '').includes(texto) ||
      normalizar(m.mza ?? '').includes(texto),
  );
}

/** Calles agrupadas por tipo de pavimento (asfalto / ripio / otros). */
export function repartoPorPavimento(calles: Calle[]): { material: string; cantidad: number }[] {
  const conteo = new Map<string, number>();
  for (const c of calles) {
    const clave = c.material ?? (c.tipo === 1 ? 'asfalto' : c.tipo === 2 ? 'ripio' : 'sin clasificar');
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([material, cantidad]) => ({ material, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

/** Metros lineales de calzada por tipo de pavimento. */
export function metrosPorPavimento(calles: Calle[]): Map<string, number> {
  const metros = new Map<string, number>();
  for (const c of calles) {
    const clave = c.material ?? (c.tipo === 1 ? 'asfalto' : c.tipo === 2 ? 'ripio' : 'sin clasificar');
    metros.set(clave, (metros.get(clave) ?? 0) + (c.longitud_m ?? 0));
  }
  return metros;
}

/** Total de superficie (m²) de las manzanas del barrio. */
export function superficieTotal(manzanas: Manzana[]): number {
  return manzanas.reduce((acc, m) => acc + (m.superficie_m2 ?? 0), 0);
}
