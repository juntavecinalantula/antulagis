import { ShieldCheck, Database } from 'lucide-react';

export default function Sistema() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-slate-900">Configuración del Sistema</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-slate-900 font-bold"><Database className="w-5 h-5 text-indigo-500" /> InsForge BaaS</div>
          <p className="text-sm text-slate-500">Versión 1.5.2 • Endpoint: ii8ya6m7.us-west.insforge.app</p>
          <button className="text-sm text-indigo-600 font-bold">Ver logs de auditoría</button>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-slate-900 font-bold"><ShieldCheck className="w-5 h-5 text-emerald-500" /> Permisos</div>
          <p className="text-sm text-slate-500">Rol actual: <span className="font-bold text-slate-900">Administrador Municipal</span></p>
          <button className="text-sm text-emerald-600 font-bold">Gestionar acceso colaboradores</button>
        </div>
      </div>
    </div>
  );
}
