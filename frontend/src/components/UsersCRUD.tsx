import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

type UserRole = 'Usuário' | 'Admin';

interface User {
  id: string;
  email: string;
  fullName: string;
  badgeNumber: string;
  coren?: string;
  role: UserRole;
  department: string;
  function: string;
}

interface FormState {
  email: string;
  fullName: string;
  badgeNumber: string;
  coren: string;
  password: string;
  role: UserRole;
  department: string;
  function: string;
}

const initialFormState: FormState = {
  email: '',
  fullName: '',
  badgeNumber: '',
  coren: '',
  password: '',
  role: 'Usuário',
  department: 'Enfermagem',
  function: 'Técnico',
};

export default function UsersCRUD() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(initialFormState);

  const departments = ['Enfermagem', 'Médico', 'Anestesiologia', 'Instrumentação'];
  const functions = ['Auxiliar', 'Técnico', 'Enfermeiro'];
  const profiles: UserRole[] = ['Usuário', 'Admin'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const payload = editingId
        ? { ...formData, password: formData.password || undefined }
        : formData;

      if (editingId) {
        alert('Edição de usuários ainda está em desenvolvimento.');
      } else {
        await axios.post(`${API_URL}/users`, payload, { headers });
      }

      await fetchUsers();
      handleCancel();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao salvar usuário');
      console.error('Erro ao salvar usuário:', error);
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      email: user.email,
      fullName: user.fullName,
      badgeNumber: user.badgeNumber,
      coren: user.coren || '',
      password: '',
      role: user.role,
      department: user.department,
      function: user.function,
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deletar este usuário?')) {
      return;
    }

    alert('Deleção de usuários ainda está em desenvolvimento.');
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando usuários...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Usuários</h1>
          <p className="text-slate-600 mt-1">Cadastro de profissionais da equipe</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg transition-all"
        >
          <Plus size={18} />
          Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
            <button onClick={handleCancel} className="text-slate-500 hover:text-slate-700">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              required
            />

            <input
              type="text"
              placeholder="Nome completo"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              required
            />

            <input
              type="text"
              placeholder="Número do crachá"
              value={formData.badgeNumber}
              onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              required
            />

            <input
              type="text"
              placeholder="COREN"
              value={formData.coren}
              onChange={(e) => setFormData({ ...formData, coren: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
            />

            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <select
              value={formData.function}
              onChange={(e) => setFormData({ ...formData, function: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              {functions.map((func) => (
                <option key={func} value={func}>
                  {func}
                </option>
              ))}
            </select>

            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              {profiles.map((profile) => (
                <option key={profile} value={profile}>
                  {profile}
                </option>
              ))}
            </select>

            {!editingId && (
              <input
                type="password"
                placeholder="Senha"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                required
              />
            )}

            <div className="md:col-span-2 flex gap-2 pt-2">
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
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Nome</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Email</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Crachá</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Departamento</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Função</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Perfil</th>
              <th className="px-4 py-3 text-left font-bold text-slate-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">{user.fullName}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.badgeNumber}</td>
                <td className="px-4 py-3">{user.department}</td>
                <td className="px-4 py-3">{user.function}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
