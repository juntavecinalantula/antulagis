import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import MapaBarrio from './components/MapaBarrio';
import Tablero from './components/vistas/Tablero';
import Reclamos from './components/vistas/Reclamos';
import Obras from './components/vistas/Obras';
import Catastro from './components/vistas/Catastro';
import AsistenteIA from './components/vistas/AsistenteIA';
import Sistema from './components/vistas/Sistema';
import { Menu, X } from 'lucide-react';

type ViewMode = 'tablero' | 'mapa' | 'reclamos' | 'obras' | 'catastro' | 'asistente' | 'configuracion';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('tablero');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // TODO: Obtener conteos reales de la API
  const reclamosCount = 4;
  const cuadrillasActivas = 2;

  const handleNavigate = (view: ViewMode) => {
    setCurrentView(view);
    setSidebarOpen(false); // Cerrar en móvil al navegar
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar para desktop */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          reclamosCount={reclamosCount}
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
              reclamosCount={reclamosCount}
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
            <span className="hidden sm:inline-block text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200">
              Barrio Mama Antula
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto relative">
          {currentView === 'tablero' && <Tablero onNavigate={handleNavigate} />}
          {currentView === 'mapa' && (
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
              }}
              base="osm"
              onEstado={() => {}}
            />
          )}
          {currentView === 'reclamos' && <Reclamos />}
          {currentView === 'obras' && <Obras />}
          {currentView === 'catastro' && <Catastro />}
          {currentView === 'asistente' && <AsistenteIA />}
          {currentView === 'configuracion' && <Sistema />}
        </div>
      </main>
    </div>
  );
}
