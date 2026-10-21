import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import MapaBarrio from './components/MapaBarrio';
import Tablero from './components/vistas/Tablero';
import Reclamos from './components/vistas/Reclamos';
import Obras from './components/vistas/Obras';
import Catastro from './components/vistas/Catastro';
import AsistenteIA from './components/vistas/AsistenteIA';
import Sistema from './components/vistas/Sistema';

type ViewMode = 'tablero' | 'mapa' | 'reclamos' | 'obras' | 'catastro' | 'asistente' | 'configuracion';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('tablero');

  // TODO: Obtener conteos reales de la API
  const reclamosCount = 4;
  const cuadrillasActivas = 2;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        reclamosCount={reclamosCount}
        cuadrillasActivas={cuadrillasActivas}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar simplificada */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            {currentView === 'tablero' && 'Tablero de Gestión'}
            {currentView === 'mapa' && 'Visor SIG Territorial'}
            {currentView === 'reclamos' && 'Bandeja de Reclamos Vecinales'}
            {currentView === 'obras' && 'Obras Públicas y Cuadrillas Operativas'}
            {currentView === 'catastro' && 'Catastro y Territorio Municipal'}
            {currentView === 'asistente' && 'Asistente IA Municipal'}
            {currentView === 'configuracion' && 'Configuración del Sistema'}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto relative">
          {currentView === 'tablero' && <Tablero />}
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
