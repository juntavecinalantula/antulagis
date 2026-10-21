import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import MapaBarrio from './components/MapaBarrio';
import type { CapasVisibles } from './lib/datos';
import type { BaseId } from './lib/baseMap';

// Placeholder de vistas futuras
const Vistas: Record<string, JSX.Element> = {
  tablero: <div className="p-6">Tablero de Gestión (Pendiente)</div>,
  mapa: <div className="h-full w-full">Mapa</div>,
  reclamos: <div className="p-6">Reclamos Vecinales (Pendiente)</div>,
  configuracion: <div className="p-6">Configuración (Pendiente)</div>,
};

type ViewMode = 'tablero' | 'mapa' | 'reclamos' | 'obras' | 'catastro' | 'asistente' | 'configuracion';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('tablero');
  const [visibles, setVisibles] = useState<CapasVisibles>({
    manzanas: true,
    callesAsfalto: true,
    callesRipio: true,
    cauces: true,
    informacion: true,
    luminaria: true,
    entradas: true,
    problemas: true,
    propuestas: true,
  });
  const [base, setBase] = useState<BaseId>('osm');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        reclamosCount={0}
        cuadrillasActivas={0}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar simplificada */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            {currentView}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto">
          {currentView === 'mapa' ? (
            <MapaBarrio
              visibles={visibles}
              base={base}
              onEstado={() => {}}
            />
          ) : (
            Vistas[currentView] || <div className="p-6">Vista no implementada</div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
