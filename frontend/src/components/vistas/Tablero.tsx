import { 
  BarChart3, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Map as MapIcon
} from 'lucide-react';
import MapaBarrio from '../MapaBarrio';

interface TableroProps {
  onNavigate?: (view: 'tablero' | 'mapa' | 'reclamos' | 'obras' | 'catastro' | 'asistente' | 'configuracion') => void;
}

export default function Tablero({ onNavigate }: TableroProps) {
  const stats = [
    { label: 'Reclamos Activos', value: '24', change: '+12%', trend: 'up', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Obras en Curso', value: '8', change: '+2', trend: 'up', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Resueltos (Mes)', value: '142', change: '+18%', trend: 'up', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Tiempo Promedio', value: '4.2d', change: '-8%', trend: 'down', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ];

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Tablero Ejecutivo</h2>
        <p className="text-slate-500">Indicadores clave de gestión territorial y servicios ciudadanos.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-slate-500">{stat.label}</h3>
              <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview de Mapa GIS */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-blue-500" />
              Visor SIG Territorial (Preview)
            </h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('mapa')}
                className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
              >
                Abrir Mapa Completo →
              </button>
            )}
          </div>
          <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-200">
            <MapaBarrio
              visibles={{
                manzanas: true,
                callesAsfalto: true,
                callesRipio: true,
                cauces: true,
                informacion: true,
                luminaria: true,
                entradas: true,
                problemas: true,
                propuestas: true,
              }}
              base="osm"
              onEstado={() => {}}
            />
          </div>
        </div>

        {/* Categories / Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            Distribución por Tipo
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Alumbrado', value: 35, color: 'bg-amber-400' },
              { label: 'Mantenimiento Vial', value: 25, color: 'bg-blue-400' },
              { label: 'Residuos', value: 20, color: 'bg-emerald-400' },
              { label: 'Arbolado', value: 15, color: 'bg-indigo-400' },
              { label: 'Otros', value: 5, color: 'bg-slate-400' },
            ].map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600">{cat.label}</span>
                  <span className="text-slate-900">{cat.value}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${cat.color}`} style={{ width: `${cat.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
