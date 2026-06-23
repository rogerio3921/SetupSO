import React, { useEffect, useState } from 'react';
import { Save, DollarSign, Settings } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function ConfigCC() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/cc-config`, { headers });
      setConfig(response.data || {});
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/cc-config`, config, { headers });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Carregando configurações...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center gap-3">
          <Settings className="text-slate-700" size={28} />
          <div>
            <h1 className="text-3xl font-black text-slate-900">Configurações do CC</h1>
            <p className="text-sm text-slate-600 mt-1">
              Defina os custos operacionais do Centro Cirúrgico para cálculos financeiros no Dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Cost Configuration */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="text-green-600" size={22} />
          <h2 className="text-xl font-black text-slate-900">Custos Operacionais</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Custo por minuto */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">
              Custo por minuto do CC (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-bold"
                placeholder="0.00"
                value={config.cost_per_minute || ''}
                onChange={(e) => updateField('cost_per_minute', e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-500">
              Valor usado para calcular o custo de cada etapa e o prejuízo com atrasos.
            </p>
          </div>

          {/* Custo por hora (calculado) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">
              Custo por hora (calculado)
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <p className="text-2xl font-black text-slate-900">
                R$ {((parseFloat(config.cost_per_minute || '0') || 0) * 60).toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">= custo/min × 60</p>
            </div>
          </div>

          {/* Meta de ocupação */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">
              Meta de ocupação diária (horas)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-bold"
              placeholder="8"
              value={config.target_hours_per_day || ''}
              onChange={(e) => updateField('target_hours_per_day', e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Horas esperadas de operação por sala/dia.
            </p>
          </div>

          {/* Tolerância de atraso */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">
              Tolerância de atraso (minutos)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-bold"
              placeholder="15"
              value={config.delay_tolerance_minutes || ''}
              onChange={(e) => updateField('delay_tolerance_minutes', e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Minutos de tolerância antes de considerar como atraso.
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg transition-all disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
          {saved && (
            <span className="text-sm font-bold text-green-600 animate-pulse">
              ✓ Salvo com sucesso!
            </span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <h3 className="text-lg font-black mb-4">Prévia dos cálculos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-white/70">Se atraso de 30 min</p>
            <p className="text-2xl font-black text-red-400">
              R$ {((parseFloat(config.cost_per_minute || '0') || 0) * 30).toFixed(2)}
            </p>
            <p className="text-xs text-white/50 mt-1">prejuízo estimado</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-white/70">Cirurgia de 2h</p>
            <p className="text-2xl font-black text-amber-400">
              R$ {((parseFloat(config.cost_per_minute || '0') || 0) * 120).toFixed(2)}
            </p>
            <p className="text-xs text-white/50 mt-1">custo operacional</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-white/70">Dia completo ({config.target_hours_per_day || '8'}h)</p>
            <p className="text-2xl font-black text-green-400">
              R$ {((parseFloat(config.cost_per_minute || '0') || 0) * (parseFloat(config.target_hours_per_day || '8') || 8) * 60).toFixed(2)}
            </p>
            <p className="text-xs text-white/50 mt-1">custo total/sala/dia</p>
          </div>
        </div>
      </div>

      {/* Reset Data */}
      <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-lg font-black text-red-900">Zona de Perigo</h3>
            <p className="text-sm text-red-700">Ações irreversíveis</p>
          </div>
        </div>
        <p className="text-sm text-red-800 mb-4">
          Zerar todos os dados operacionais (casos, eventos, agendamentos). Pacientes e salas serão mantidos mas resetados para status inicial.
        </p>
        <button
          onClick={async () => {
            if (!window.confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os casos, eventos e agendamentos. Os pacientes voltarão ao status "aguardando". Esta ação NÃO pode ser desfeita. Continuar?')) return;
            if (!window.confirm('Tem CERTEZA ABSOLUTA? Digite OK para confirmar.')) return;
            try {
              const token = localStorage.getItem('token');
              const headers = { Authorization: `Bearer ${token}` };
              await axios.post(`${API_URL}/admin/reset-data`, {}, { headers });
              alert('✓ Dados zerados com sucesso! Todos os casos e eventos foram removidos.');
            } catch (error) {
              alert('Erro ao zerar dados.');
              console.error(error);
            }
          }}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-lg transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Zerar Todos os Dados
        </button>
      </div>
    </div>
  );
}
