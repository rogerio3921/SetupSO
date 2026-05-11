import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const runReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      // placeholder endpoint - backend may need implementation
      const res = await axios.get(`${API_URL}/reports?from=${from}&to=${to}`, { headers });
      setRows(res.data || []);
    } catch (err) {
      console.error('Erro ao gerar relatório', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Relatórios</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 border rounded-lg" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 border rounded-lg" />
          <button onClick={runReport} className="bg-green-600 text-white px-4 py-2 rounded-lg">Gerar</button>
          <button onClick={exportCsv} className="bg-slate-200 px-4 py-2 rounded-lg">Exportar CSV</button>
        </div>
      </div>

      {loading ? (
        <div>Gerando...</div>
      ) : (
        <div className="bg-white rounded-lg p-4 shadow">
          {rows.length === 0 ? (
            <div className="text-slate-500">Nenhum dado. Ajuste filtros e gere o relatório.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  {Object.keys(rows[0]).map(k => <th key={k} className="pb-2 pr-4">{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    {Object.values(r).map((v, j) => <td key={j} className="py-2 pr-4">{String(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
