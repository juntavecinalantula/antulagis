import React, { useState, useEffect } from 'react';
import { insforge } from '../../lib/insforgeClient';
import { coordinatesToAddress } from '../../lib/geocoding';

interface FormularioPropuestaProps {
  onSuccess?: () => void;
  /** Llamado cuando el vecino activa "ubicar en el mapa". */
  onIniciarUbicacion?: () => void;
  /** Ubicación elegida haciendo clic en el mapa (lng, lat). */
  ubicacion?: [number, number] | null;
  /** true mientras el modo "ubicar en el mapa" está activo. */
  modoUbicacion?: boolean;
}

// Categorías reales del catálogo `categoria_propuesta` (las que acepta la BD).
const CATEGORIAS: { valor: string; etiqueta: string }[] = [
  { valor: 'calle', etiqueta: 'Mejora de calle / vereda' },
  { valor: 'alumbrado', etiqueta: 'Alumbrado público' },
  { valor: 'agua', etiqueta: 'Agua' },
  { valor: 'cloaca', etiqueta: 'Cloaca' },
  { valor: 'residuos', etiqueta: 'Residuos' },
  { valor: 'arbolado', etiqueta: 'Arbolado / espacios verdes' },
  { valor: 'seguridad', etiqueta: 'Seguridad' },
  { valor: 'transito', etiqueta: 'Tránsito' },
  { valor: 'espacio_publico', etiqueta: 'Espacio público' },
  { valor: 'cultura', etiqueta: 'Cultura' },
  { valor: 'deporte', etiqueta: 'Deporte' },
  { valor: 'ambiente', etiqueta: 'Medio ambiente' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export const FormularioPropuesta: React.FC<FormularioPropuestaProps> = ({
  onSuccess,
  onIniciarUbicacion,
  ubicacion,
  modoUbicacion = false,
}) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('otro');
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

  // Auto-reverse geocode when ubicacion prop changes
  useEffect(() => {
    if (ubicacion) {
      void obtenerDireccionDesdeCoordenadas(ubicacion[1], ubicacion[0]);
    }
  }, [ubicacion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (direccion.trim().length < 3 && !ubicacion) {
      setErrorMsg('Indicá una dirección o ubicá el punto en el mapa para georreferenciar la propuesta.');
      return;
    }
    setLoading(true);
    try {
      const registro: Record<string, unknown> = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        direccion: direccion.trim() || null,
        canal: 'web',
      };
      if (ubicacion) {
        // El trigger sincronizar_lat_lon arma `geom` desde lat/lon.
        registro.lat = ubicacion[1];
        registro.lon = ubicacion[0];
      }
      // `.select()` hace que la API devuelva la fila insertada (con el código
      // de seguimiento que genera la base).
      const { data, error } = await insforge.database
        .from('propuestas')
        .insert([registro])
        .select('id, codigo');
      if (error) throw error;
      const codigo = (data as unknown as { codigo?: string }[] | null)?.[0]?.codigo ?? null;
      setCodigoEnviado(
        codigo
          ? `¡Gracias! Tu propuesta quedó registrada con el código de seguimiento ${codigo}.`
          : '¡Gracias! Tu propuesta quedó registrada.',
      );
      setTitulo('');
      setDescripcion('');
      setDireccion('');
      onSuccess?.();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || 'Error al enviar la propuesta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white shadow rounded">
      <h2 className="text-lg font-bold mb-4">Nueva Propuesta Vecinal</h2>

      <input
        type="text"
        placeholder="Título de la propuesta"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full p-2 mb-2 border rounded"
        minLength={3}
        maxLength={200}
        required
      />
      <textarea
        placeholder="Descripción detallada (mínimo 10 caracteres)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        className="w-full p-2 mb-2 border rounded"
        minLength={10}
        required
      />
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        className="w-full p-2 mb-2 border rounded"
      >
        {CATEGORIAS.map(({ valor, etiqueta }) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </select>
      
      <input
        type="text"
        placeholder="Dirección o referencia de la zona"
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        className="w-full p-2 mb-3 border rounded"
        minLength={direccion ? 3 : undefined}
        required={!ubicacion}
      />

      {/* Botón para obtener ubicación en el mapa */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => onIniciarUbicacion?.()}
          className={`w-full rounded border border-dashed px-3 py-2 text-sm font-medium transition-colors mb-2 ${
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
          <p className="text-xs text-amber-700 mb-2">
            Modo activo: elige el punto directamente sobre el mapa. Clickeá
            otra vez el botón para cancelar.
          </p>
        )}
        
        {ubicacion && (
          <div className="mb-3">
            <p className="text-xs text-emerald-700 mb-2">
              ✔ Ubicación elegida: {ubicacion[0].toFixed(5)}, {ubicacion[1].toFixed(5)}
            </p>
            
            {/* Botón para obtener dirección automáticamente */}
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
          <p className="text-xs text-red-600">
            Indicá una dirección o ubicá el punto en el mapa para poder georreferenciar la propuesta.
          </p>
        )}
      </div>

      {codigoEnviado && (
        <p className="mb-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{codigoEnviado}</p>
      )}

      {errorMsg && (
        <p className="mb-3 text-sm text-red-600 break-words">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full p-2 bg-green-600 text-white rounded disabled:bg-gray-400"
      >
        {loading ? 'Enviando...' : 'Enviar Propuesta'}
      </button>
    </form>
  );
};
