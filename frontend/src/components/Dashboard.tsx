import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Zap, AlertCircle, Plus, X, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface DashboardProps {
  onOpenSetupSala?: (roomId: string) => void;
}

interface DashboardSummary {
  totalCases: number;
  completedCases: number;
  activeCases: number;
  inPrepCases: number;
  plannedCount: number;
  averageTransportToOrMs: number | null;
  averageOrMs: number | null;
  averageAnesthesiaMs: number | null;
  averageSurgeryMs: number | null;
  averageRpaMs: number | null;
  averageTotalCcMs: number | null;
  averagePatientDelayMs: number | null;
  averageAnesthesiaTeamDelayMs: number | null;
  averageSurgeryTeamDelayMs: number | null;
}

interface KPIData {
  totalSurgeries: number;
  averageTransportToOrMs: number | null;
  averageOrMs: number | null;
  averageAnesthesiaMs: number | null;
  averageSurgeryMs: number | null;
  averageRpaMs: number | null;
  averageTotalCcMs: number | null;
  averagePatientDelayMs: number | null;
  averageAnesthesiaTeamDelayMs: number | null;
  averageSurgeryTeamDelayMs: number | null;
  roomsInUse: number;
  roomsInPrep: number;
  plannedCount: number;
}

interface RoomTimes {
  transportStart?: string;
  transportEnd?: string;
  patientEntryRoom?: string;
  anesthesiaStart?: string;
  positioningStart?: string;
  positioningEnd?: string;
  timeoutStart?: string;
  timeoutEnd?: string;
  surgeryStart?: string;
  surgeryEnd?: string;
  patientExitRoom?: string;
  cmeEntry?: string;
  cmeExit?: string;
  cleaningEntry?: string;
  cleaningExit?: string;
  pharmacyEntry?: string;
  pharmacyExit?: string;
  engEntry?: string;
  engExit?: string;
  anesthesiaEnd?: string;
  mountingStart?: string;
  mountingEnd?: string;
  anesthesiaTeamArrival?: string;
  surgicalTeamArrival?: string;
}

type TimelineActionKey = 'start' | 'end' | 'in' | 'out';

interface TimelineStage {
  key: string;
  label: string;
  kind: 'start_end' | 'in_out';
  actions: Array<{ label: string; action: TimelineActionKey }>;
}

