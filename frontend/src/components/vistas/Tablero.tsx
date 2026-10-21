import { 
  BarChart3, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp
} from 'lucide-react';

export default function Tablero() {
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
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Evolución de Reclamos
            </h3>
            <select className="text-xs bg-slate-50 border-slate-200 rounded-lg px-2 py-1 outline-none">
              <option>Últimos 30 días</option>
              <option>Últimos 6 meses</option>
            </select>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 px-2">
            {[40, 65, 45, 90, 55, 70, 85, 40, 75, 50, 60, 45].map((h, i) => (
              <div key={i} className="w-full bg-slate-100 rounded-t-lg relative group transition-all hover:bg-blue-100">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg transition-all group-hover:bg-blue-600" 
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
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
