import { Search } from 'lucide-react';

export default function Catastro() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Catastro y Calles</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar parcela o calle..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Nombre / Nomenclatura</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[1, 2, 3, 4].map(i => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono font-bold text-slate-700">M-{100+i}</td>
                <td className="px-6 py-4 text-slate-900">Calle Tramo #{10+i}</td>
                <td className="px-6 py-4 text-slate-500">Ripio</td>
                <td className="px-6 py-4"><button className="text-blue-600 font-bold">Ver Ficha</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