export default function Dashboard({ onOpenSetupSala }: DashboardProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [kpiData, setKpiData] = useState<KPIData>({
    totalSurgeries: 0,
    averageTransportToOrMs: null,
    averageOrMs: null,
    averageAnesthesiaMs: null,
    averageSurgeryMs: null,
    averageRpaMs: null,
    averageTotalCcMs: null,
    averagePatientDelayMs: null,
    averageAnesthesiaTeamDelayMs: null,
    averageSurgeryTeamDelayMs: null,
    roomsInUse: 0,
    roomsInPrep: 0,
    plannedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [roomTimes, setRoomTimes] = useState<RoomTimes>({});
  const [expandedCaseEvents, setExpandedCaseEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [roomsRes, casesRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/rooms`, { headers }),
        axios.get(`${API_URL}/cases`, { headers }),
        axios.get(`${API_URL}/dashboard/summary`, { headers })
      ]);

      setRooms(roomsRes.data);
      setCases(casesRes.data);

      setKpiData({
        totalSurgeries: summaryRes.data.completedCases || summaryRes.data.totalCases || 0,
        averageTransportToOrMs: summaryRes.data.averageTransportToOrMs ?? null,
        averageOrMs: summaryRes.data.averageOrMs ?? null,
        averageAnesthesiaMs: summaryRes.data.averageAnesthesiaMs ?? null,
        averageSurgeryMs: summaryRes.data.averageSurgeryMs ?? null,
        averageRpaMs: summaryRes.data.averageRpaMs ?? null,
        averageTotalCcMs: summaryRes.data.averageTotalCcMs ?? null,
        averagePatientDelayMs: summaryRes.data.averagePatientDelayMs ?? null,
        averageAnesthesiaTeamDelayMs: summaryRes.data.averageAnesthesiaTeamDelayMs ?? null,
        averageSurgeryTeamDelayMs: summaryRes.data.averageSurgeryTeamDelayMs ?? null,
        roomsInUse: summaryRes.data.activeCases || 0,
        roomsInPrep: summaryRes.data.inPrepCases || 0,
        plannedCount: summaryRes.data.plannedCount || 0,
      });

      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setLoading(false);
    }
  };

  const handleExpandRoom = (roomId: string) => {
    setExpandedRoomId(roomId);
  };

  const handleCloseExpanded = () => {
    setExpandedRoomId(null);
    setExpandedCaseEvents([]);
  };

  const timelineStages: TimelineStage[] = [
    { key: 'transport_patient', label: 'Transporte do paciente', kind: 'start_end', actions: [{ label: 'Início', action: 'start' }, { label: 'Fim', action: 'end' }] },
    { key: 'patient_in_or', label: 'Paciente em SO', kind: 'in_out', actions: [{ label: 'Entrada', action: 'in' }, { label: 'Saída', action: 'out' }] },
    { key: 'anesthesia', label: 'Anestesia', kind: 'start_end', actions: [{ label: 'Início', action: 'start' }, { label: 'Fim', action: 'end' }] },
    { key: 'positioning', label: 'Posicionamento', kind: 'start_end', actions: [{ label: 'Início', action: 'start' }, { label: 'Fim', action: 'end' }] },
    { key: 'time_out', label: 'Time out', kind: 'start_end', actions: [{ label: 'Início', action: 'start' }, { label: 'Fim', action: 'end' }] },
    { key: 'surgery', label: 'Cirurgia', kind: 'start_end', actions: [{ label: 'Início', action: 'start' }, { label: 'Fim', action: 'end' }] },
    { key: 'rpa', label: 'RPA', kind: 'in_out', actions: [{ label: 'Entrada', action: 'in' }, { label: 'Saída', action: 'out' }] },
    { key: 'anesthesia_team', label: 'Equipe anestesia', kind: 'in_out', actions: [{ label: 'Entrada', action: 'in' }, { label: 'Saída', action: 'out' }] },
    { key: 'surgical_team', label: 'Equipe cirúrgica', kind: 'in_out', actions: [{ label: 'Entrada', action: 'in' }, { label: 'Saída', action: 'out' }] },
  ];

  const formatEventTime = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStageEvents = (caseId?: string | null, stageKey?: string) => {
    if (!caseId || !stageKey) return [];
    return expandedCaseEvents
      .filter((event) => event.caseId === caseId && event.eventKey === stageKey)
      .sort((a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime());
  };

  const getStageStatus = (stage: TimelineStage, events: any[]) => {
    const startAction = stage.kind === 'start_end' ? 'start' : 'in';
    const endAction = stage.kind === 'start_end' ? 'end' : 'out';
    const hasStart = events.some((event) => event.action === startAction);
    const hasEnd = events.some((event) => event.action === endAction);

    if (hasStart && hasEnd) return 'done';
    if (hasStart) return 'active';
    return 'pending';
  };

  const statusClasses = (status: 'done' | 'active' | 'pending') => {
    if (status === 'done') return { badge: 'bg-green-100 text-green-700', border: 'border-green-300 bg-green-50', dot: 'bg-green-500 border-green-500' };
    if (status === 'active') return { badge: 'bg-amber-100 text-amber-700', border: 'border-amber-300 bg-amber-50', dot: 'bg-amber-500 border-amber-500' };
    return { badge: 'bg-slate-100 text-slate-600', border: 'border-slate-200 bg-white', dot: 'bg-white border-slate-300' };
  };

  useEffect(() => {
    if (!expandedRoomId) {
      setExpandedCaseEvents([]);
      return;
    }

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const expandedCase = cases.find((item) => item.roomId === expandedRoomId);

    if (!expandedCase?.id) {
      setExpandedCaseEvents([]);
      return;
    }

    let cancelled = false;

    const loadEvents = async () => {
      try {
        const response = await axios.get(`${API_URL}/cases/${expandedCase.id}/events`, { headers });
        if (!cancelled) {
          setExpandedCaseEvents(response.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar eventos do caso expandido:', error);
          setExpandedCaseEvents([]);
        }
      }
    };

    loadEvents();
    const interval = setInterval(loadEvents, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [expandedRoomId, cases]);

  const formatMs = (ms: number | null) => {
    if (ms === null || ms === undefined || Number.isNaN(ms)) return '—';
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  const expandedRoom = rooms.find(r => r.id === expandedRoomId);
  const expandedCase = cases.find(c => c.roomId === expandedRoomId);

  // Se está em modo expandido, mostrar detalhes
  if (expandedRoomId && expandedRoom) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header Expandido */}
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={handleCloseExpanded}
            className="text-slate-600 hover:text-slate-900"
          >
            <X size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Dashboard - {expandedRoom.code}</h1>
            <p className="text-xs text-slate-500">Visão em tempo real do caso ativo e suas durações.</p>
          </div>
        </div>

        {/* Layout: Card + Tempos */}
        <div className="grid grid-cols-12 gap-6">
          {/* Coluna Esquerda: Card da Sala */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-gradient-to-br from-[#0b2a4a] via-[#0f3c6e] to-[#134e91] text-white rounded-2xl p-6 border border-white/10 shadow-lg">
              <p className="text-xl font-bold text-slate-900 mb-2">{expandedRoom.code} - {expandedRoom.name}</p>

              {onOpenSetupSala && (
                <button
                  type="button"
                  onClick={() => onOpenSetupSala(expandedRoom.id)}
                  className="mb-4 w-full bg-white text-slate-900 font-black py-2 px-4 rounded-full transition-all"
                >
                  Iniciar cirurgia nesta sala
                </button>
              )}
              
              {expandedCase ? (
                <>
                  <div className="mb-4">
                    <p className="text-xs text-white/75 font-black uppercase tracking-wide">CIRURGIÃO</p>
                    <p className="text-lg font-bold text-white">{expandedCase.surgeon || 'N/A'}</p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-xs text-white/75 font-black uppercase tracking-wide">PACIENTE</p>
                    <p className="text-lg font-bold text-white">{expandedCase.patientFullName || 'N/A'}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-white/75 font-black uppercase tracking-wide">PROCEDIMENTO</p>
                    <p className="text-lg font-bold text-white">{expandedCase.procedureName || 'N/A'}</p>
                  </div>

                  <div className="mb-4 p-3 bg-white/10 rounded-xl border border-white/15">
                    <p className="text-xs text-white/70">STATUS</p>
                    <p className="text-lg font-black text-white">{expandedCase.status || 'LIBERADO'}</p>
                  </div>

                  {expandedCase.delayReason && (
                    <div className="mb-4 p-3 bg-amber-500/20 rounded-xl border border-amber-300/20">
                      <p className="text-xs text-slate-500">JUSTIFICATIVA DE ATRASO</p>
                      <p className="text-sm font-bold text-white">{expandedCase.delayReason}</p>
                    </div>
                  )}

                  {/* Tempos Totais */}
                  <div className="space-y-3 mt-6">
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                      <p className="text-xs text-white/70">TEMPO TOTAL DA SALA</p>
                      <p className="text-2xl font-black text-white">03h45</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                      <p className="text-xs text-white/70">MÉDIA TOTAL DE SALA</p>
                      <p className="text-2xl font-black text-white">03h15</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                      <p className="text-xs text-white/70">INTERVALO ENTRE CIRURGIAS</p>
                      <p className="text-2xl font-black text-white">00h26</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-white/80 italic">Sala disponível</p>
              )}
            </div>
          </div>

          {/* Coluna Direita: Grid de Tempos e Movimentos */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">SETUP DE SALA – TEMPOS E MOVIMENTOS</h2>
                  <p className="text-xs text-slate-500">Linha do tempo e cartões de ações da sala atual.</p>
                </div>
                <span className="text-xs font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600">Tempo real</span>
              </div>
              
              {/* Grid 3x5 de Tempos */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Linha 1: Transporte */}
                <TimeCard label="TRANSPORTE" fields={['PACIENTE INICIO / FIM']} />
                
                {/* Linha 2: Paciente em SO */}
                <TimeCard label="PACIENTE EM SO" fields={['ENTRADA / SAÍDA']} />
                
                {/* Linha 3: Anestesia */}
                <TimeCard label="ANESTESIA" fields={['INICIO / FIM']} />

                {/* Linha 4: Posicionamento */}
                <TimeCard label="POSICIONAMENTO" fields={['O INICIO / FIM']} />
                
                {/* Linha 5: Time Out */}
                <TimeCard label="TIME OUT" fields={['INICIO / FIM']} />
                
                {/* Linha 6: Cirurgia */}
                <TimeCard label="CIRURGIA" fields={['INICIO / FIM']} />

                {/* Linha 7: CME */}
                <TimeCard label="CHAMAR CME" fields={['ENTRADA / SAÍDA']} />
                
                {/* Linha 8: Limpeza */}
                <TimeCard label="CHAMAR LIMPEZA" fields={['ENTRADA / SAÍDA']} />
                
                {/* Linha 9: Farmácia */}
                <TimeCard label="CHAMAR FARMÁCIA" fields={['ENTRADA / SAÍDA']} />

                {/* Linha 10: Eng Clínica */}
                <TimeCard label="CHAMAR ENG CLINICA" fields={['ENTRADA / SAÍDA']} />
                
                {/* Linha 11: Montagem */}
                <TimeCard label="MONTAGEM SALA" fields={['INICIO / FIM']} />
                
                {/* Linha 12: Equipes */}
                <TimeCard label="EQUIPE ANESTESIA" fields={['CHEGADA']} />

                {/* Extras para grid completo */}
                <TimeCard label="EQUIPE CIRÚRGICA" fields={['ENTRADA / SAÍDA']} />
                <TimeCard label="EQUIPAMENTO" fields={['ENTRADA / SAÍDA']} />
                <TimeCard label="LIMPEZA FINAL" fields={['ENTRADA / SAÍDA']} />
              </div>

              <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">Linha do tempo da execução</p>
                    <p className="text-xs text-slate-500">Estado por etapa para a sala expandida.</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                    {expandedCaseEvents.length} eventos
                  </span>
                </div>

                <div className="space-y-3">
                  {timelineStages.map((stage, index) => {
                    const stageEvents = getStageEvents(expandedCase.id, stage.key);
                    const status = getStageStatus(stage, stageEvents);
                    const classes = statusClasses(status);
                    const startAction = stage.kind === 'start_end' ? 'start' : 'in';
                    const endAction = stage.kind === 'start_end' ? 'end' : 'out';

                    return (
                      <div key={stage.key} className={`relative rounded-xl border p-4 ${classes.border}`}>
                        {index < timelineStages.length - 1 && <div className="absolute left-6 top-12 bottom-0 w-px bg-slate-200" />}

                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between relative z-10">
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 h-4 w-4 rounded-full border-2 ${classes.dot}`} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-black text-slate-900">{stage.label}</p>
                                <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${classes.badge}`}>
                                  {status === 'done' ? 'Concluída' : status === 'active' ? 'Em andamento' : 'Pendente'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Início: {formatEventTime(stageEvents.find((event) => event.action === startAction)?.happenedAt)}
                                {stage.kind === 'start_end'
                                  ? ` • Fim: ${formatEventTime(stageEvents.find((event) => event.action === endAction)?.happenedAt)}`
                                  : ` • Saída: ${formatEventTime(stageEvents.find((event) => event.action === endAction)?.happenedAt)}`}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {stageEvents.map((event) => (
                              <div key={event.id} className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs">
                                <span className="font-bold text-slate-700">{event.action}</span>
                                <span className="text-slate-500">{formatEventTime(event.happenedAt)}</span>
                              </div>
                            ))}
                            {stageEvents.length === 0 && (
                              <div className="rounded-lg bg-white border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
                                Nenhum registro nesta etapa.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modo Grid Normal
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Dashboard</h1>
          <div className="text-sm text-slate-500">{currentTime.toLocaleDateString('pt-BR')} • {currentTime.toLocaleTimeString('pt-BR')}</div>
        </div>
        <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-all">
          <Plus size={20} />
          Novo Caso
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cirurgias */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600 font-bold">CIRURGIAS COMPLETADAS</p>
              <p className="text-4xl font-black text-blue-600 mt-2">{kpiData.totalSurgeries}</p>
              <p className="text-xs text-slate-500 mt-1">em andamento/completadas</p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
        </div>

        {/* Tempo Médio */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600 font-bold">TRANSPORTE → SO</p>
              <p className="text-4xl font-black text-purple-600 mt-2">{formatMs(kpiData.averageTransportToOrMs)}</p>
              <p className="text-xs text-slate-500 mt-1">tempo médio de chegada ao CC</p>
            </div>
            <TrendingUp className="text-purple-500" size={32} />
          </div>
        </div>

        {/* Tempo Mínimo */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600 font-bold">ANESTESIA</p>
              <p className="text-4xl font-black text-green-600 mt-2">{formatMs(kpiData.averageAnesthesiaMs)}</p>
              <p className="text-xs text-slate-500 mt-1">início → fim da anestesia</p>
            </div>
            <Zap className="text-green-500" size={32} />
          </div>
        </div>

        {/* Tempo Máximo */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600 font-bold">CIRURGIA</p>
              <p className="text-4xl font-black text-red-600 mt-2">{formatMs(kpiData.averageSurgeryMs)}</p>
              <p className="text-xs text-slate-500 mt-1">início → fim da cirurgia</p>
            </div>
            <AlertCircle className="text-red-500" size={32} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-slate-500">
          <p className="text-sm text-slate-600 font-bold">TEMPO TOTAL CC</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{formatMs(kpiData.averageTotalCcMs)}</p>
          <p className="text-xs text-slate-500 mt-1">transporte → RPA out</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-amber-500">
          <p className="text-sm text-slate-600 font-bold">RPA</p>
          <p className="text-3xl font-black text-amber-600 mt-2">{formatMs(kpiData.averageRpaMs)}</p>
          <p className="text-xs text-slate-500 mt-1">entrada → saída da recuperação</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
          <p className="text-sm text-slate-600 font-bold">PACIENTE NO CC</p>
          <p className="text-3xl font-black text-indigo-600 mt-2">{formatMs(kpiData.averageOrMs)}</p>
          <p className="text-xs text-slate-500 mt-1">entrada → saída da sala</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-rose-500">
          <p className="text-sm text-slate-600 font-bold">PREVISTOS</p>
          <p className="text-3xl font-black text-rose-600 mt-2">{kpiData.plannedCount}</p>
          <p className="text-xs text-slate-500 mt-1">casos com horário previsto</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-5 border border-slate-200">
          <p className="text-sm text-slate-600 font-bold">ATRASO PACIENTE</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatMs(kpiData.averagePatientDelayMs)}</p>
          <p className="text-xs text-slate-500 mt-1">entrada no CC vs horário previsto</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-5 border border-slate-200">
          <p className="text-sm text-slate-600 font-bold">ATRASO ANESTESIA</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatMs(kpiData.averageAnesthesiaTeamDelayMs)}</p>
          <p className="text-xs text-slate-500 mt-1">equipe anestesia vs horário previsto</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-5 border border-slate-200">
          <p className="text-sm text-slate-600 font-bold">ATRASO CIRURGIA</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatMs(kpiData.averageSurgeryTeamDelayMs)}</p>
          <p className="text-xs text-slate-500 mt-1">equipe cirúrgica vs horário previsto</p>
        </div>
      </div>

      {/* Salas Grid */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Salas Cirúrgicas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const caseData = cases.find(c => c.roomId === room.id);
            const statusColor = caseData?.status === 'LIBERADO' ? 'bg-green-100 text-green-800' :
                              caseData?.status === 'EM PREPARO' ? 'bg-yellow-100 text-yellow-800' :
                              caseData?.status === 'EM ATRASO' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800';

            return (
              <div 
                key={room.id} 
                onClick={() => handleExpandRoom(room.id)}
                className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border-2 border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-600">{room.name}</p>
                    <p className="text-lg font-black text-slate-900">{room.code}</p>
                  </div>
                  {caseData && (
                    <span className={`text-xs font-bold px-2 py-1 rounded ${statusColor}`}>
                      {caseData.status}
                    </span>
                  )}
                </div>
                
                {caseData ? (
                  <>
                    <p className="text-sm text-slate-700 truncate font-semibold">{caseData.patientFullName || 'Paciente'}</p>
                    <p className="text-xs text-slate-500 mt-1">{caseData.procedureName || 'Procedimento'}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 italic">Sala disponível</p>
                )}
                
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Clique para expandir</p>
                  <ChevronRight className="text-slate-400 group-hover:text-slate-600 transition-colors" size={16} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para cards de tempo
interface TimeCardProps {
  label: string;
  fields: string[];
}

function TimeCard({ label, fields }: TimeCardProps) {
  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <p className="text-xs font-bold text-slate-600 mb-2">{label}</p>
      <div className="space-y-2">
        {fields.map((field, idx) => (
          <div key={idx} className="bg-white px-3 py-2 rounded border border-blue-100">
            <p className="text-xs text-slate-500">{field}</p>
            <p className="text-sm font-bold text-slate-900">00h00</p>
          </div>
        ))}
      </div>
    </div>
  );
}
