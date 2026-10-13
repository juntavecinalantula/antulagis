import React from 'react';

interface PanelFiltrosProps {
  filtroEstado: string;
  setFiltroEstado: (val: string) => void;
  filtroCategoria: string;
  setFiltroCategoria: (val: string) => void;
}

export const PanelFiltros: React.FC<PanelFiltrosProps> = ({
  filtroEstado,
  setFiltroEstado,
  filtroCategoria,
  setFiltroCategoria,
}) => {
  return (
    <div className="p-4 bg-white shadow rounded mb-4">
      <h3 className="text-md font-bold mb-3">Filtros de Búsqueda</h3>
      
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="w-full p-2 border rounded text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="nuevo">Nuevo</option>
          <option value="en_proceso">En Proceso</option>
          <option value="resuelto">Resuelto</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="w-full p-2 border rounded text-sm"
        >
          <option value="">Todas las categorías</option>
          <option value="luminaria">Luminaria</option>
          <option value="bache">Bache / Calle</option>
          <option value="basura">Basura</option>
          <option value="otro">Otro</option>
        </select>
      </div>
    </div>
  );
};
