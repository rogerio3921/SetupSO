import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Calculator, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface TimelineStageOption {
  key: string;
  label: string;
  kind: string;
}

interface CustomMetric {
  id: string;
  name: string;
  description?: string | null;
  startEventKey: string;
  startAction: string;
  endEventKey: string;
  endAction: string;
  showOnDashboard: boolean;
  showOnReport: boolean;
  active: boolean;
  isDefault: boolean;
  order: number;
}

const defaultStages: TimelineStageOption[] = [
  { key: 'anesthesia_team', label: 'Equipe anestésica', kind: 'in_out' },
  { key: 'surgical_team', label: 'Equipe cirúrgica', kind: 'in_out' },
  { key: 'transport_patient', label: 'Transporte paciente', kind: 'start_end' },
  { key: 'admission_cc', label: 'Admissão no Pré CC', kind: 'in_out' },
  { key: 'patient_in_or', label: 'Paciente em SO', kind: 'in_out' },
  { key: 'anesthesia', label: 'Anestesia', kind: 'start_end' },
  { key: 'positioning', label: 'Posicionamento', kind: 'start_end' },
  { key: 'time_out', label: 'Time out', kind: 'start_end' },
  { key: 'surgery', label: 'Cirurgia', kind: 'start_end' },
  { key: 'cme', label: 'CME', kind: 'in_out' },
  { key: 'cleaning', label: 'Limpeza', kind: 'in_out' },
  { key: 'pharmacy', label: 'Farmácia', kind: 'in_out' },
  { key: 'clinical_engineering', label: 'Eng. clínica', kind: 'in_out' },
  { key: 'rpa', label: 'RPA', kind: 'in_out' },
  { key: 'room_setup', label: 'Montagem de Sala', kind: 'start_end' },
];

