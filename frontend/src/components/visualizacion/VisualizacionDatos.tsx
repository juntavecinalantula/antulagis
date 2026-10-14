import React, { useEffect, useState } from 'react';
import { insforge } from '../../lib/insforgeClient';

interface Stats {
  totalProblemas: number;
  totalPropuestas: number;
  problemasResueltos: number;
}

const INITIAL: Stats = { totalProblemas: 0, totalPropuestas: 0, problemasResueltos: 0 };

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
        const [rProb, rProp, rResu] = await Promise.all([
          insforge.database.from('problemas').select('*', { count: 'exact', head: true }),
          insforge.database.from('propuestas').select('*', { count: 'exact', head: true }),
          insforge.database.from('problemas').select('*', { count: 'exact', head: true }).eq('estado', 'resuelto'),
        ]);
        if (!vivo) return;
        if (rProb.error) throw rProb.error;
        if (rProp.error) throw rProp.error;
        if (rResu.error) throw rResu.error;
        setStats({
          totalProblemas: rProb.count ?? 0,
          totalPropuestas: rProp.count ?? 0,
          problemasResueltos: rResu.count ?? 0,
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

  const { totalProblemas, totalPropuestas, problemasResueltos } = stats;
  const porcentajeResueltos =
    totalProblemas > 0 ? Math.round((problemasResueltos / totalProblemas) * 100) : 0;

  return (
    <div className="p-4 bg-white shadow rounded mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-bold">Resumen y Estadísticas</h3>
        {loading && <span className="text-xs text-gray-400">Actualizando…</span>}
      </div>

      {error && <p className="mb-3 text-sm text-red-600 break-words">{error}</p>}

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-3 bg-blue-50 rounded">
          <div className="text-2xl font-bold text-blue-600">
            {loading ? '—' : totalProblemas}
          </div>
          <div className="text-xs text-gray-600">Problemas Reportados</div>
        </div>

        <div className="p-3 bg-green-50 rounded">
          <div className="text-2xl font-bold text-green-600">
            {loading ? '—' : totalPropuestas}
          </div>
          <div className="text-xs text-gray-600">Propuestas Vecinales</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Problemas Resueltos</span>
          <span>{loading ? '—' : `${problemasResueltos} (${porcentajeResueltos}%)`}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${loading ? 0 : porcentajeResueltos}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
