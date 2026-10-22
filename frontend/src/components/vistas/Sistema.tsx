import { useState } from 'react';
import { ShieldCheck, Database, RefreshCw, KeyRound, Users } from 'lucide-react';
import { insforge, faltaConfig } from '../../lib/insforgeClient';

type Verificacion =
  | { fase: 'inicial' }
  | { fase: 'comprobando' }
  | { fase: 'ok'; detalle: string }
  | { fase: 'error'; detalle: string };

export default function Sistema() {
  const [verificacion, setVerificacion] = useState<Verificacion>({ fase: 'inicial' });

  const comprobar = async () => {
    setVerificacion({ fase: 'comprobando' });
    try {
      const r = await insforge.database.from('problemas').select('id', { count: 'exact', head: true });
      if (r.error) throw r.error;
      setVerificacion({
        fase: 'ok',
        detalle: `Backend responde correctamente · ${r.count ?? 0} reclamos en la tabla "problemas".`,
      });
    } catch (e) {
      setVerificacion({
        fase: 'error',
        detalle: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const endpoint = import.meta.env.VITE_INSFORGE_URL as string | undefined;

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Configuración del Sistema</h2>
        <p className="text-slate-500">Estado del backend y de los permisos de la aplicación.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-slate-900 font-bold">
            <Database className="w-5 h-5 text-indigo-500" /> InsForge BaaS
          </div>
          <p className="text-sm text-slate-500">
            Endpoint: <span className="font-mono text-slate-700">{endpoint ?? 'sin configurar'}</span>
          </p>
          <p className="text-sm text-slate-500">
            SDK <span className="font-mono text-slate-700">@insforge/sdk 1.5.2</span> · base de datos
            Postgres con PostGIS
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={comprobar}
              disabled={verificacion.fase === 'comprobando'}
              className="text-sm bg-indigo-50 text-indigo-700 font-bold px-4 py-2 rounded-xl hover:bg-indigo-100 disabled:opacity-60 inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${verificacion.fase === 'comprobando' ? 'animate-spin' : ''}`} />
              {verificacion.fase === 'comprobando' ? 'Comprobando…' : 'Verificar conexión'}
            </button>
            {verificacion.fase === 'ok' && (
              <span className="text-xs text-emerald-700 font-semibold">{verificacion.detalle}</span>
            )}
            {verificacion.fase === 'error' && (
              <span className="text-xs text-red-600 font-semibold break-words">{verificacion.detalle}</span>
            )}
          </div>
          {faltaConfig && (
            <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2">
              Faltan VITE_INSFORGE_URL / VITE_INSFORGE_ANON_KEY en frontend/.env.local
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-slate-900 font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-500" /> Permisos
          </div>
          <p className="text-sm text-slate-500">
            La app usa la <span className="font-bold text-slate-700">anon key</span>: lectura pública de
            capas y reportes (políticas RLS <span className="font-mono">public_read</span>).
          </p>
          <p className="text-sm text-slate-500">
            <Users className="w-4 h-4 inline mr-1" />
            El login de vecinos todavía no está conectado: los apoyos y la autoría de los reportes
            quedan pendientes de autenticación.
          </p>
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            La API key de administración nunca se expone al navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
