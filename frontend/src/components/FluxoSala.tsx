import React, { useEffect, useState } from 'react';
import { GripVertical, Plus, Pencil, Save, X, ArrowUp, ArrowDown, ToggleLeft, ToggleRight } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface TimelineStage {
  id: string;
  key: string;
  label: string;
  kind: string; // 'start_end' | 'in_out'
  seq: number;
  active: boolean;
}

export default function FluxoSala() {
  const [stages, setStages] = useState<TimelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState<TimelineStage | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStage, setNewStage] = useState({ key: '', label: '', kind: 'start_end' });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/timeline-stages`, { headers });
      setStages(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
    } finally {
      setLoading(false);
    }
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newStages.length) return;

    // Swap
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    // Update seq numbers
    const reordered = newStages.map((stage, i) => ({ ...stage, seq: i + 1 }));
    setStages(reordered);
    setHasChanges(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const payload = stages.map((stage) => ({ id: stage.id, seq: stage.seq }));
      await axios.put(`${API_URL}/timeline-stages/reorder`, { stages: payload }, { headers });
      setHasChanges(false);
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
      alert('Erro ao salvar a ordem das etapas.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newStage.label.trim()) {
      alert('Nome da etapa é obrigatório.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const key = newStage.key.trim() || newStage.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

      await axios.post(`${API_URL}/timeline-stages`, {
        key,
        label: newStage.label.trim(),
        kind: newStage.kind
      }, { headers });

      setNewStage({ key: '', label: '', kind: 'start_end' });
      setShowAddModal(false);
      await fetchStages();
    } catch (error: any) {
      const msg = error?.response?.data?.error;
      alert(msg || 'Erro ao criar etapa.');
    }
  };

  const handleEdit = async () => {
    if (!editingStage) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/timeline-stages/${editingStage.id}`, {
        label: editingStage.label,
        kind: editingStage.kind,
        active: editingStage.active
      }, { headers });

      setEditingStage(null);
      await fetchStages();
    } catch (error) {
      console.error('Erro ao editar etapa:', error);
      alert('Erro ao salvar alterações.');
    }
  };

  const toggleActive = async (stage: TimelineStage) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/timeline-stages/${stage.id}`, {
        active: !stage.active
      }, { headers });
      await fetchStages();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Carregando fluxo de sala...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Fluxo de Sala</h1>
            <p className="text-sm text-slate-600 mt-1">
              Configure a ordem e as etapas do fluxo cirúrgico. Arraste para reordenar, edite nomes ou adicione novas etapas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={saveOrder}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar Ordem'}
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg transition-all"
            >
              <Plus size={16} />
              Nova Etapa
            </button>
          </div>
        </div>
      </div>

      {/* Stages List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Nome da Etapa</div>
            <div className="col-span-2">Tipo</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-3 text-right">Ações</div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className={`px-6 py-4 hover:bg-slate-50 transition-colors ${!stage.active ? 'opacity-50' : ''}`}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Seq number + grip */}
                <div className="col-span-1 flex items-center gap-1">
                  <GripVertical size={14} className="text-slate-400" />
                  <span className="text-sm font-black text-slate-600">{stage.seq}</span>
                </div>

                {/* Label */}
                <div className="col-span-4">
                  <p className="font-bold text-slate-900">{stage.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">key: {stage.key}</p>
                </div>

                {/* Kind */}
                <div className="col-span-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    stage.kind === 'start_end'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {stage.kind === 'start_end' ? 'Início / Fim' : 'Entrada / Saída'}
                  </span>
                </div>

                {/* Active status */}
                <div className="col-span-2">
                  <button
                    onClick={() => toggleActive(stage)}
                    className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full transition-all border ${
                      stage.active
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                    title={stage.active ? 'Desabilitar etapa' : 'Habilitar etapa'}
                  >
                    {stage.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {stage.active ? 'Habilitado' : 'Desabilitado'}
                  </button>
                </div>

                {/* Actions */}
                <div className="col-span-3 flex items-center justify-end gap-1">
                  <button
                    onClick={() => moveStage(index, 'up')}
                    disabled={index === 0}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Mover para cima"
                  >
                    <ArrowUp size={16} className="text-slate-600" />
                  </button>
                  <button
                    onClick={() => moveStage(index, 'down')}
                    disabled={index === stages.length - 1}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Mover para baixo"
                  >
                    <ArrowDown size={16} className="text-slate-600" />
                  </button>
                  <button
                    onClick={() => setEditingStage({ ...stage })}
                    className="p-2 rounded-lg hover:bg-blue-50 transition-all"
                    title="Editar"
                  >
                    <Pencil size={16} className="text-blue-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {stages.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">
              Nenhuma etapa configurada. Clique em "Nova Etapa" para começar.
            </div>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
        <p className="text-sm text-blue-800 font-bold">Como funciona:</p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
          <li><strong>Início / Fim:</strong> Etapas com botões "Início" e "Fim" (ex: Cirurgia, Anestesia)</li>
          <li><strong>Entrada / Saída:</strong> Etapas com botões "Entrada" e "Saída" (ex: Paciente em SO, RPA)</li>
          <li>A ordem define a sequência obrigatória no Setup de Sala</li>
          <li>Etapas inativas não aparecem no fluxo operacional</li>
        </ul>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-900">Nova Etapa</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome da etapa *</label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Buscar Paciente"
                  value={newStage.label}
                  onChange={(e) => setNewStage({ ...newStage, label: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Chave (identificador único)</label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: buscar_paciente (gerado automaticamente se vazio)"
                  value={newStage.key}
                  onChange={(e) => setNewStage({ ...newStage, key: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">Deixe vazio para gerar automaticamente a partir do nome.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Tipo de ação</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={newStage.kind}
                  onChange={(e) => setNewStage({ ...newStage, kind: e.target.value })}
                >
                  <option value="start_end">Início / Fim</option>
                  <option value="in_out">Entrada / Saída</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAdd}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                Criar Etapa
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingStage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-900">Editar Etapa</h2>
              <button onClick={() => setEditingStage(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Chave (não editável)</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                  value={editingStage.key}
                  disabled
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome da etapa</label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={editingStage.label}
                  onChange={(e) => setEditingStage({ ...editingStage, label: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Tipo de ação</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={editingStage.kind}
                  onChange={(e) => setEditingStage({ ...editingStage, kind: e.target.value })}
                >
                  <option value="start_end">Início / Fim</option>
                  <option value="in_out">Entrada / Saída</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-600">Status:</label>
                <button
                  onClick={() => setEditingStage({ ...editingStage, active: !editingStage.active })}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                    editingStage.active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {editingStage.active ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                Salvar Alterações
              </button>
              <button
                onClick={() => setEditingStage(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
