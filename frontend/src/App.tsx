import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import VisorMapa, { type PestanaVisor } from './components/VisorMapa';
import Tablero from './components/vistas/Tablero';
import Reclamos from './components/vistas/Reclamos';
import Obras from './components/vistas/Obras';
import Catastro from './components/vistas/Catastro';
import AsistenteIA from './components/vistas/AsistenteIA';
import Sistema from './components/vistas/Sistema';
import { Menu, X } from 'lucide-react';
import { useReportes } from './lib/reportes';

type ViewMode = 'tablero' | 'mapa' | 'reclamos' | 'obras' | 'catastro' | 'asistente' | 'configuracion';

const VISTAS: ViewMode[] = [
  'tablero',
  'mapa',
  'reclamos',
  'obras',
  'catastro',
  'asistente',
  'configuracion',
];

const PESTANAS_VISOR: PestanaVisor[] = ['capas', 'filtros', 'reportar', 'seguimiento'];

/**
 * La vista activa viaja en el hash (`#mapa`, `#reclamos`, `#mapa:reportar`) para
 * que cada sección sea enlazable y el botón "atrás" del navegador funcione.
 */
function leerHash(): { vista: ViewMode; pestana: PestanaVisor } {
  const bruto = window.location.hash.replace(/^#/, '');
  const [vista, pestana] = bruto.split(':');
  return {
    vista: VISTAS.includes(vista as ViewMode) ? (vista as ViewMode) : 'tablero',
    pestana: PESTANAS_VISOR.includes(pestana as PestanaVisor)
      ? (pestana as PestanaVisor)
      : 'capas',
  };
}

export default function App() {
  const inicial = leerHash();
  const [currentView, setCurrentView] = useState<ViewMode>(inicial.vista);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Pestaña del panel del visor (capas / filtros / reportar / seguimiento).
  const [pestanaVisor, setPestanaVisor] = useState<PestanaVisor>(inicial.pestana);
  // Cambia al enviar un reporte: recarga mapa, tablero y listados.
  const [refreshKey, setRefreshKey] = useState(0);

  // Mantiene el hash sincronizado con la vista activa.
  useEffect(() => {
    const hash =
      currentView === 'mapa' ? `mapa:${pestanaVisor}` : currentView;
    if (window.location.hash.replace(/^#/, '') !== hash) {
      window.location.hash = hash;
    }
  }, [currentView, pestanaVisor]);

  const { problemas, propuestas, resumen, loading, error } = useReportes(refreshKey);

  // Reportes vecinales que todavía no están resueltos (badge del menú).
  const reclamosActivos = problemas.filter((p) => p.estado !== 'resuelto' && p.estado !== 'archivado').length;
  // Reportes en ejecución (cuadrillas en calle).
  const cuadrillasActivas = problemas.filter((p) => p.estado === 'en_proceso').length;

  const handleNavigate = (view: ViewMode) => {
    setCurrentView(view);
    setSidebarOpen(false); // Cerrar en móvil al navegar
  };

  /** Abre el visor con el formulario de reporte listo para usar. */
  const nuevoReclamo = () => {
    setPestanaVisor('reportar');
    setCurrentView('mapa');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar para desktop */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          reclamosCount={reclamosActivos}
          cuadrillasActivas={cuadrillasActivas}
        />
      </div>

      {/* Sidebar móvil (drawer superpuesto) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-64 bg-slate-900 text-slate-300 shadow-2xl z-10 animate-in slide-in-from-left duration-300">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              currentView={currentView}
              onNavigate={handleNavigate}
              reclamosCount={reclamosActivos}
              cuadrillasActivas={cuadrillasActivas}
            />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar adaptada para móvil y desktop */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between flex-shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wide truncate">
              {currentView === 'tablero' && 'Tablero de Gestión'}
              {currentView === 'mapa' && 'Visor SIG Territorial'}
              {currentView === 'reclamos' && 'Bandeja de Reclamos Vecinales'}
              {currentView === 'obras' && 'Obras Públicas y Cuadrillas'}
              {currentView === 'catastro' && 'Catastro y Territorio'}
              {currentView === 'asistente' && 'Asistente IA Municipal'}
              {currentView === 'configuracion' && 'Configuración del Sistema'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
                Actualizando…
              </span>
            )}
            {error && (
              <span
                className="hidden sm:inline-block max-w-[280px] truncate text-xs bg-red-50 text-red-600 font-semibold px-3 py-1 rounded-full border border-red-200"
                title={error}
              >
                Sin conexión con la base
              </span>
            )}
            <span className="hidden sm:inline-block text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200">
              Barrio Mama Antula
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto relative">
          {currentView === 'tablero' && (
            <Tablero
              onNavigate={handleNavigate}
              resumen={resumen}
              problemas={problemas}
              propuestas={propuestas}
              loading={loading}
            />
          )}
          {currentView === 'mapa' && (
            <div className="absolute inset-0">
              <VisorMapa
                refreshKey={refreshKey}
                pestana={pestanaVisor}
                onPestana={setPestanaVisor}
                onReporteCreado={() => setRefreshKey((k) => k + 1)}
              />
            </div>
          )}
          {currentView === 'reclamos' && (
            <Reclamos
              problemas={problemas}
              loading={loading}
              onNuevoReclamo={nuevoReclamo}
              onNavigate={handleNavigate}
            />
          )}
          {currentView === 'obras' && <Obras problemas={problemas} />}
          {currentView === 'catastro' && <Catastro />}
          {currentView === 'asistente' && <AsistenteIA />}
          {currentView === 'configuracion' && <Sistema />}
        </div>
      </main>
    </div>
  );
}
