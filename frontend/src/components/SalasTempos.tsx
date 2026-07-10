import React, { useEffect, useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface CaseWithEvents {
  id: string;
  roomId: string;
  code: string;
  status: string;
  patientFullName?: string | null;
  procedureName?: string | null;
  surgeonName?: string | null;
  plannedSurgeryTime?: string | null;
  createdAt: string;
  events: Array<{
    id: string;
    eventKey: string;
    action: string;
    happenedAt: string;
    auto: boolean;
  }>;
  room?: { id: string; code: string; name: string };
}

export default function SalasTempos() {
  const [cases, setCases] = useState<CaseWithEvents[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [casesRes, roomsRes] = await Promise.all([
        axios.get(`${API_URL}/cases`, { headers }),
        axios.get(`${API_URL}/rooms`, { headers })
      ]);

      const allCases: CaseWithEvents[] = casesRes.data || [];
      // Filter by date
      const filtered = allCases.filter((c) => {
        const caseDate = c.createdAt.slice(0, 10);
        return caseDate === filterDate;
      });

      setCases(filtered);
      setRooms(roomsRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getDuration = (events: any[], startKey: string, startAction: string, endKey: string, endAction: string) => {
    const startEvent = events.find((e) => e.eventKey === startKey && e.action === startAction);
    const endEvent = events.find((e) => e.eventKey === endKey && e.action === endAction);
    if (!startEvent || !endEvent) return null;
    const ms = new Date(endEvent.happenedAt).getTime() - new Date(startEvent.happenedAt).getTime();
    if (ms <= 0) return null;
    const secs = Math.floor(ms / 1000);
    return `${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  };

  // Group cases by room
  const casesByRoom = new Map<string, CaseWithEvents[]>();
  rooms.forEach((room) => {
    const roomCases = cases.filter((c) => c.roomId === room.id);
    if (roomCases.length > 0) {
      casesByRoom.set(room.id, roomCases);
    }
  });

  const stageConfig = [
    { key: 'transport_patient', label: 'TRANSPORTE', kind: 'start_end' },
    { key: 'admission_cc', label: 'ADMISSÃO PRÉ CC', kind: 'in_out' },
    { key: 'patient_in_or', label: 'PACIENTE EM SO', kind: 'in_out' },
    { key: 'anesthesia', label: 'ANESTESIA', kind: 'start_end' },
    { key: 'positioning', label: 'POSICIONAMENTO', kind: 'start_end' },
    { key: 'time_out', label: 'TIME OUT', kind: 'start_end' },
    { key: 'surgery', label: 'CIRURGIA', kind: 'start_end' },
    { key: 'cme', label: 'CME', kind: 'in_out' },
    { key: 'cleaning', label: 'LIMPEZA', kind: 'in_out' },
    { key: 'pharmacy', label: 'FARMÁCIA', kind: 'in_out' },
    { key: 'clinical_engineering', label: 'ENG. CLÍNICA', kind: 'in_out' },
    { key: 'rpa', label: 'RPA', kind: 'in_out' },
    { key: 'room_setup', label: 'MONTAGEM SALA', kind: 'start_end' },
    { key: 'anesthesia_team', label: 'EQUIPE ANESTESIA', kind: 'in_out' },
    { key: 'surgical_team', label: 'EQUIPE CIRÚRGICA', kind: 'in_out' },
  ];

  if (loading) return <div className="text-center py-12 text-slate-600">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="text-slate-700" size={28} />
            <div>
              <h1 className="text-3xl font-black text-slate-900">Salas - Tempos</h1>
              <p className="text-sm text-slate-600 mt-1">Histórico completo dos tempos e movimentos por sala e paciente.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-600">Data:</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {casesByRoom.size === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Clock className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-lg font-bold text-slate-700">Nenhum registro para esta data</p>
          <p className="text-sm text-slate-500 mt-2">Selecione outro dia ou aguarde os registros do dia atual.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => {
            const roomCases = casesByRoom.get(room.id);
            if (!roomCases || roomCases.length === 0) return null;

            return (
              <div key={room.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Room Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-3">
                  <p className="text-lg font-black">{room.code} — {room.name}</p>
                  <p className="text-xs text-slate-300">{roomCases.length} caso(s) no dia {new Date(filterDate).toLocaleDateString('pt-BR')}</p>
                </div>

                {/* Cases */}
                <div className="divide-y divide-slate-100">
                  {roomCases.map((caseItem) => {
                    const isExpanded = expandedCase === caseItem.id;
                    const events = caseItem.events || [];
                    const totalDuration = getDuration(events, 'transport_patient', 'start', 'patient_in_or', 'out')
                      || getDuration(events, 'transport_patient', 'start', 'surgery', 'end');

                    return (
                      <div key={caseItem.id}>
                        {/* Case summary row */}
                        <div
                          className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => setExpandedCase(isExpanded ? null : caseItem.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-black text-slate-900 uppercase">{caseItem.patientFullName || '—'}</p>
                              <p className="text-xs text-slate-500">
                                {caseItem.procedureName || '—'} • {caseItem.surgeonName || '—'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-900">{totalDuration || '—'}</p>
                              <p className="text-[10px] text-slate-500">TEMPO TOTAL</p>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                              caseItem.status === 'closed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {caseItem.status === 'closed' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
                            </span>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-5 pb-4 bg-slate-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {stageConfig.map((stage) => {
                                const startAction = stage.kind === 'start_end' ? 'start' : 'in';
                                const endAction = stage.kind === 'start_end' ? 'end' : 'out';
                                const startEvent = events.find((e) => e.eventKey === stage.key && e.action === startAction);
                                const endEvent = events.find((e) => e.eventKey === stage.key && e.action === endAction);
                                const duration = getDuration(events, stage.key, startAction, stage.key, endAction);

                                if (!startEvent && !endEvent) return null;

                                return (
                                  <div key={stage.key} className="bg-white rounded-lg border border-slate-200 p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-xs font-black text-slate-700">{stage.label}</p>
                                      {duration && (
                                        <span className="text-xs font-black bg-slate-800 text-white px-2 py-0.5 rounded-full">{duration}</span>
                                      )}
                                    </div>
                                    <div className="flex gap-3 text-[11px] text-slate-500">
                                      <span>{startAction === 'start' ? 'Início' : 'Entrada'}: <strong>{formatTime(startEvent?.happenedAt)}</strong></span>
                                      <span>{endAction === 'end' ? 'Fim' : 'Saída'}: <strong>{formatTime(endEvent?.happenedAt)}</strong></span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
