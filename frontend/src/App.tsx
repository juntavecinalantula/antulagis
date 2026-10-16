import { useState } from 'react';
import MapaBarrio, { type EstadoMapa } from './components/MapaBarrio';
import PanelCapas from './components/PanelCapas';
import { FormularioProblema } from './components/formularios/FormularioProblema';
import { FormularioPropuesta } from './components/formularios/FormularioPropuesta';
import { PanelFiltros } from './components/filtros/PanelFiltros';
import { VisualizacionDatos } from './components/visualizacion/VisualizacionDatos';
import { PanelSeguimiento } from './components/visualizacion/PanelSeguimiento';
import { insforge } from './lib/insforgeClient';
import type { CapasVisibles } from './lib/datos';
import type { BaseId } from './lib/baseMap';

type PanelId = 'capas' | 'filtros' | 'reportar' | 'seguimiento' | 'dashboard';

const PESTANAS: { id: PanelId; nombre: string }[] = [
  { id: 'capas', nombre: 'Capas' },
  { id: 'filtros', nombre: 'Filtros' },
  { id: 'reportar', nombre: 'Reportar' },
  { id: 'seguimiento', nombre: 'Seguimiento' },
  { id: 'dashboard', nombre: 'Datos' },
];

function App() {
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
  const [estado, setEstado] = useState<EstadoMapa>({ fase: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [panelActivo, setPanelActivo] = useState<PanelId>('capas');
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [refreshDatos, setRefreshDatos] = useState(0);
  // Ubicación elegida en el mapa para el último formulario abierto.
  const [ubicacion, setUbicacion] = useState<[number, number] | null>(null);
  // Modo "esperando click en el mapa": cuando está activo, el mapa notifica
  // cada click al padre en lugar de abrir un popup.
  const [modoUbicacion, setModoUbicacion] = useState(false);

  /** Apoyar / retirar el apoyo a una propuesta desde el popup del mapa. */
  const apoyarPropuesta = async (id: number, apoyado: boolean) => {
    try {
      if (apoyado) {
        await insforge.database.from('propuestas_apoyos').delete().eq('propuesta_id', id);
      } else {
        await insforge.database
          .from('propuestas_apoyos')
          .insert({ rows: [{ propuesta_id: id }] });
      }
      setRefreshDatos((n) => n + 1);
    } catch (e) {
      console.error('apoyar propuesta', e);
    }
  };

  const abrirPestana = (id: PanelId) => {
    setPanelActivo(id);
    setPanelAbierto(true);
  };

  return (
    <div className="fixed inset-0 font-sans text-slate-900 bg-slate-50">
      <MapaBarrio
        key={intento}
        visibles={visibles}
        base={base}
        onEstado={setEstado}
        filtros={{ estado: filtroEstado, categoria: filtroCategoria }}
        refreshKey={refreshDatos}
        onApoyarPropuesta={apoyarPropuesta}
        modoUbicacion={modoUbicacion}
        onUbicacionElegida={(lngLat) => {
          setUbicacion(lngLat);
          setModoUbicacion(false);
        }}
      />

      <header className="absolute left-3 top-3 z-20 rounded-xl border border-slate-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur">
        <h1 className="text-sm font-bold leading-tight sm:text-base">MAMA ANTULA</h1>
        <p className="text-xs text-slate-500">Gestión Vecinal</p>
      </header>

      {/* Menú de navegación principal (arriba a la derecha) */}
      <nav className="absolute right-3 top-3 z-20 flex flex-col items-stretch gap-2">
        <button
          type="button"
          onClick={() => setPanelAbierto((v) => !v)}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {panelAbierto ? 'Ocultar panel' : 'Mostrar panel'}
        </button>
        {PESTANAS.map(({ id, nombre }) => {
          const activo = panelActivo === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => abrirPestana(id)}
              aria-pressed={activo}
              className={`rounded-lg px-3 py-2 text-sm font-medium shadow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                activo
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {nombre}
            </button>
          );
        })}
      </nav>

      {/* Panel de contenido dinámico (izquierda, debajo del encabezado) */}
      {panelAbierto && (
        <aside className="absolute left-3 top-20 z-10 w-80 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain">
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
              <FormularioProblema
                onSuccess={() => {
                  setRefreshDatos((n) => n + 1);
                  setUbicacion(null);
                  setModoUbicacion(false);
                }}
                onIniciarUbicacion={() => {
                  setModoUbicacion((v) => !v);
                }}
                ubicacion={ubicacion}
                modoUbicacion={modoUbicacion}
              />
              <FormularioPropuesta
                onSuccess={() => {
                  setRefreshDatos((n) => n + 1);
                  setUbicacion(null);
                  setModoUbicacion(false);
                }}
                onIniciarUbicacion={() => {
                  setModoUbicacion((v) => !v);
                }}
                ubicacion={ubicacion}
                modoUbicacion={modoUbicacion}
              />
            </div>
          )}
          {panelActivo === 'dashboard' && <VisualizacionDatos refreshKey={refreshDatos} />}
          {panelActivo === 'seguimiento' && (
            <PanelSeguimiento
              filtroEstado={filtroEstado}
              filtroCategoria={filtroCategoria}
              refreshKey={refreshDatos}
            />
          )}
        </aside>
      )}

      {estado.fase === 'cargando' && (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white px-4 py-2 text-sm shadow-lg">
          Cargando datos…
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
