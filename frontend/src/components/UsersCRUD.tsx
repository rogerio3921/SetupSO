import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  badgeNumber: string;
  coren: string;
  role: string;
  department: string;
  function: string;
}

export default function UsersCRUD() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    badgeNumber: '',
    coren: '',
    password: '',
    role: 'Usuário',
    department: 'Enfermagem',
    function: 'Técnico'
  });

  const roles = ['User', 'Admin', 'Master'];
  const functions = ['Auxiliar', 'Técnico', 'Enfermeiro'];
  const departments = ['Enfermagem', 'Médico', 'Anestesiologia', 'Instrumentação'];
  const profiles = ['Usuário', 'Admin'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Validações
      if (!formData.fullName.trim()) {
        alert('Nome completo é obrigatório');
        return;
      }
      if (!formData.badgeNumber.trim()) {
        alert('Número do crachá é obrigatório');
        return;
      }

      // Prepare data
      const dataToSend = editingId
        ? { ...formData, password: formData.password || undefined }
        : formData;

      if (editingId) {
        alert('Edição de usuários em desenvolvimento');
      } else {
        await axios.post(`${API_URL}/users`, dataToSend, { headers });
      }

      fetchUsers();
      handleCancel();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao salvar usuário');
      console.error('Erro:', error);
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      ...formData,
      email: user.email,
      fullName: user.fullName,
      badgeNumber: user.badgeNumber,
      role: user.role,
      department: user.department,
      function: user.function,
      password: '' // Não preencher senha ao editar
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deletar este usuário?')) return;
    
    try {
      const token = localStorage.getItem('token');
      // await axios.delete(`${API_URL}/users/${id}`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      alert('Deleção de usuários em desenvolvimento');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      email: '',
      fullName: '',
      badgeNumber: '',
      coren: '',
      password: '',
      role: 'Usuário',
      department: 'Enfermagem',
      function: 'Técnico'
    });
  };

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900">Usuários</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-all"
        >
          <Plus size={20} />
          Novo Usuário
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 my-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full  (Login)"
                required
                disabled={!!editingId}
              />

              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                placeholder="Nome Completo"
                required
              />

              <input
                type="text"
                value={formData.badgeNumber}
                onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                placeholder="Número do Crachá"
                required
              />

              <input
                type="text"
                value={formData.coren}
                onChange={(e) => setFormData({ ...formData, coren: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                placeholder="Número COREN"
              />

              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <select
                value={formData.function}
                onChange={(e) => setFormData({ ...formData, function: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              >
                {functions.map(func => (
                  <option key={func} value={func}>{func}</option>
                ))}
              </select>

              {!editingId && (
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                  placeholder="Senha"
                  required
                />
              )}

              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              >
                {profiles.map(prof => (
                  <option key={prof} value={prof}>{prof
                  <option key={func} value={func}>{func}</option>
                ))}
              </select>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
                >
                  Salvar
                </button>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Crachá</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Departamento</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Função</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Perfil</th>
                  className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-bold py-2 px-4 rounded-lg transition-all text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100 border-b-2 border-slate-300">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Nome</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Email</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Perfil</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Função</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="px-4 py-3 font-bold">{user.fullName}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{user.badgeNumber}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{user.department}</td>
                <td className="px-4 py-3 text-sm">{user.function}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    user.role === 'Admin' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold transition-all"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold transition-all"
                  >
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-600">Nenhum usuário cadastrado</p>
        </div>
      )}
    </div>
  );
}
