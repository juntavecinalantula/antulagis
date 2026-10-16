import React from 'react';
import { CATEGORIAS_PROBLEMA, ESTADOS_REPORTE } from '../../lib/datos';

interface PanelFiltrosProps {
  filtroEstado: string;
  setFiltroEstado: (val: string) => void;
  filtroCategoria: string;
  setFiltroCategoria: (val: string) => void;
}

// Filtros REALES: el estado y la categoría se aplican a las capas `problemas`
// y `propuestas` del mapa y al listado de seguimiento (patrón de
// pulsociudadano.app: "mapa público con filtros por categoría y estado").
export const PanelFiltros: React.FC<PanelFiltrosProps> = ({
  filtroEstado,
  setFiltroEstado,
  filtroCategoria,
  setFiltroCategoria,
}) => {
  const hayFiltros = filtroEstado !== '' || filtroCategoria !== '';
  return (
    <div className="p-4 bg-white shadow rounded mb-4">
      <h3 className="text-md font-bold mb-1">Filtros de búsqueda</h3>
      <p className="mb-3 text-xs text-slate-500">
        Afectan a los puntos de problemas y propuestas del mapa y al panel de seguimiento.
      </p>

      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="w-full p-2 border rounded text-sm"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_REPORTE.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="w-full p-2 border rounded text-sm"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS_PROBLEMA.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.etiqueta}
            </option>
          ))}
        </select>
      </div>

      {hayFiltros && (
        <button
          type="button"
          onClick={() => {
            setFiltroEstado('');
            setFiltroCategoria('');
          }}
          className="w-full rounded bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
};
