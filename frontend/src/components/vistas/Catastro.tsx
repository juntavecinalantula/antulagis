import { useState } from 'react';
import { Search, Compass, Ruler } from 'lucide-react';
import {
  filtrarCalles,
  filtrarManzanas,
  metrosPorPavimento,
  superficieTotal,
  useTerritorio,
} from '../../lib/territorio';

export default function Catastro() {
  const { calles, manzanas, loading, error } = useTerritorio();
  const [busqueda, setBusqueda] = useState('');
  const [pestana, setPestana] = useState<'calles' | 'manzanas'>('calles');

  const callesFiltradas = filtrarCalles(calles, busqueda);
  const manzanasFiltradas = filtrarManzanas(manzanas, busqueda);
  const metros = metrosPorPavimento(calles);
  const superficie = superficieTotal(manzanas);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Catastro y Calles</h2>
          <p className="text-slate-500">
            {loading
              ? 'Cargando catastro…'
              : `${calles.length} calles · ${manzanas.length} manzanas · ${Math.round(
                  superficie,
                ).toLocaleString('es-AR')} m² de superficie`}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar calle o manzana..."
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          No se pudo leer el catastro: {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPestana('calles')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            pestana === 'calles' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Calles ({callesFiltradas.length})
        </button>
        <button
          type="button"
          onClick={() => setPestana('manzanas')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            pestana === 'manzanas' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Manzanas ({manzanasFiltradas.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {pestana === 'calles' ? (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Pavimento</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Longitud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {callesFiltradas.slice(0, 200).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-800">{c.nombre || 'Calle sin nombre'}</td>
                  <td className="px-6 py-4 text-slate-500 capitalize">{c.material || 'sin clasificar'}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {c.tipo === 1 ? 'Asfalto' : c.tipo === 2 ? 'Ripio' : '—'}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-slate-600">
                    {c.longitud_m ? `${Math.round(c.longitud_m)} m` : '—'}
                  </td>
                </tr>
              ))}
              {callesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                    Sin calles para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Manzana</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Superficie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {manzanasFiltradas.slice(0, 200).map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-bold text-slate-700">
                    {m.codigo || m.mza || `#${m.id}`}
                  </td>
                  <td className="px-6 py-4 text-slate-900">{m.nombre || m.mza || '—'}</td>
                  <td className="px-6 py-4 text-slate-500">{m.tipo || '—'}</td>
                  <td className="px-6 py-4 text-right tabular-nums text-slate-600">
                    {m.superficie_m2 ? `${Math.round(m.superficie_m2)} m²` : '—'}
                  </td>
                </tr>
              ))}
              {manzanasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                    Sin manzanas para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Resumen de pavimento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-blue-500" />
            Red vial por pavimento
          </h3>
          {metros.size === 0 ? (
            <p className="text-sm text-slate-400">Sin datos de pavimento.</p>
          ) : (
            <div className="space-y-3">
              {[...metros.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([material, mlineales]) => (
                  <div key={material} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 capitalize">{material}</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {Math.round(mlineales).toLocaleString('es-AR')} m
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-500" />
            Superficie del barrio
          </h3>
          <p className="text-3xl font-black text-slate-900">
            {Math.round(superficie / 10000).toLocaleString('es-AR')} ha
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {Math.round(superficie).toLocaleString('es-AR')} m² en {manzanas.length} manzanas
          </p>
        </div>
      </div>
    </div>
  );
}
