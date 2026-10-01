import { useState } from 'react';
import MapaBarrio, { type EstadoMapa } from './components/MapaBarrio';
import PanelCapas from './components/PanelCapas';
import type { CapasVisibles } from './lib/datos';
import type { BaseId } from './lib/baseMap';

function App() {
  const [visibles, setVisibles] = useState<CapasVisibles>({
    manzanas: true,
    callesAsfalto: true,
    callesRipio: true,
    cauces: true,
    entradasActual: true,
    entradasProyecto: true,
    luminarias: true,
    informacion: true,
  });
  const [base, setBase] = useState<BaseId>('osm');
  const [estado, setEstado] = useState<EstadoMapa>({ fase: 'cargando' });
  // Cambiar la clave desmonta y remonta el mapa (reintento ante errores de red)
  const [intento, setIntento] = useState(0);

  return (
    <div className="fixed inset-0 font-sans text-slate-900">
      <MapaBarrio key={intento} visibles={visibles} base={base} onEstado={setEstado} />

      <header className="absolute left-3 top-3 z-10 max-w-[calc(100vw-5.5rem)] rounded-xl border border-slate-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur">
        <h1 className="text-sm font-bold leading-tight sm:text-base">JUNTA VECINAL MAMA ANTULA</h1>
        <p className="hidden text-xs text-slate-500 sm:block">MAPA DEL BARRIO</p>
      </header>

      <PanelCapas
        visibles={visibles}
        onVisibles={setVisibles}
        base={base}
        onBase={setBase}
        conteos={estado.fase === 'listo' ? estado.conteos : null}
      />

      {estado.fase === 'cargando' && (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white px-4 py-2 text-sm shadow-lg">
          Cargando datos del barrio…
        </div>
      )}

      {estado.fase === 'error' && (
        <div className="absolute left-1/2 top-1/2 z-10 w-80 max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-red-200 bg-white p-4 text-sm shadow-xl">
          <p className="mb-1 font-semibold text-red-700">No se pudieron cargar los datos</p>
          <p className="mb-3 break-words text-slate-600">{estado.mensaje}</p>
          <button
            type="button"
            onClick={() => setIntento((i) => i + 1)}
            className="rounded bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
