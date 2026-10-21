import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  MessageSquare, 
  Paperclip, 
  MapPin,
  Clock,
  AlertCircle
} from 'lucide-react';
import { ESTADOS_REPORTE, CATEGORIAS_PROBLEMA } from '../../lib/datos';

const RECLAMOS_MOCK = [
  { id: 1, codigo: 'REC-001', titulo: 'Luminaria apagada en Calle 4', categoria: 'alumbrado', estado: 'nuevo', prioridad: 'alta', fecha: '2024-03-20T10:00:00Z', descripcion: 'Frente a la manzana 39, el poste no enciende hace 3 días.', direccion: 'Calle 4 y Av. Principal' },
  { id: 2, codigo: 'REC-002', titulo: 'Bache profundo', categoria: 'calle', estado: 'en_proceso', prioridad: 'media', fecha: '2024-03-19T14:30:00Z', descripcion: 'Peligro para motos, cerca de la entrada.', direccion: 'Calle de ripio, Mza 10' },
  { id: 3, codigo: 'REC-003', titulo: 'Poda correctiva urgente', categoria: 'arbolado', estado: 'resuelto', prioridad: 'baja', fecha: '2024-03-18T09:15:00Z', descripcion: 'Ramas tocando cables de baja tensión.', direccion: 'Calle 2 entre 5 y 7' },
  { id: 4, codigo: 'REC-004', titulo: 'Pérdida de agua en vereda', categoria: 'agua', estado: 'en_revision', prioridad: 'alta', fecha: '2024-03-20T11:45:00Z', descripcion: 'Sale mucha agua limpia del medidor.', direccion: 'M-132, Lote 5' },
];

export default function Reclamos() {
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-500">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar por código, título o vecino..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"><Filter className="w-5 h-5" /></button>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Nuevo Reclamo
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-4">
          {RECLAMOS_MOCK.map((reclamo) => {
            const estadoInfo = ESTADOS_REPORTE.find(e => e.valor === reclamo.estado);
            const catInfo = CATEGORIAS_PROBLEMA.find(c => c.valor === reclamo.categoria);
            return (
              <div key={reclamo.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">{reclamo.codigo}</span>
                      <div className={`h-1.5 w-1.5 rounded-full`} style={{ backgroundColor: estadoInfo?.color }} />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{estadoInfo?.etiqueta}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{reclamo.titulo}</h3>
                    <p className="text-sm text-slate-500 line-clamp-1">{reclamo.descripcion}</p>
                  </div>
                  <button className="p-1 text-slate-400 hover:text-slate-600"><MoreVertical className="w-5 h-5" /></button>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="w-3.5 h-3.5" />{reclamo.direccion}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3.5 h-3.5" />{new Date(reclamo.fecha).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg capitalize">{catInfo?.etiqueta || reclamo.categoria}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 text-slate-400">
                      <div className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /><span className="text-xs">3</span></div>
                      <div className="flex items-center gap-1"><Paperclip className="w-4 h-4" /><span className="text-xs">1</span></div>
                    </div>
                    {reclamo.prioridad === 'alta' && (
                      <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                        <AlertCircle className="w-3 h-3" /> Prioridad Alta
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
