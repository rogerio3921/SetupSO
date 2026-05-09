import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface Status {
  id: string;
  status: string;
  color: string;
  label: string;
}

export default function StatusLegendCRUD() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    status: '',
    label: '',
    color: '#00ff00'
  });

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/status-legends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatuses(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingId) {
        await axios.patch(`${API_URL}/status-legends/${editingId}`, formData, { headers });
      } else {
        await axios.post(`${API_URL}/status-legends`, formData, { headers });
      }

      fetchStatuses();
      setShowForm(false);
      setEditingId(null);
      setFormData({ status: '', label: '', color: '#00ff00' });
    } catch (error) {
      console.error('Erro ao salvar status:', error);
    }
  };

  const handleEdit = (status: Status) => {
    setFormData({
      status: status.status,
      label: status.label,
      color: status.color
    });
    setEditingId(status.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/status-legends/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStatuses();
    } catch (error) {
      console.error('Erro ao deletar status:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ status: '', label: '', color: '#00ff00' });
  };

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900">Cadastro de Status</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-all"
        >
          <Plus size={20} />
          Novo Status
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Editar Status' : 'Novo Status'}
              </h2>
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nome do Status
                </label>
                <input
                  type="text"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  required
                  placeholder="Ex: LIBERADO"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Rótulo
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  required
                  placeholder="Ex: Paciente Liberado"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Cor
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-12 border border-slate-300 rounded-lg cursor-pointer"
                  />
                  <div
                    className="w-20 h-12 rounded-lg border-2 border-slate-300"
                    style={{ backgroundColor: formData.color }}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statuses.map((status) => (
          <div key={status.id} className="bg-white rounded-lg shadow-lg p-4 border-l-4" style={{ borderLeftColor: status.color }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-bold text-slate-600">{status.status}</p>
                <p className="text-lg font-black" style={{ color: status.color }}>
                  {status.label}
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-lg border-2 border-slate-300"
                style={{ backgroundColor: status.color }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(status)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-bold transition-all"
              >
                <Edit2 size={16} />
                Editar
              </button>
              <button
                onClick={() => handleDelete(status.id)}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-bold transition-all"
              >
                <Trash2 size={16} />
                Deletar
              </button>
            </div>
          </div>
        ))}
      </div>

      {statuses.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-600">Nenhum status cadastrado</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-green-600 hover:text-green-700 font-bold"
          >
            Criar primeiro status
          </button>
        </div>
      )}
    </div>
  );
}
