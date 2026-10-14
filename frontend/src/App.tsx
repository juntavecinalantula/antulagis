import { useState } from 'react';
import MapaBarrio, { type EstadoMapa } from './components/MapaBarrio';
import PanelCapas from './components/PanelCapas';
import { FormularioProblema } from './components/formularios/FormularioProblema';
import { FormularioPropuesta } from './components/formularios/FormularioPropuesta';
import { PanelFiltros } from './components/filtros/PanelFiltros';
import { VisualizacionDatos } from './components/visualizacion/VisualizacionDatos';
import type { CapasVisibles } from './lib/datos';
import type { BaseId } from './lib/baseMap';

function App() {
  const [visibles, setVisibles] = useState<CapasVisibles>({
    manzanas: true,
    callesAsfalto: true,
    callesRipio: true,
    cauces: true,
    informacion: true,
    luminaria: true,
    entradas: true,
  });
  const [base, setBase] = useState<BaseId>('osm');
  const [estado, setEstado] = useState<EstadoMapa>({ fase: 'cargando' });
  const [intento] = useState(0);
  const [panelActivo, setPanelActivo] = useState<'capas' | 'filtros' | 'reportar' | 'dashboard'>('capas');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  return (
    <div className="fixed inset-0 font-sans text-slate-900 bg-slate-50">
      <MapaBarrio key={intento} visibles={visibles} base={base} onEstado={setEstado} />

      <header className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur">
        <div>
          <h1 className="text-sm font-bold leading-tight sm:text-base">MAMA ANTULA</h1>
          <p className="text-xs text-slate-500">Gestión Vecinal</p>
        </div>
      </header>

      {/* Menú de Navegación Principal */}
      <nav className="absolute right-3 top-3 z-20 flex flex-col gap-2">
        <button onClick={() => setPanelActivo('capas')} className="p-2 bg-white rounded-lg shadow hover:bg-slate-100">Capas</button>
        <button onClick={() => setPanelActivo('filtros')} className="p-2 bg-white rounded-lg shadow hover:bg-slate-100">Filtros</button>
        <button onClick={() => setPanelActivo('reportar')} className="p-2 bg-white rounded-lg shadow hover:bg-slate-100">Reportar</button>
        <button onClick={() => setPanelActivo('dashboard')} className="p-2 bg-white rounded-lg shadow hover:bg-slate-100">Datos</button>
      </nav>

      {/* Panel de Contenido Dinámico */}
      <aside className="absolute left-3 top-20 z-10 w-80 max-h-[80vh] overflow-y-auto">
        {panelActivo === 'capas' && (
          <PanelCapas
            visibles={visibles}
            onVisibles={setVisibles}
            base={base}
            onBase={setBase}
            conteos={estado.fase === 'listo' ? estado.conteos : null}
          />
        )}
        {panelActivo === 'filtros' && (
          <PanelFiltros
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
            filtroCategoria={filtroCategoria}
            setFiltroCategoria={setFiltroCategoria}
          />
        )}
        {panelActivo === 'reportar' && (
          <div className="flex flex-col gap-4">
            <FormularioProblema />
            <FormularioPropuesta />
          </div>
        )}
        {panelActivo === 'dashboard' && (
          <VisualizacionDatos
            totalProblemas={0}
            totalPropuestas={0}
            problemasResueltos={0}
          />
        )}
      </aside>

      {estado.fase === 'cargando' && (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white px-4 py-2 text-sm shadow-lg">
          Cargando datos…
        </div>
      )}
    </div>
  );
}

export default App;
