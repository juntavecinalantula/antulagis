import React, { useState } from 'react';
import { insforge } from '../../lib/insforgeClient';

interface FormularioProblemaProps {
  onSuccess?: () => void;
}

// Categorías reales del catálogo `categoria_problema` (las que acepta la BD).
const CATEGORIAS: { valor: string; etiqueta: string }[] = [
  { valor: 'alumbrado', etiqueta: 'Alumbrado público' },
  { valor: 'calle', etiqueta: 'Calle / bache' },
  { valor: 'agua', etiqueta: 'Agua' },
  { valor: 'cloaca', etiqueta: 'Cloaca' },
  { valor: 'residuos', etiqueta: 'Residuos / basura' },
  { valor: 'arbolado', etiqueta: 'Arbolado' },
  { valor: 'seguridad', etiqueta: 'Seguridad' },
  { valor: 'transito', etiqueta: 'Tránsito' },
  { valor: 'inundacion', etiqueta: 'Inundación' },
  { valor: 'ruido', etiqueta: 'Ruido' },
  { valor: 'espacio_publico', etiqueta: 'Espacio público' },
  { valor: 'animales', etiqueta: 'Animales' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export const FormularioProblema: React.FC<FormularioProblemaProps> = ({ onSuccess }) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('otro');
  const [direccion, setDireccion] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    // La BD exige al menos una ubicación (geom, direccion o lat).
    if (direccion.trim().length < 3) {
      setErrorMsg('Indicá una dirección o referencia del lugar del problema.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await insforge.database.from('problemas').insert([
        {
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          categoria,
          direccion: direccion.trim(),
          canal: 'web',
        },
      ]);
      if (error) throw error;
      alert('Problema reportado exitosamente');
      setTitulo('');
      setDescripcion('');
      setDireccion('');
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
      <h2 className="text-lg font-bold mb-4">Reportar Problema</h2>

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
        placeholder="Descripción (mínimo 10 caracteres)"
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
        placeholder="Dirección o referencia del lugar (ej: Av. Belgrano y calle 1)"
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
        className="w-full p-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {loading ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  );
};
