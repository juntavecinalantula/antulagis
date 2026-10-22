import { useMemo } from 'react';
import { HardHat, Users, MapPin, Truck, CheckCircle2, Timer } from 'lucide-react';
import { etiquetaCategoria } from '../../lib/datos';
import type { Reporte } from '../../lib/reportes';

type Props = {
  problemas: Reporte[];
};

/**
 * "Obras y cuadrillas": no hay una tabla de cuadrillas en la base (queda
 * pendiente modelarla), así que la vista se arma sobre los reclamos reales
 * que están en ejecución, agrupados por rubro. Es el circuito de trabajo
 * que la junta ya maneja: cada reclamo con estado "en proceso" es una obra
 * abierta.
 */
export default function Obras({ problemas }: Props) {
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

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Obras y Cuadrillas</h2>
          <p className="text-slate-500">Frentes de trabajo abiertos a partir de los reclamos vecinales.</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
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

      {porRubro.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <HardHat className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700">No hay obras abiertas</p>
          <p className="text-sm text-slate-500 mt-1">
            No hay reclamos en revisión ni en proceso. Cuando se reporten, aparecen acá
            agrupados por rubro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {porRubro.map((frente) => (
            <div key={frente.categoria} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
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
              <h3 className="font-bold text-slate-900">Cuadrilla {frente.etiqueta}</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
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
  );
}
