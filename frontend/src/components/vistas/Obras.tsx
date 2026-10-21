import { HardHat, Users, MapPin, Truck } from 'lucide-react';

export default function Obras() {
  const cuadrillas = [
    { id: 1, nombre: 'Cuadrilla Vial', estado: 'activa', tareas: 'Pavimentación Calle 4', personal: 5 },
    { id: 2, nombre: 'Cuadrilla Alumbrado', estado: 'activa', tareas: 'Reparación luminaria M-39', personal: 3 },
    { id: 3, nombre: 'Cuadrilla Desagües', estado: 'pausa', tareas: 'Limpieza canal principal', personal: 4 },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Obras y Cuadrillas</h2>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
          <HardHat className="w-4 h-4" /> Nueva Cuadrilla
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cuadrillas.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Truck className="w-6 h-6" />
              </div>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${c.estado === 'activa' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {c.estado}
              </span>
            </div>
            <h3 className="font-bold text-slate-900">{c.nombre}</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {c.tareas}</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /> {c.personal} operarios</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
