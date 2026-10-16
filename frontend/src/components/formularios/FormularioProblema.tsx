import React, { useState } from 'react';
import { insforge } from '../../lib/insforgeClient';
import { CATEGORIAS_PROBLEMA, PRIORIDADES } from '../../lib/datos';
import { coordinatesToAddress } from '../../lib/geocoding';

interface FormularioProblemaProps {
  onSuccess?: () => void;
  /** Llamado cuando el vecino activa "ubicar en el mapa". */
  onIniciarUbicacion?: () => void;
  /** Ubicación elegida haciendo clic en el mapa (lng, lat). */
  ubicacion?: [number, number] | null;
  /** true mientras el modo "ubicar en el mapa" está activo. */
  modoUbicacion?: boolean;
}

// Categorías y prioridades reales de los catálogos `categoria_problema` y
// `prioridad` (las que acepta la BD). El wizard de 3 pasos sigue el patrón de
// munify.com.ar: describir → clasificar → ubicación, con código de seguimiento
// al final como en pulsociudadano.app.
export const FormularioProblema: React.FC<FormularioProblemaProps> = ({
  onSuccess,
  onIniciarUbicacion,
  ubicacion,
  modoUbicacion = false,
}) => {
  const [paso, setPaso] = useState(1);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('otro');
  const [prioridad, setPrioridad] = useState('media');
  const [direccion, setDireccion] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [codigoEnviado, setCodigoEnviado] = useState<string | null>(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  // Obtener dirección a partir de coordenadas
  const obtenerDireccionDesdeCoordenadas = async (lat: number, lng: number) => {
    setGeocodingLoading(true);
    setGeocodingError(null);
    try {
      const address = await coordinatesToAddress(lat, lng);
      if (address) {
        setDireccion(address);
      } else {
        setGeocodingError('No se pudo obtener la dirección para estas coordenadas');
      }
    } catch (error) {
      console.error('Error al obtener dirección:', error);
      setGeocodingError('Error al obtener la dirección');
    } finally {
      setGeocodingLoading(false);
    }
  };

  const puedeAvanzar =
    (paso === 1 && titulo.trim().length >= 3 && descripcion.trim().length >= 10) ||
    (paso === 2 && !!categoria && !!prioridad) ||
    (paso === 3 && (direccion.trim().length >= 3 || !!ubicacion));

  // Sugerencia simple de categoría a partir del texto (inspirada en la IA de
  // Munify: "el vecino escribe en sus palabras, el sistema sugiere la categoría").
  const sugerirCategoria = (texto: string): string | null => {
    const t = texto.toLowerCase();
    const reglas: [RegExp, string][] = [
      [/farol|luz|apagad|oscur|alumbr/, 'alumbrado'],
      [/bache|paviment|ripio|calle|ruta|vereda/, 'calle'],
      [/agua|canilla|pilet|distribuc/, 'agua'],
      [/cloaca|cuneta|escurrim|drenaj|tapa/, 'cloaca'],
      [/basura|residuo|limpiez|basural/, 'residuos'],
      [/árbol|arbol|poda|rama/, 'arbolado'],
      [/inund|aneg|agua estancad|lluvia/, 'inundacion'],
      [/ruido|música|fiesta|molést/, 'ruido'],
      [/perro|gato|animal|vacuna/, 'animales'],
      [/señal|semáfor|transit|auto|estacion/, 'transito'],
      [/plaza|espacio|playón|playon|deck/, 'espacio_publico'],
      [/rob|violenc|insegur|asalt/, 'seguridad'],
    ];
    for (const [re, val] of reglas) if (re.test(t)) return val;
    return null;
  };
  const sugerida = paso === 2 ? sugerirCategoria(`${titulo} ${descripcion}`) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!puedeAvanzar) return;
    setLoading(true);
    try {
      const registro: Record<string, unknown> = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        prioridad,
        direccion: direccion.trim() || null,
        canal: 'web',
      };
      if (ubicacion) {
        // El trigger sincronizar_lat_lon arma `geom` desde lat/lon.
        registro.lat = ubicacion[1];
        registro.lon = ubicacion[0];
      }
      const { error } = await insforge.database.from('problemas').insert([registro]);
      if (error) throw error;
      setCodigoEnviado('¡Gracias! Tu reporte quedó registrado y recibirá un código de seguimiento (MA-AAAA-NNNN) cuando se publique en el mapa.');
      setTitulo('');
      setDescripcion('');
      setDireccion('');
      setPaso(1);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || 'Error al enviar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white shadow rounded">
      <h2 className="text-lg font-bold mb-1">Reportar Problema</h2>
      {/* Barra de progreso del wizard (patrón Munify: "Paso X de N") */}
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => n < paso && setPaso(n)}
            className={`flex-1 rounded-full py-1 text-center font-medium transition-colors ${
              n === paso ? 'bg-blue-600 text-white' : n < paso ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            Paso {n} de 3
          </button>
        ))}
      </div>

      {paso === 1 && (
        <>
          <input
            type="text"
            placeholder="Título (ej: Farola apagada)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full p-2 mb-2 border rounded"
            minLength={3}
            maxLength={200}
            required
          />
          <textarea
            placeholder="Contanos qué está pasando (mínimo 10 caracteres). Con tus palabras alcanza: te sugeriremos la categoría."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full p-2 mb-2 border rounded"
            rows={4}
            minLength={10}
            required
          />
        </>
      )}

      {paso === 2 && (
        <>
          {sugerida && sugerida !== categoria && (
            <p className="mb-2 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              💡 Según tu descripción, podría ser{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => setCategoria(sugerida)}
              >
                {CATEGORIAS_PROBLEMA.find((c) => c.valor === sugerida)?.etiqueta ?? sugerida}
              </button>
              .
            </p>
          )}
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full p-2 mb-3 border rounded"
          >
            {CATEGORIAS_PROBLEMA.map(({ valor, etiqueta }) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
          <div className="grid grid-cols-4 gap-1">
            {PRIORIDADES.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => setPrioridad(p.valor)}
                className={`rounded border px-1 py-1.5 text-xs font-medium transition-colors ${
                  prioridad === p.valor
                    ? 'border-transparent text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                style={prioridad === p.valor ? { backgroundColor: p.color } : undefined}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
        </>
      )}

      {paso === 3 && (
        <>
          <input
            type="text"
            placeholder="Dirección o referencia del lugar (ej: Av. Belgrano y calle 1)"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full p-2 mb-2 border rounded"
            minLength={direccion ? 3 : undefined}
          />
          <button
            type="button"
            onClick={() => onIniciarUbicacion?.()}
            className={`w-full rounded border border-dashed px-3 py-2 text-sm font-medium transition-colors ${
              modoUbicacion
                ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-dashed border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {modoUbicacion
              ? ' ↳ Clickeá en el mapa para dejar el punto…'
              : ubicacion
              ? 'Cambiar ubicación en el mapa'
              : 'Ubicar en el mapa (opcional, recomendado)'}
          </button>
          {modoUbicacion && (
            <p className="mt-2 text-xs text-amber-700">
              Modo activo: elige el punto directamente sobre el mapa. Clickeá
              otra vez el botón para cancelar.
            </p>
          )}
          {ubicacion && (
            <div className="mt-2">
              <p className="text-xs text-emerald-700 mb-2">
                ✔ Ubicación elegida: {ubicacion[0].toFixed(5)}, {ubicacion[1].toFixed(5)}
              </p>
              <button
                type="button"
                onClick={() => obtenerDireccionDesdeCoordenadas(ubicacion[1], ubicacion[0])}
                disabled={geocodingLoading}
                className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 mb-2"
              >
                {geocodingLoading ? 'Obteniendo dirección...' : 'Obtener dirección automáticamente'}
              </button>
              {geocodingError && (
                <p className="text-xs text-red-600 mb-2">{geocodingError}</p>
              )}
            </div>
          )}
          {!direccion.trim() && !ubicacion && (
            <p className="mt-2 text-xs text-red-600">
              Indicá una dirección o ubicá el punto en el mapa para poder georreferenciar el reporte.
            </p>
          )}
        </>
      )}

      {codigoEnviado && (
        <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{codigoEnviado}</p>
      )}
      {errorMsg && <p className="mt-3 text-sm text-red-600 break-words">{errorMsg}</p>}

      <div className="mt-4 flex gap-2">
        {paso > 1 && (
          <button
            type="button"
            onClick={() => setPaso((p) => p - 1)}
            className="flex-1 rounded border border-slate-300 bg-white p-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Anterior
          </button>
        )}
        {paso < 3 ? (
          <button
            type="button"
            disabled={!puedeAvanzar}
            onClick={() => setPaso((p) => p + 1)}
            className="flex-1 rounded bg-blue-600 p-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || !puedeAvanzar}
            className="flex-1 rounded bg-blue-600 p-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Enviando...' : 'Enviar reporte'}
          </button>
        )}
      </div>
    </form>
  );
};
