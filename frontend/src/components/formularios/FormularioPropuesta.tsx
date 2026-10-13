import React, { useState } from 'react';
import { insforge } from '../../lib/insforgeClient';

interface FormularioPropuestaProps {
  onSuccess?: () => void;
}

export const FormularioPropuesta: React.FC<FormularioPropuestaProps> = ({ onSuccess }) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('otro');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await insforge.database
        .from('propuestas')
        .insert([{ titulo, descripcion, categoria, canal: 'web' }]);

      if (error) throw error;

      alert('Propuesta enviada exitosamente');
      setTitulo('');
      setDescripcion('');
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert('Error al enviar la propuesta');
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
        required
      />
      <textarea
        placeholder="Descripción detallada"
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
        <option value="espacio_verde">Espacio Verde</option>
        <option value="mejora_vial">Mejora Vial</option>
        <option value="social">Social / Cultural</option>
      </select>
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
