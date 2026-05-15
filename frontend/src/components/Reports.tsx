import React, { useState } from 'react';
import { BarChart3, Download, RefreshCw, Calculator } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface MetricResult {
  id: string;
  name: string;
  description?: string | null;
  startEventKey: string;
  startAction: string;
  endEventKey: string;
  endAction: string;
  totalMinutes: number;
  averageMinutes: number;
  totalCost: number;
  count: number;
  costPerMinute: number;
  cases: Array<{
    caseId: string;
    caseCode: string;
    roomCode: string;
    patientName: string;
    procedureName: string;
    durationMinutes: number;
    cost: number;
    date: string;
  }>;
}

export default function Reports() {
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [metricsResults, setMetricsResults] = useState<MetricResult[]>([]);
  const [costPerMinute, setCostPerMinute] = useState(0);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const runReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/custom-metrics/results?from=${from}&to=${to}`, { headers });
      setMetricsResults(response.data?.metrics || []);
      setCostPerMinute(response.data?.costPerMinute || 0);
    } catch (err) {
      console.error('Erro ao gerar relatório', err);
      setMetricsResults([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!metricsResults.length) return;

    const lines: string[] = ['Métrica,Paciente,Procedimento,Sala,Data,Duração (min),Custo (R$)'];

    for (const metric of metricsResults) {
      for (const c of metric.cases) {
        lines.push(`"${metric.name}","${c.patientName}","${c.procedureName}","${c.roomCode}","${c.date}",${c.durationMinutes},${c.cost}`);
      }
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-slate-700" size={28} />
            <div>
              <h1 className="text-3xl font-black text-slate-900">Relatórios</h1>
              <p className="text-sm text-slate-600 mt-1">Análise detalhada dos indicadores personalizados por período.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">De:</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Até:</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={runReport}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Gerar
            </button>
            <button
              onClick={exportCsv}
              disabled={metricsResults.length === 0}
              className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50"
            >
              <Download size={16} />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-slate-600">Gerando relatório...</div>
      ) : metricsResults.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Calculator className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-lg font-bold text-slate-700">Nenhum dado disponível</p>
          <p className="text-sm text-slate-500 mt-2">
            Selecione o período e clique em "Gerar". Certifique-se de ter cálculos configurados em Cálculos Personalizados.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metricsResults.map((metric) => (
              <div
                key={metric.id}
                onClick={() => setExpandedMetric(expandedMetric === metric.id ? null : metric.id)}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all cursor-pointer"
              >
                <p className="text-xs font-bold text-indigo-600 uppercase">{metric.name}</p>
                {metric.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{metric.description}</p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-black text-slate-900">{metric.averageMinutes} min</p>
                    <p className="text-xs text-slate-500">média/caso</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-700">{metric.totalMinutes} min</p>
                    <p className="text-xs text-slate-500">total acumulado</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-lg font-black text-red-600">R$ {formatCurrency(metric.totalCost)}</p>
                    <p className="text-xs text-slate-500">custo total</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-600">{metric.count}</p>
                    <p className="text-xs text-slate-500">casos analisados</p>
                  </div>
                </div>
                <p className="text-xs text-indigo-500 font-bold mt-3 text-center">
                  {expandedMetric === metric.id ? '▲ Fechar detalhes' : '▼ Ver detalhes por caso'}
                </p>
              </div>
            ))}
          </div>

          {/* Expanded Detail Table */}
          {expandedMetric && (() => {
            const metric = metricsResults.find((m) => m.id === expandedMetric);
            if (!metric) return null;
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{metric.name} — Detalhamento</h3>
                    <p className="text-xs text-slate-500">
                      Período: {from} a {to} • {metric.cases.length} ocorrências • Custo/min: R$ {costPerMinute.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-600">Total acumulado</p>
                    <p className="text-xl font-black text-red-600">R$ {formatCurrency(metric.totalCost)}</p>
                  </div>
                </div>

                {metric.cases.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">Nenhuma ocorrência no período selecionado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="text-left py-2 px-2 font-bold text-slate-600">#</th>
                          <th className="text-left py-2 px-2 font-bold text-slate-600">Data</th>
                          <th className="text-left py-2 px-2 font-bold text-slate-600">Paciente</th>
                          <th className="text-left py-2 px-2 font-bold text-slate-600">Procedimento</th>
                          <th className="text-left py-2 px-2 font-bold text-slate-600">Sala</th>
                          <th className="text-right py-2 px-2 font-bold text-slate-600">Duração</th>
                          <th className="text-right py-2 px-2 font-bold text-slate-600">Custo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metric.cases.map((c, index) => (
                          <tr key={c.caseId} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-2 text-slate-500">{index + 1}</td>
                            <td className="py-2 px-2 text-slate-700">{c.date}</td>
                            <td className="py-2 px-2 font-bold text-slate-900">{c.patientName}</td>
                            <td className="py-2 px-2 text-slate-700">{c.procedureName}</td>
                            <td className="py-2 px-2 text-slate-600">{c.roomCode}</td>
                            <td className="py-2 px-2 text-right font-bold text-slate-900">{c.durationMinutes} min</td>
                            <td className="py-2 px-2 text-right font-black text-red-600">R$ {formatCurrency(c.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 bg-slate-50">
                          <td colSpan={5} className="py-3 px-2 font-black text-slate-900">TOTAL</td>
                          <td className="py-3 px-2 text-right font-black text-slate-900">{metric.totalMinutes} min</td>
                          <td className="py-3 px-2 text-right font-black text-red-700">R$ {formatCurrency(metric.totalCost)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
