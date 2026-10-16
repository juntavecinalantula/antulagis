import React, { useEffect, useState } from 'react';
import { insforge } from '../../lib/insforgeClient';
import { ESTADOS_REPORTE, etiquetaCategoria } from '../../lib/datos';

interface ProblemaItem {
  id: number;
  estado: string;
  categoria: string;
  created_at: string;
}

interface Stats {
  totalProblemas: number;
  totalPropuestas: number;
  problemasResueltos: number;
  problemasEnProceso: number;
  porEstado: Record<string, number>;
  porCategoria: Record<string, number>;
}

const INITIAL: Stats = {
  totalProblemas: 0,
  totalPropuestas: 0,
  problemasResueltos: 0,
  problemasEnProceso: 0,
  porEstado: {},
  porCategoria: {},
};

// Resumen y estadísticas de participación ciudadana.
// Consulta los totales reales de `problemas` y `propuestas` (lectura pública)
// y recalcula cuando cambia `refreshKey` (para refrescar tras un nuevo reporte).
export const VisualizacionDatos: React.FC<{ refreshKey?: number }> = ({ refreshKey = 0 }) => {
  const [stats, setStats] = useState<Stats>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setLoading(true);
      setError(null);
      try {
        const [rProb, rProp] = await Promise.all([
          insforge.database.from('problemas').select('id, estado, categoria, created_at'),
          insforge.database.from('propuestas').select('id', { count: 'exact', head: true }),
        ]);
        if (!vivo) return;
        if (rProb.error) throw rProb.error;
        if (rProp.error) throw rProp.error;

        const probs = (rProb.data || []) as unknown as ProblemaItem[];
        const porEstado: Record<string, number> = {};
        const porCategoria: Record<string, number> = {};
        let resueltos = 0;
        let enProceso = 0;

        for (const p of probs) {
          const est = p.estado || 'nuevo';
          porEstado[est] = (porEstado[est] || 0) + 1;
          if (est === 'resuelto') resueltos++;
          if (est === 'en_proceso' || est === 'en_revision') enProceso++;

          const cat = p.categoria || 'otro';
          porCategoria[cat] = (porCategoria[cat] || 0) + 1;
        }

        setStats({
          totalProblemas: probs.length,
          totalPropuestas: rProp.count ?? 0,
          problemasResueltos: resueltos,
          problemasEnProceso: enProceso,
          porEstado,
          porCategoria,
        });
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
  }, [refreshKey]);

  const { totalProblemas, totalPropuestas, problemasResueltos, problemasEnProceso, porEstado, porCategoria } = stats;
  const porcentajeResueltos =
    totalProblemas > 0 ? Math.round((problemasResueltos / totalProblemas) * 100) : 0;

  // Categorías ordenadas por frecuencia
  const topCategorias = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="p-4 bg-white shadow rounded mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-md font-bold text-slate-800">Panel de Gestión</h3>
          <p className="text-xs text-slate-500">Métricas y trazabilidad comunal</p>
        </div>
        {loading && <span className="text-xs text-blue-600 font-medium">Actualizando…</span>}
      </div>

      {error && <p className="mb-3 text-sm text-red-600 break-words">{error}</p>}

      {/* Tarjetas KPI estilo Munify */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-center">
          <div className="text-xl font-bold text-blue-600">
            {loading ? '—' : totalProblemas}
          </div>
          <div className="text-[11px] text-slate-600 font-medium">Reclamos Totales</div>
        </div>

        <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
          <div className="text-xl font-bold text-emerald-600">
            {loading ? '—' : `${porcentajeResueltos}%`}
          </div>
          <div className="text-[11px] text-slate-600 font-medium">% Resueltos</div>
        </div>

        <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-center">
          <div className="text-xl font-bold text-amber-600">
            {loading ? '—' : problemasEnProceso}
          </div>
          <div className="text-[11px] text-slate-600 font-medium">En Gestión</div>
        </div>

        <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-center">
          <div className="text-xl font-bold text-indigo-600">
            {loading ? '—' : totalPropuestas}
          </div>
          <div className="text-[11px] text-slate-600 font-medium">Propuestas</div>
        </div>
      </div>

      {/* Progreso de efectividad */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-600 mb-1">
          <span>Efectividad global</span>
          <span className="font-semibold text-emerald-600">{problemasResueltos} de {totalProblemas} resueltos</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${loading ? 0 : porcentajeResueltos}%` }}
          />
        </div>
      </div>

      {/* Desglose por estados estilo Munify */}
      <div className="border-t border-slate-100 pt-2.5 mb-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Distribución de estados</h4>
        <div className="space-y-1">
          {ESTADOS_REPORTE.map((est) => {
            const cant = porEstado[est.valor] || 0;
            return (
              <div key={est.valor} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: est.color }} />
                  <span className="text-slate-700">{est.etiqueta}</span>
                </div>
                <span className="font-semibold text-slate-800 tabular-nums">{cant}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top motivos */}
      {topCategorias.length > 0 && (
        <div className="border-t border-slate-100 pt-2.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Categorías con más reportes</h4>
          <div className="space-y-1">
            {topCategorias.map(([cat, cant]) => (
              <div key={cat} className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1 rounded">
                <span className="text-slate-700">{etiquetaCategoria(cat)}</span>
                <span className="font-bold text-slate-900">{cant}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
