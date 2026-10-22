import {
  BarChart3,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Map as MapIcon,
  Lightbulb,
} from 'lucide-react';
import MapaBarrio from '../MapaBarrio';
import { etiquetaCategoria, etiquetaEstado, ESTADOS_REPORTE } from '../../lib/datos';
import { masRecientes, topCategorias, type Reporte, type Resumen } from '../../lib/reportes';

interface TableroProps {
  onNavigate?: (view: 'tablero' | 'mapa' | 'reclamos' | 'obras' | 'catastro' | 'asistente' | 'configuracion') => void;
  resumen: Resumen;
  problemas: Reporte[];
  propuestas: Reporte[];
  loading?: boolean;
}

export default function Tablero({ onNavigate, resumen, problemas, propuestas, loading }: TableroProps) {
  const archivados = resumen.porEstado.archivado ?? 0;
  const activos = Math.max(0, resumen.totalProblemas - resumen.resueltos - archivados);
  const dias = resumen.tiempoMedioResolucionDias;

  const stats = [
    {
      label: 'Reclamos Activos',
      value: loading ? '—' : String(activos),
      detalle: `${resumen.nuevos} nuevos · ${resumen.enGestion} en gestión`,
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      label: 'Obras en Curso',
      value: loading ? '—' : String(resumen.enGestion),
      detalle: 'reclamos en revisión o en proceso',
      icon: MapPin,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: '% Resueltos',
      value: loading ? '—' : `${resumen.pctResueltos}%`,
      detalle: `${resumen.resueltos} de ${resumen.totalProblemas} reclamos`,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      label: 'Tiempo Promedio',
      value: loading ? '—' : dias !== null ? `${dias}d` : '—',
      detalle: dias !== null ? 'desde el reporte hasta la resolución' : 'sin resoluciones registradas',
      icon: Clock,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
  ];

  const categorias = topCategorias(resumen, 6);
  const maxCategoria = categorias[0]?.cantidad ?? 1;

  const recientes = masRecientes(
    [...problemas.map((p) => ({ ...p, tipo: 'problema' as const })),
     ...propuestas.map((p) => ({ ...p, tipo: 'propuesta' as const }))],
    6,
  );

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tablero Ejecutivo</h2>
          <p className="text-slate-500">Indicadores clave de gestión territorial y servicios ciudadanos.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>
            {resumen.totalProblemas} reclamos · {resumen.totalPropuestas} propuestas cargados
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.label === 'Reclamos Activos' && (
                <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                  <ArrowUpRight className="w-3 h-3" />
                  {resumen.nuevos} nuevos
                </div>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-slate-500">{stat.label}</h3>
              <p className="text-3xl font-black text-slate-900">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-400">{stat.detalle}</p>
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
                nombresCalles: true,
              }}
              base="osm"
              onEstado={() => {}}
            />
          </div>
        </div>

        {/* Distribución por categoría */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80 overflow-y-auto">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            Distribución por Tipo
          </h3>
          {categorias.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no hay reportes cargados.</p>
          ) : (
            <div className="space-y-4">
              {categorias.map((cat) => (
                <div key={cat.categoria} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">{etiquetaCategoria(cat.categoria)}</span>
                    <span className="text-slate-900">{cat.cantidad}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${Math.round((cat.cantidad / maxCategoria) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="font-bold text-slate-900 mt-6 mb-3 text-sm">
            Estado de los reportes (problemas + propuestas)
          </h3>
          <div className="space-y-1.5">
            {ESTADOS_REPORTE.filter((e) => (resumen.porEstado[e.valor] ?? 0) > 0).map((e) => (
              <div key={e.valor} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                  {e.etiqueta}
                </span>
                <span className="font-bold text-slate-900 tabular-nums">{resumen.porEstado[e.valor]}</span>
              </div>
            ))}
            {resumen.totalProblemas === 0 && (
              <p className="text-xs text-slate-400">Sin reclamos cargados.</p>
            )}
          </div>
        </div>
      </div>

      {/* Últimos reportes */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Últimos reportes vecinales</h3>
          {onNavigate && (
            <button
              onClick={() => onNavigate('reclamos')}
              className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Ver todos →
            </button>
          )}
        </div>
        {recientes.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no hay reportes cargados.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recientes.map((r) => (
              <div key={`${r.tipo}-${r.id}`} className="flex flex-wrap items-center gap-3 py-3">
                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">
                  {r.codigo ?? `#${r.id}`}
                </span>
                <span className="font-semibold text-slate-800 text-sm flex-1 min-w-[160px] truncate">
                  {r.titulo || r.descripcion || 'Reporte sin título'}
                </span>
                <span className="text-xs text-slate-500">{etiquetaCategoria(r.categoria)}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                  {etiquetaEstado(r.estado)}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleDateString('es-AR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
