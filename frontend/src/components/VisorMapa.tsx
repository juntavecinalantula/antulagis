import { useState } from 'react';
import {
  Layers,
  Filter,
  MessageSquarePlus,
  ListChecks,
  X,
  Flame,
  MapPin,
} from 'lucide-react';
import MapaBarrio, { type EstadoMapa } from './MapaBarrio';
import PanelCapas from './PanelCapas';
import { PanelFiltros } from './filtros/PanelFiltros';
import { PanelSeguimiento } from './visualizacion/PanelSeguimiento';
import { VisualizacionDatos } from './visualizacion/VisualizacionDatos';
import { FormularioProblema } from './formularios/FormularioProblema';
import { FormularioPropuesta } from './formularios/FormularioPropuesta';
import type { BaseId } from '../lib/baseMap';
import type { CapasVisibles, Conteos } from '../lib/datos';

export type PestanaVisor = 'capas' | 'filtros' | 'reportar' | 'seguimiento';

type Props = {
  /** Cambia para recargar los reportes del mapa (tras un reporte nuevo). */
  refreshKey: number;
  /** Pestana activa del panel lateral. */
  pestana: PestanaVisor;
  onPestana: (p: PestanaVisor) => void;
  /** Notificado cuando el vecino envía un reporte o una propuesta. */
  onReporteCreado: () => void;
};

const TODAS_VISIBLES: CapasVisibles = {
  manzanas: true,
  callesAsfalto: true,
  callesRipio: true,
  cauces: true,
  informacion: true,
  luminaria: true,
  entradas: true,
  problemas: true,
  propuestas: true,
  nombresCalles: true,
};

const PESTANAS: { id: PestanaVisor; etiqueta: string; icon: typeof Layers }[] = [
  { id: 'capas', etiqueta: 'Capas', icon: Layers },
  { id: 'filtros', etiqueta: 'Filtros', icon: Filter },
  { id: 'reportar', etiqueta: 'Reportar', icon: MessageSquarePlus },
  { id: 'seguimiento', etiqueta: 'Seguimiento', icon: ListChecks },
];

/**
 * Visor SIG con panel lateral flotante (patrón munify / pulsociudadano.app):
 * el mapa ocupa toda la pantalla y las herramientas quedan superpuestas.
 *
 * El panel vuelve a poner en juego las piezas que el tablero tenía
 * desconectadas: capas, filtros por estado/categoría, alta de reportes con
 * selección de ubicación sobre el mapa y seguimiento público.
 */
