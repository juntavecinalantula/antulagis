import { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  MapPin,
  Clock,
  AlertCircle,
  Map as MapIcon,
} from 'lucide-react';
import { CATEGORIAS_PROBLEMA, ESTADOS_REPORTE, etiquetaCategoria, etiquetaEstado } from '../../lib/datos';
import { filtrarReportes, type Reporte } from '../../lib/reportes';

type Props = {
  problemas: Reporte[];
  loading?: boolean;
  /** Abre el visor con el formulario de reporte listo. */
  onNuevoReclamo?: () => void;
  onNavigate?: (view: 'mapa' | 'reclamos' | 'obras') => void;
};

export default function Reclamos({ problemas, loading, onNuevoReclamo, onNavigate }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');
  const [categoria, setCategoria] = useState('');

  const filtrados = useMemo(
    () => filtrarReportes(problemas, { busqueda, estado, categoria }),
    [problemas, busqueda, estado, categoria],
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-500">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[180px] sm:min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código, título, dirección..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full sm:w-auto bg-slate-100 border-transparent rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todos los estados</option>
            {ESTADOS_REPORTE.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.etiqueta}
              </option>
            ))}
          </select>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full sm:w-auto bg-slate-100 border-transparent rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS_PROBLEMA.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>
          {(busqueda || estado || categoria) && (
            <button
              type="button"
              onClick={() => {
                setBusqueda('');
                setEstado('');
                setCategoria('');
              }}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Limpiar filtros"
              title="Limpiar filtros"
            >
              <Filter className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('mapa')}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <MapIcon className="w-4 h-4" /> Ver en el mapa
            </button>
          )}
          <button
            onClick={onNuevoReclamo}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nuevo Reclamo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <p className="text-xs text-slate-500 mb-4">
          {loading
            ? 'Cargando reclamos…'
            : `${filtrados.length} de ${problemas.length} reclamos vecinales`}
        </p>

        {filtrados.length === 0 && !loading ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700">No hay reclamos para mostrar</p>
            <p className="text-sm text-slate-500 mt-1">
              {problemas.length === 0
                ? 'Todavía no se cargó ningún reclamo. Usá “Nuevo Reclamo” para reportar el primero.'
                : 'Probá con otro término de búsqueda o quitá los filtros.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtrados.map((reclamo) => {
              const estadoInfo = ESTADOS_REPORTE.find((e) => e.valor === reclamo.estado);
              return (
                <div key={reclamo.id} className="bg-white border border-slate-200 rounded-2xl p-3 hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">
                          {reclamo.codigo ?? `#${reclamo.id}`}
                        </span>
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: estadoInfo?.color }} />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                          {etiquetaEstado(reclamo.estado)}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {reclamo.titulo || 'Reporte sin título'}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{reclamo.descripcion}</p>
                    </div>
                    <button className="p-1 text-slate-400 hover:text-slate-600">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {reclamo.direccion && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="max-w-[140px] truncate">{reclamo.direccion}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(reclamo.created_at).toLocaleDateString('es-AR')}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                        {etiquetaCategoria(reclamo.categoria)}
                      </div>
                    </div>
                    {reclamo.prioridad === 'alta' || reclamo.prioridad === 'urgente' ? (
                      <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                        <AlertCircle className="w-3 h-3" /> Prioridad {reclamo.prioridad}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
