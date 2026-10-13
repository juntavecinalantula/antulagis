import React, { useState } from 'react';
import { insforge } from '../../lib/insforgeClient';

interface FormularioProblemaProps {
  onSuccess?: () => void;
}

export const FormularioProblema: React.FC<FormularioProblemaProps> = ({ onSuccess }) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('otro');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await insforge.database
        .from('problemas')
        .insert([{ titulo, descripcion, categoria, canal: 'web' }]);

      if (error) throw error;

      alert('Problema reportado exitosamente');
      setTitulo('');
      setDescripcion('');
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert('Error al enviar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white shadow rounded">
      <h2 className="text-lg font-bold mb-4">Reportar Problema</h2>
      <input
        type="text"
        placeholder="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full p-2 mb-2 border rounded"
        required
      />
      <textarea
        placeholder="Descripción"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        className="w-full p-2 mb-2 border rounded"
        required
      />
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
      >
        <option value="otro">Otro</option>
        <option value="luminaria">Luminaria</option>
        <option value="bache">Bache / Calle</option>
        <option value="basura">Basura</option>
      </select>
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