export default function VisorMapa({ refreshKey, pestana, onPestana, onReporteCreado }: Props) {
  const [visibles, setVisibles] = useState<CapasVisibles>(TODAS_VISIBLES);
  const [base, setBase] = useState<BaseId>('osm');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [modoMapa, setModoMapa] = useState<'puntos' | 'calor'>('puntos');
  const [conteos, setConteos] = useState<Conteos | null>(null);
  const [estadoMapa, setEstadoMapa] = useState<EstadoMapa>({ fase: 'cargando' });
  const [formulario, setFormulario] = useState<'problema' | 'propuesta'>('problema');
  const [ubicacion, setUbicacion] = useState<[number, number] | null>(null);
  const [modoUbicacion, setModoUbicacion] = useState(false);
  // El panel lateral (capas/filtros/reportar/seguimiento) puede ocultarse
  // por completo para dejar el mapa a pantalla entera.
  const [panelAbierto, setPanelAbierto] = useState(true);

  const manejarEstado = (estado: EstadoMapa) => {
    setEstadoMapa(estado);
    if (estado.fase === 'listo') setConteos(estado.conteos);
  };

  /** Al enviar un reporte: se limpian la ubicación y el modo de colocación. */
  const trasReporte = () => {
    setUbicacion(null);
    setModoUbicacion(false);
    onReporteCreado();
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <MapaBarrio
        visibles={visibles}
        base={base}
        onEstado={manejarEstado}
        filtros={{ estado: filtroEstado, categoria: filtroCategoria }}
        modoMapa={modoMapa}
        refreshKey={refreshKey}
        modoUbicacion={modoUbicacion}
        onUbicacionElegida={(coordenada) => {
          setUbicacion(coordenada);
          setModoUbicacion(false);
        }}
        ubicacion={ubicacion}
      />

      {/* Estado de carga / error del backend */}
      {estadoMapa.fase === 'cargando' && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 z-20 rounded-full bg-slate-900/85 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          Cargando capas del barrio…
        </div>
      )}
      {estadoMapa.fase === 'error' && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 z-20 max-w-md rounded-2xl bg-red-600 px-4 py-3 text-xs font-semibold text-white shadow-lg">
          {estadoMapa.mensaje}
        </div>
      )}

      {/* Aviso de modo "ubicar en el mapa" */}
      {modoUbicacion && (
        <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg">
          <MapPin className="h-4 w-4" />
          Clickeá en el mapa para dejar el punto
          <button
            type="button"
            onClick={() => setModoUbicacion(false)}
            className="rounded-full bg-white/25 px-2 py-0.5 hover:bg-white/40"
          >
            cancelar
          </button>
        </div>
      )}

      {/* Control de modo puntos / calor (esquina inferior izquierda) */}
      <div className="absolute bottom-6 left-4 z-20 flex overflow-hidden rounded-xl bg-white/95 shadow-lg ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => setModoMapa('puntos')}
          className={`px-3 py-2 text-xs font-bold transition-colors ${
            modoMapa === 'puntos' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Puntos
        </button>
        <button
          type="button"
          onClick={() => setModoMapa('calor')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors ${
            modoMapa === 'calor' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          Calor
        </button>
      </div>

      {/* Panel lateral flotante */}
      <aside className="absolute bottom-0 right-0 top-0 z-30 flex w-full flex-col bg-slate-50/95 backdrop-blur sm:w-96">
        {/* Pestañas */}
        <div className="flex flex-shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3 py-2">
          {PESTANAS.map(({ id, etiqueta, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onPestana(id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                pestana === id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {etiqueta}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPestana('capas')}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido del panel */}
        <div className="flex-1 overflow-y-auto p-3">
          {pestana === 'capas' && (
            <PanelCapas
              visibles={visibles}
              onVisibles={setVisibles}
              base={base}
              onBase={setBase}
              conteos={conteos}
            />
          )}

          {pestana === 'filtros' && (
            <PanelFiltros
              filtroEstado={filtroEstado}
              setFiltroEstado={setFiltroEstado}
              filtroCategoria={filtroCategoria}
              setFiltroCategoria={setFiltroCategoria}
            />
          )}

          {pestana === 'reportar' && (
            <div className="space-y-3">
              <div className="flex overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => setFormulario('problema')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                    formulario === 'problema'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Reportar problema
                </button>
                <button
                  type="button"
                  onClick={() => setFormulario('propuesta')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                    formulario === 'propuesta'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Proponer solución
                </button>
              </div>

              {formulario === 'problema' ? (
                <FormularioProblema
                  onSuccess={trasReporte}
                  onIniciarUbicacion={() => setModoUbicacion(true)}
                  ubicacion={ubicacion}
                  modoUbicacion={modoUbicacion}
                />
              ) : (
                <FormularioPropuesta
                  onSuccess={trasReporte}
                  onIniciarUbicacion={() => setModoUbicacion(true)}
                  ubicacion={ubicacion}
                  modoUbicacion={modoUbicacion}
                />
              )}
            </div>
          )}

          {pestana === 'seguimiento' && (
            <div className="space-y-3">
              <VisualizacionDatos refreshKey={refreshKey} />
              <PanelSeguimiento
                filtroEstado={filtroEstado}
                filtroCategoria={filtroCategoria}
                refreshKey={refreshKey}
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
