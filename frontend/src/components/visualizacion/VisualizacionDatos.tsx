import React from 'react';

interface StatsProps {
  totalProblemas: number;
  totalPropuestas: number;
  problemasResueltos: number;
}

export const VisualizacionDatos: React.FC<StatsProps> = ({
  totalProblemas,
  totalPropuestas,
  problemasResueltos,
}) => {
  const porcentajeResueltos = totalProblemas > 0 ? Math.round((problemasResueltos / totalProblemas) * 100) : 0;

  return (
    <div className="p-4 bg-white shadow rounded mb-4">
      <h3 className="text-md font-bold mb-3">Resumen y Estadísticas</h3>
      
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-3 bg-blue-50 rounded">
          <div className="text-2xl font-bold text-blue-600">{totalProblemas}</div>
          <div className="text-xs text-gray-600">Problemas Reportados</div>
        </div>

        <div className="p-3 bg-green-50 rounded">
          <div className="text-2xl font-bold text-green-600">{totalPropuestas}</div>
          <div className="text-xs text-gray-600">Propuestas Vecinales</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Problemas Resueltos</span>
          <span>{porcentajeResueltos}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: `${porcentajeResueltos}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