export default function CustomMetrics() {
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [stages, setStages] = useState<TimelineStageOption[]>(defaultStages);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<CustomMetric | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    startEventKey: '',
    startAction: '',
    endEventKey: '',
    endAction: '',
    showOnDashboard: true,
    showOnReport: true
  });

  useEffect(() => {
    fetchMetrics();
    fetchStages();
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/custom-metrics`, { headers });
      setMetrics(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/timeline-stages`, { headers });
      if (response.data && response.data.length > 0) {
        setStages(response.data.filter((s: any) => s.active));
      }
    } catch {
      // Use defaults
    }
  };

  const getActionsForStage = (stageKey: string) => {
    const stage = stages.find((s) => s.key === stageKey);
    if (!stage) return [];
    if (stage.kind === 'start_end') {
      return [{ value: 'start', label: 'Início' }, { value: 'end', label: 'Fim' }];
    }
    return [{ value: 'in', label: 'Entrada' }, { value: 'out', label: 'Saída' }];
  };

  const getStageName = (key: string) => {
    return stages.find((s) => s.key === key)?.label || key;
  };

  const getActionName = (stageKey: string, action: string) => {
    const stage = stages.find((s) => s.key === stageKey);
    if (!stage) return action;
    if (stage.kind === 'start_end') {
      return action === 'start' ? 'Início' : 'Fim';
    }
    return action === 'in' ? 'Entrada' : 'Saída';
  };

  const openAddModal = () => {
    setEditingMetric(null);
    setForm({
      name: '',
      description: '',
      startEventKey: '',
      startAction: '',
      endEventKey: '',
      endAction: '',
      showOnDashboard: true,
      showOnReport: true
    });
    setShowModal(true);
  };

  const openEditModal = (metric: CustomMetric) => {
    setEditingMetric(metric);
    setForm({
      name: metric.name,
      description: metric.description || '',
      startEventKey: metric.startEventKey,
      startAction: metric.startAction,
      endEventKey: metric.endEventKey,
      endAction: metric.endAction,
      showOnDashboard: metric.showOnDashboard,
      showOnReport: metric.showOnReport
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.startEventKey || !form.startAction || !form.endEventKey || !form.endAction) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingMetric) {
        await axios.patch(`${API_URL}/custom-metrics/${editingMetric.id}`, form, { headers });
      } else {
        await axios.post(`${API_URL}/custom-metrics`, form, { headers });
      }

      setShowModal(false);
      await fetchMetrics();
    } catch (error) {
      console.error('Erro ao salvar métrica:', error);
      alert('Erro ao salvar o cálculo.');
    }
  };

  const handleDelete = async (metric: CustomMetric) => {
    if (!window.confirm(`Excluir o cálculo "${metric.name}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/custom-metrics/${metric.id}`, { headers });
      await fetchMetrics();
    } catch (error) {
      console.error('Erro ao excluir métrica:', error);
    }
  };

  const toggleDashboard = async (metric: CustomMetric) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/custom-metrics/${metric.id}`, {
        showOnDashboard: !metric.showOnDashboard
      }, { headers });
      await fetchMetrics();
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Carregando cálculos...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calculator className="text-indigo-600" size={28} />
            <div>
              <h1 className="text-3xl font-black text-slate-900">Cálculos Personalizados</h1>
              <p className="text-sm text-slate-600 mt-1">
                Crie métricas customizadas medindo o tempo entre dois pontos do fluxo cirúrgico.
              </p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg transition-all"
          >
            <Plus size={16} />
            Novo Cálculo
          </button>
        </div>
      </div>

      {/* Metrics List */}
      {metrics.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Calculator className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-lg font-bold text-slate-700">Nenhum cálculo configurado</p>
          <p className="text-sm text-slate-500 mt-2">
            Crie seu primeiro cálculo para medir tempos entre etapas do fluxo.
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg"
          >
            <Plus size={16} />
            Criar primeiro cálculo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all ${metric.isDefault ? 'border-slate-200' : 'border-indigo-200'}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-slate-900">{metric.name}</h3>
                    {metric.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Fixo</span>
                    )}
                    {!metric.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Personalizado</span>
                    )}
                    {metric.showOnDashboard && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Dashboard</span>
                    )}
                    {metric.showOnReport && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Relatório</span>
                    )}
                  </div>
                  {metric.description && (
                    <p className="text-sm text-slate-500 mt-1">{metric.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold text-xs">
                      {getStageName(metric.startEventKey)} → {getActionName(metric.startEventKey, metric.startAction)}
                    </span>
                    <span className="text-slate-400 font-bold">até</span>
                    <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded font-bold text-xs">
                      {getStageName(metric.endEventKey)} → {getActionName(metric.endEventKey, metric.endAction)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleDashboard(metric)}
                    className={`p-2 rounded-lg transition-all ${metric.showOnDashboard ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    title={metric.showOnDashboard ? 'Visível no Dashboard' : 'Oculto no Dashboard'}
                  >
                    {metric.showOnDashboard ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => openEditModal(metric)}
                    className="p-2 rounded-lg hover:bg-blue-50 transition-all"
                    title="Editar"
                  >
                    <Pencil size={18} className="text-blue-600" />
                  </button>
                  {!metric.isDefault && (
                    <button
                      onClick={() => handleDelete(metric)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-200">
        <p className="text-sm text-indigo-800 font-bold mb-2">Como funciona:</p>
        <ul className="text-sm text-indigo-700 space-y-1 list-disc list-inside">
          <li><strong>Fixos (10):</strong> Cálculos pré-configurados que já vêm prontos. Você pode ativar/desativar e editar a visibilidade.</li>
          <li><strong>Personalizados:</strong> Crie quantos quiser. Escolha ponto de início e fim do fluxo.</li>
          <li><strong>Início / Fim:</strong> Etapas com "Início" e "Fim" (ex: Cirurgia)</li>
          <li><strong>Entrada / Saída:</strong> Etapas com "Entrada" e "Saída" (ex: Paciente em SO)</li>
          <li>O sistema calcula automaticamente o tempo entre os dois pontos para cada caso</li>
          <li>No <strong>Dashboard</strong> aparece a média e o custo total</li>
          <li>No <strong>Relatório</strong> aparece o detalhamento por caso com custo — ideal para conversar com médicos sobre atrasos</li>
        </ul>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-slate-900">
                {editingMetric ? 'Editar Cálculo' : 'Novo Cálculo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome do cálculo *</label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: Atraso do Médico"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Descrição (opcional)</label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: Tempo entre entrada do paciente e entrada do médico"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Start point */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-xs font-black text-blue-800 mb-2">PONTO DE INÍCIO (de onde começa a contar)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Etapa</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      value={form.startEventKey}
                      onChange={(e) => setForm({ ...form, startEventKey: e.target.value, startAction: '' })}
                    >
                      <option value="">— selecione —</option>
                      {stages.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Momento</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      value={form.startAction}
                      onChange={(e) => setForm({ ...form, startAction: e.target.value })}
                      disabled={!form.startEventKey}
                    >
                      <option value="">— selecione —</option>
                      {getActionsForStage(form.startEventKey).map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* End point */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <p className="text-xs font-black text-purple-800 mb-2">PONTO FINAL (até onde medir)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Etapa</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      value={form.endEventKey}
                      onChange={(e) => setForm({ ...form, endEventKey: e.target.value, endAction: '' })}
                    >
                      <option value="">— selecione —</option>
                      {stages.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Momento</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      value={form.endAction}
                      onChange={(e) => setForm({ ...form, endAction: e.target.value })}
                      disabled={!form.endEventKey}
                    >
                      <option value="">— selecione —</option>
                      {getActionsForStage(form.endEventKey).map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {form.startEventKey && form.startAction && form.endEventKey && form.endAction && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-xs text-slate-500">Prévia do cálculo:</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    Tempo entre <span className="text-blue-600">{getStageName(form.startEventKey)} ({getActionName(form.startEventKey, form.startAction)})</span>
                    {' '}e <span className="text-purple-600">{getStageName(form.endEventKey)} ({getActionName(form.endEventKey, form.endAction)})</span>
                  </p>
                </div>
              )}

              {/* Visibility options */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showOnDashboard}
                    onChange={(e) => setForm({ ...form, showOnDashboard: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-bold text-slate-700">Mostrar no Dashboard</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showOnReport}
                    onChange={(e) => setForm({ ...form, showOnReport: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-bold text-slate-700">Mostrar no Relatório</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                {editingMetric ? 'Salvar Alterações' : 'Criar Cálculo'}
              </button>
              <button
                onClick={() => setShowModal(false)}
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
