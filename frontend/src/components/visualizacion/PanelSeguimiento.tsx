import React, { useEffect, useMemo, useState } from 'react';
import { insforge } from '../../lib/insforgeClient';
import type { Fila } from '../../lib/datos';
import {
  etiquetaCategoria,
  etiquetaEstado,
  ESTADO_INFO,
  haceTiempo,
} from '../../lib/datos';

type Reporte = {
  id: number;
  codigo?: string | null;
  titulo?: string | null;
  descripcion: string;
  categoria: string;
  estado: string;
  prioridad?: string | null;
  direccion?: string | null;
  created_at: string;
};

type CambioHistorial = {
  entidad: string;
  entidad_id: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  created_at: string;
};

interface Props {
  filtroEstado: string;
  filtroCategoria: string;
  /** Cambia para recargar tras un nuevo reporte. */
  refreshKey?: number;
}

// Seguimiento público de los reportes, al estilo de:
//  · Ciudad Abierta → listas "Últimos reclamos / Últimas propuestas"
//  · Pulso Ciudadano → código + estado visible por caso
//  · Munify → trazabilidad "de punta a punta" (histórico de cambios)
export const PanelSeguimiento: React.FC<Props> = ({
  filtroEstado,
  filtroCategoria,
  refreshKey = 0,
}) => {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [historial, setHistorial] = useState<CambioHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setLoading(true);
      setError(null);
      try {
        let q = insforge.database
          .from('problemas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (filtroEstado) q = q.eq('estado', filtroEstado);
        if (filtroCategoria) q = q.eq('categoria', filtroCategoria);

        const { data, error: e1 } = await q;
        if (e1) throw e1;
        const rows = (data ?? []) as Fila[];
        if (!vivo) return;
        const lista: Reporte[] = rows.map((r) => ({
          id: Number(r.id),
          codigo: (r.codigo as string) ?? null,
          titulo: (r.titulo as string) ?? null,
          descripcion: String(r.descripcion ?? ''),
          categoria: String(r.categoria ?? 'otro'),
          estado: String(r.estado ?? 'nuevo'),
          prioridad: (r.prioridad as string) ?? null,
          direccion: (r.direccion as string) ?? null,
          created_at: String(r.created_at ?? ''),
        }));
        setReportes(lista);

        // Histórico de cambios solo si la BD ya tiene filas (tabla nueva).
        const h = await insforge.database
          .from('historial_estados')
          .select('*')
          .eq('entidad', 'problemas')
          .order('created_at', { ascending: false })
          .limit(100);
        if (!h.error && vivo) {
          setHistorial(((h.data ?? []) as Fila[]).map((x) => ({
            entidad: String(x.entidad),
            entidad_id: Number(x.entidad_id),
            estado_anterior: (x.estado_anterior as string) ?? null,
            estado_nuevo: String(x.estado_nuevo ?? ''),
            created_at: String(x.created_at ?? ''),
          })));
        }
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (vivo) setLoading(false);
      }
    }
    void cargar();
    return () => {
      vivo = false;
    };
  }, [filtroEstado, filtroCategoria, refreshKey]);

  const historialPorReporte = useMemo(() => {
    const m = new Map<number, CambioHistorial[]>();
    for (const c of historial) {
      const arr = m.get(c.entidad_id) ?? [];
      arr.push(c);
      m.set(c.entidad_id, arr);
    }
    return m;
  }, [historial]);

  return (
    <div className="p-4 bg-white shadow rounded mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-md font-bold">Seguimiento de reportes</h3>
        {loading && <span className="text-xs text-gray-400">Actualizando…</span>}
      </div>

      {error && <p className="mb-3 text-sm text-red-600 break-words">{error}</p>}

      {!loading && reportes.length === 0 && !error && (
        <p className="text-sm text-slate-500">
          Todavía no hay problemas reportados. ¡Animáte a ser el primero!
        </p>
      )}

      <ul className="space-y-2">
        {reportes.map((r) => {
          const info = ESTADO_INFO.get(r.estado);
          const cambios = historialPorReporte.get(r.id) ?? [];
          const isOpen = abierto === r.id;
          return (
            <li key={r.id} className="rounded border border-slate-200 p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {r.titulo || r.descripcion.slice(0, 60)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.codigo ? <span className="font-mono">{r.codigo} · </span> : null}
                    {etiquetaCategoria(r.categoria)}
                    {r.direccion ? ` · ${r.direccion}` : ''}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: info?.color ?? '#64748b' }}
                >
                  {etiquetaEstado(r.estado)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">{haceTiempo(r.created_at)}</span>
                {cambios.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAbierto(isOpen ? null : r.id)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    {isOpen ? 'Ocultar historial' : `Ver historial (${cambios.length})`}
                  </button>
                )}
              </div>
              {isOpen && (
                <ol className="mt-2 space-y-1 border-l-2 border-slate-200 pl-3">
                  {cambios.map((c, i) => (
                    <li key={i} className="text-xs text-slate-600">
                      <b>{etiquetaEstado(c.estado_nuevo)}</b>
                      {c.estado_anterior ? ` (desde ${etiquetaEstado(c.estado_anterior)})` : ''}
                      <span className="text-slate-400"> · {haceTiempo(c.created_at)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
