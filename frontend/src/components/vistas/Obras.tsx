import { useMemo } from 'react';
import {
  HardHat,
  Lightbulb,
  Users,
  MapPin,
  Truck,
  CheckCircle2,
  Timer,
  ThumbsUp,
  Layers,
} from 'lucide-react';
import { ESTADOS_REPORTE, etiquetaCategoria, etiquetaEstado } from '../../lib/datos';
import type { Reporte } from '../../lib/reportes';

type Props = {
  problemas: Reporte[];
  propuestas: Reporte[];
};

/**
 * "Obras y propuestas": la base no tiene todavía una tabla de cuadrillas
 * (queda pendiente modelarla), así que la vista reúne las dos fuentes reales
 * de trabajo: las propuestas vecinales cargadas por los vecinos y los frentes
 * de obra abiertos (reclamos en revisión o en proceso, agrupados por rubro).
 */
export default function Obras({ problemas, propuestas }: Props) {
  const activos = useMemo(
    () => problemas.filter((p) => p.estado === 'en_proceso' || p.estado === 'en_revision'),
    [problemas],
  );

  const porRubro = useMemo(() => {
    const mapa = new Map<string, Reporte[]>();
    for (const p of activos) {
      const lista = mapa.get(p.categoria) ?? [];
      lista.push(p);
      mapa.set(p.categoria, lista);
    }
    return [...mapa.entries()]
      .map(([categoria, lista]) => ({
        categoria,
        etiqueta: etiquetaCategoria(categoria),
        cantidad: lista.length,
        urgente: lista.some((p) => p.prioridad === 'urgente' || p.prioridad === 'alta'),
        ultima: lista
          .map((p) => Date.parse(p.created_at))
          .reduce((max, t) => (t > max ? t : max), 0),
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [activos]);

  const resueltos = problemas.filter((p) => p.estado === 'resuelto').length;
  const urgentes = activos.filter((p) => p.prioridad === 'urgente' || p.prioridad === 'alta').length;
  const conApoyo = propuestas.filter((p) => (p.apoyos ?? 0) > 0).length;
  const totalApoyos = propuestas.reduce((acc, p) => acc + (p.apoyos ?? 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Obras y Propuestas</h2>
          <p className="text-slate-500">
            Propuestas vecinales cargadas por los vecinos y frentes de obra abiertos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-full border border-emerald-200">
            <Lightbulb className="w-3.5 h-3.5" /> {propuestas.length} propuestas
          </span>
          <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-full border border-blue-200">
            <Truck className="w-3.5 h-3.5" /> {activos.length} obras en curso
          </span>
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> {resueltos} resueltos
          </span>
          {urgentes > 0 && (
            <span className="flex items-center gap-1.5 bg-red-50 text-red-700 font-bold px-3 py-1.5 rounded-full border border-red-200">
              <Timer className="w-3.5 h-3.5" /> {urgentes} prioritarios
            </span>
          )}
        </div>
      </div>

      {/* Propuestas vecinales */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-emerald-500" />
            Propuestas vecinales
          </h3>
          <span className="text-xs text-slate-500">
            {conApoyo > 0 ? `${conApoyo} con apoyo · ${totalApoyos} apoyos en total` : 'sin apoyos aún'}
          </span>
        </div>

        {propuestas.length === 0 ? (
          <p className="text-sm text-slate-400">
            Todavía no hay propuestas cargadas. Se pueden crear desde el visor SIG, en la
            pestaña «Reportar → Proponer solución».
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {propuestas.map((propuesta) => {
              const estadoInfo = ESTADOS_REPORTE.find((e) => e.valor === propuesta.estado);
              return (
                <div
                  key={propuesta.id}
                  className="border border-slate-200 rounded-2xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">
                          {propuesta.codigo ?? `#${propuesta.id}`}
                        </span>
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: estadoInfo?.color }}
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {etiquetaEstado(propuesta.estado)}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900">
                        {propuesta.titulo || 'Propuesta sin título'}
                      </h4>
                      <p className="text-sm text-slate-500 line-clamp-2">{propuesta.descripcion}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                      {etiquetaCategoria(propuesta.categoria)}
                    </span>
                    {propuesta.direccion && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="max-w-[140px] truncate">{propuesta.direccion}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {propuesta.apoyos ?? 0}
                    </span>
                    <span>{new Date(propuesta.created_at).toLocaleDateString('es-AR')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Frentes de obra en curso */}
      <div>
        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-blue-500" />
          Frentes de obra en curso
        </h3>
        {porRubro.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 sm:p-10 text-center">
            <HardHat className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700">No hay obras abiertas</p>
            <p className="text-sm text-slate-500 mt-1">
              No hay reclamos en revisión ni en proceso. Cuando se reporten, aparecen acá
              agrupados por rubro.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {porRubro.map((frente) => (
              <div key={frente.categoria} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Truck className="w-6 h-6" />
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                      frente.urgente ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {frente.urgente ? 'prioritario' : 'en curso'}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900">Cuadrilla {frente.etiqueta}</h4>
                <div className="mt-3 space-y-2 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {frente.cantidad} reclamo
                    {frente.cantidad === 1 ? '' : 's'} en este rubro
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {frente.cantidad} intervencion{frente.cantidad === 1 ? '' : 'es'} pendiente
                    {frente.cantidad === 1 ? '' : 's'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    Última apertura {new Date(frente.ultima).toLocaleDateString('es-AR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
