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
  const [modoMapa, setModoMapa] = useState<'puntos' | 'calor'>('puntos');
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
    <div className="fixed inset-0 font-sans text-slate-900 bg-slate-50 flex flex-col sm:flex-row">
      <MapaBarrio
        key={intento}
        visibles={visibles}
        base={base}
        onEstado={setEstado}
        filtros={{ estado: filtroEstado, categoria: filtroCategoria }}
        modoMapa={modoMapa}
        refreshKey={refreshDatos}
        onApoyarPropuesta={apoyarPropuesta}
        modoUbicacion={modoUbicacion}
        onUbicacionElegida={(lngLat) => {
          setUbicacion(lngLat);
          setModoUbicacion(false);
        }}
      />

      {/* Header flotante superior (móvil) o barra lateral (desktop) */}
      <div className="absolute left-3 top-3 z-30 flex items-center gap-3">
        <header className="rounded-xl border border-slate-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
          <div>
            <h1 className="text-sm font-bold leading-tight sm:text-base tracking-tight">MAMA ANTULA</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Gestión Vecinal</p>
          </div>
        </header>
        
        <button
          type="button"
          onClick={() => setPanelAbierto((v) => !v)}
          className="rounded-xl bg-white border border-slate-200 p-2.5 text-slate-600 shadow-lg hover:bg-slate-50 focus:outline-none"
        >
          {panelAbierto ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          )}
        </button>
      </div>

      {/* Navegación de Pestañas (Munify style: pill toggles) */}
      <nav className="absolute right-3 top-3 z-30 flex bg-white/90 backdrop-blur p-1.5 rounded-xl border border-slate-200 shadow-lg gap-1">
        {PESTANAS.map(({ id, nombre }) => {
          const activo = panelActivo === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => abrirPestana(id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activo
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {nombre}
            </button>
          );
        })}
      </nav>

      {/* Switch de Modo Mapa (Puntos vs Calor) */}
      <div className="absolute right-3 bottom-8 z-30 flex bg-white/90 backdrop-blur p-1 rounded-xl border border-slate-200 shadow-lg">
        <button
          onClick={() => setModoMapa('puntos')}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${modoMapa === 'puntos' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Puntos
        </button>
        <button
          onClick={() => setModoMapa('calor')}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${modoMapa === 'calor' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Calor
        </button>
      </div>

      {/* Panel de contenido dinámico (Munify style: sidebar) */}
      {panelAbierto && (
        <aside className="absolute left-3 top-20 z-20 w-80 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-6.5rem)] overflow-y-auto overscroll-contain flex flex-col gap-3 pb-4 scrollbar-hide">
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
