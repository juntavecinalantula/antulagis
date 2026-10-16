import React, { useState } from 'react';
import { insforge } from '../../lib/insforgeClient';

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
      const { error } = await insforge.database.from('propuestas').insert([registro]);
      if (error) throw error;
      alert('Propuesta enviada exitosamente');
      setifie('');
      setDescripción('');
      setDirección('');
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
        minLength={3}
        required
      />

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
