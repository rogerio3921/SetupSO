import React, { useEffect, useState } from 'react';
import { RefreshCw, User, Stethoscope, Calendar, AlertTriangle, ArrowRightLeft, Plus, X } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface Room {
  id: string;
  code: string;
  name: string;
}

interface CaseData {
  id: string;
  roomId: string;
  code: string;
  status: string;
  patientFullName?: string | null;
  procedureName?: string | null;
  surgeonName?: string | null;
  attendanceNumber?: string | null;
  birthDate?: string | null;
  allergies?: string | null;
  plannedSurgeryTime?: string | null;
  events?: any[];
}

interface Patient {
  id: string;
  fullName: string;
  noticeNumber?: string | null;
  procedureName?: string | null;
  surgeonName?: string | null;
  birthDate?: string | null;
  allergies?: string | null;
  status: string;
  roomId?: string | null;
}

interface ScheduleEntry {
  id: string;
  roomId: string;
  patientId: string;
  procedureName: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  patient?: Patient;
}

type RoomStatus = 'livre' | 'ocupada' | 'limpeza' | 'preparando';

export default function SalasCirurgicas() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cases, setCases] = useState<CaseData[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Move patient modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movePatientId, setMovePatientId] = useState<string | null>(null);
  const [moveTargetRoom, setMoveTargetRoom] = useState<string>('');

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleRoomId, setScheduleRoomId] = useState<string>('');
  const [schedulePatientId, setSchedulePatientId] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState('08:00');

  // Add room modal
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [roomsRes, casesRes, patientsRes, schedulesRes] = await Promise.all([
        axios.get(`${API_URL}/rooms`, { headers }),
        axios.get(`${API_URL}/cases`, { headers }),
        axios.get(`${API_URL}/patients`, { headers }),
        axios.get(`${API_URL}/schedules`, { headers })
      ]);
      setRooms(roomsRes.data || []);
      setCases(casesRes.data || []);
      setPatients(patientsRes.data || []);
      setSchedules(schedulesRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoomStatus = (room: Room): RoomStatus => {
    const activeCase = cases.find((c) => c.roomId === room.id && c.status === 'active');
    if (!activeCase) return 'livre';

    const events = activeCase.events || [];
    const hasCleaningIn = events.some((e) => e.eventKey === 'cleaning' && e.action === 'in');
    const hasCleaningOut = events.some((e) => e.eventKey === 'cleaning' && e.action === 'out');
    const hasSurgeryStart = events.some((e) => e.eventKey === 'surgery' && e.action === 'start');
    const hasPatientIn = events.some((e) => e.eventKey === 'patient_in_or' && e.action === 'in');

    if (hasCleaningIn && !hasCleaningOut) return 'limpeza';
    if (hasSurgeryStart || hasPatientIn) return 'ocupada';
    return 'preparando';
  };

  const getStatusConfig = (status: RoomStatus) => {
    switch (status) {
      case 'livre':
        return { label: 'LIVRE', bg: 'bg-green-50', border: 'border-green-400', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' };
      case 'ocupada':
        return { label: 'OCUPADA', bg: 'bg-red-50', border: 'border-red-400', badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
      case 'limpeza':
        return { label: 'EM LIMPEZA', bg: 'bg-amber-50', border: 'border-amber-400', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' };
      case 'preparando':
        return { label: 'PREPARANDO', bg: 'bg-blue-50', border: 'border-blue-400', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' };
    }
  };

  const getRoomCase = (roomId: string) => cases.find((c) => c.roomId === roomId && c.status === 'active');

  const getRoomSchedules = (roomId: string) =>
    schedules.filter((s) => s.roomId === roomId && s.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

  const getRoomPatient = (roomId: string) =>
    patients.find((p) => p.roomId === roomId && p.status === 'scheduled');

  const handleMovePatient = async () => {
    if (!movePatientId || !moveTargetRoom) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/patients/${movePatientId}`, {
        roomId: moveTargetRoom,
        status: 'scheduled'
      }, { headers });
      setShowMoveModal(false);
      setMovePatientId(null);
      setMoveTargetRoom('');
      await fetchAll();
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      alert(msg || 'Erro ao mover paciente.');
    }
  };

  const handleSchedule = async () => {
    if (!schedulePatientId || !scheduleRoomId) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const today = new Date().toISOString().slice(0, 10);
      await axios.post(`${API_URL}/schedules`, {
        patientId: schedulePatientId,
        roomId: scheduleRoomId,
        scheduledStart: `${today}T${scheduleTime}:00`,
        source: 'manual'
      }, { headers });
      setShowScheduleModal(false);
      setSchedulePatientId('');
      setScheduleRoomId('');
      await fetchAll();
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      alert(msg || 'Erro ao agendar paciente.');
    }
  };

  const openMoveModal = (patientId: string) => {
    setMovePatientId(patientId);
    setMoveTargetRoom('');
    setShowMoveModal(true);
  };

  const openScheduleForRoom = (roomId: string) => {
    setScheduleRoomId(roomId);
    setSchedulePatientId('');
    setScheduleTime('08:00');
    setShowScheduleModal(true);
  };

  const filtered = rooms.filter((r) =>
    r.code.toLowerCase().includes(query.toLowerCase()) ||
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  // Group by status for kanban view
  const roomsByStatus: Record<RoomStatus, Room[]> = { livre: [], ocupada: [], limpeza: [], preparando: [] };
  filtered.forEach((room) => {
    const status = getRoomStatus(room);
    roomsByStatus[status].push(room);
  });

  const availablePatients = patients.filter((p) => p.status === 'waiting' || (!p.roomId && p.status !== 'completed'));

  if (loading) return <div className="text-center py-12 text-slate-600">Carregando salas...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Mapa Cirúrgico</h1>
            <p className="text-sm text-slate-600 mt-1">Visão geral das salas, pacientes escalados e agendamentos.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar sala..."
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-40"
            />
            <button
              onClick={() => { setScheduleRoomId(''); setShowScheduleModal(true); }}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg transition-all"
            >
              <Plus size={16} />
              Agendar
            </button>
            <button
              onClick={() => setShowAddRoomModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition-all"
            >
              <Plus size={16} />
              Incluir Sala
            </button>
            <button
              onClick={fetchAll}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg transition-all"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['livre', 'ocupada', 'preparando', 'limpeza'] as RoomStatus[]).map((status) => {
          const config = getStatusConfig(status);
          return (
            <div key={status} className={`rounded-xl p-4 border-2 ${config.border} ${config.bg}`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                <span className="text-xs font-black uppercase text-slate-700">{config.label}</span>
              </div>
              <p className="text-3xl font-black text-slate-900 mt-1">{roomsByStatus[status].length}</p>
            </div>
          );
        })}
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((room) => {
          const status = getRoomStatus(room);
          const config = getStatusConfig(status);
          const activeCase = getRoomCase(room.id);
          const scheduledPatient = getRoomPatient(room.id);
          const roomSchedules = getRoomSchedules(room.id);

          return (
            <div
              key={room.id}
              className={`rounded-2xl border-2 ${config.border} ${config.bg} p-4 transition-all hover:shadow-lg`}
            >
              {/* Room Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-lg font-black text-slate-900">{room.code}</p>
                  <p className="text-xs text-slate-600">{room.name}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${config.badge}`}>
                  {config.label}
                </span>
              </div>

              {/* Patient Info */}
              {(activeCase?.patientFullName || scheduledPatient) && (
                <div className="bg-white rounded-xl p-3 border border-slate-200 mb-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-500" />
                      <span className="text-sm font-bold text-slate-900 uppercase">
                        {activeCase?.patientFullName || scheduledPatient?.fullName || '—'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {activeCase?.birthDate || scheduledPatient?.birthDate || ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-700 uppercase">
                      {activeCase?.procedureName || scheduledPatient?.procedureName || '—'}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">Cirurgião: </span>
                    <span className="font-bold text-slate-800 uppercase">{activeCase?.surgeonName || scheduledPatient?.surgeonName || '—'}</span>
                  </div>
                  {(activeCase?.allergies || scheduledPatient?.allergies) && (
                    <div className="flex items-center gap-1 text-xs">
                      <AlertTriangle size={12} className="text-red-500" />
                      <span className="text-red-700 font-bold uppercase">{activeCase?.allergies || scheduledPatient?.allergies}</span>
                    </div>
                  )}
                  {activeCase?.plannedSurgeryTime && (
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar size={12} className="text-slate-500" />
                      <span className="text-slate-700">PREVISTO: <strong>{activeCase.plannedSurgeryTime}</strong></span>
                    </div>
                  )}

                  {/* Move button */}
                  {scheduledPatient && (
                    <button
                      onClick={() => openMoveModal(scheduledPatient.id)}
                      className="w-full mt-2 inline-flex items-center justify-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all"
                    >
                      <ArrowRightLeft size={12} />
                      Mover para outra sala
                    </button>
                  )}
                </div>
              )}

              {/* No patient */}
              {!activeCase?.patientFullName && !scheduledPatient && (
                <div className="bg-white/60 rounded-xl p-3 border border-dashed border-slate-300 mb-3 text-center">
                  <p className="text-xs text-slate-500 italic">Nenhum paciente escalado</p>
                </div>
              )}

              {/* Next scheduled */}
              {roomSchedules.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Próximos agendamentos</p>
                  {roomSchedules.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5 border border-slate-100 text-xs">
                      <span className="font-bold text-slate-800 truncate max-w-[120px]">{s.patient?.fullName || s.patientId.slice(0, 8)}</span>
                      <span className="text-slate-500">{new Date(s.scheduledStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add patient button for free rooms */}
              {status === 'livre' && !scheduledPatient && (
                <button
                  onClick={() => openScheduleForRoom(room.id)}
                  className="w-full mt-2 inline-flex items-center justify-center gap-1 text-xs font-bold px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-all border border-green-200"
                >
                  <Plus size={12} />
                  Escalar paciente
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Move Patient Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-900">Mover Paciente</h2>
              <button onClick={() => setShowMoveModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Paciente: <strong>{patients.find((p) => p.id === movePatientId)?.fullName || '—'}</strong>
            </p>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Mover para sala:</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                value={moveTargetRoom}
                onChange={(e) => setMoveTargetRoom(e.target.value)}
              >
                <option value="">— selecione a sala destino —</option>
                {rooms
                  .filter((r) => {
                    const patient = patients.find((p) => p.id === movePatientId);
                    return r.id !== patient?.roomId;
                  })
                  .map((r) => (
                    <option key={r.id} value={r.id}>{r.code} - {r.name}</option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleMovePatient}
                disabled={!moveTargetRoom}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
              >
                Confirmar Mudança
              </button>
              <button
                onClick={() => setShowMoveModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-900">Escalar Paciente</h2>
              <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Sala</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  value={scheduleRoomId}
                  onChange={(e) => setScheduleRoomId(e.target.value)}
                >
                  <option value="">— selecione —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.code} - {r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Paciente</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  value={schedulePatientId}
                  onChange={(e) => setSchedulePatientId(e.target.value)}
                >
                  <option value="">— selecione —</option>
                  {availablePatients.map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName} {p.procedureName ? `(${p.procedureName})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Horário previsto</label>
                <input
                  type="time"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSchedule}
                disabled={!schedulePatientId || !scheduleRoomId}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-900">INCLUIR NOVA SALA</h2>
              <button onClick={() => setShowAddRoomModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Código da sala</label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                  placeholder="Ex: SALA 5"
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome da sala</label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Ex: Sala de Cirurgia 5"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={async () => {
                  if (!newRoomCode.trim()) { alert('Código é obrigatório.'); return; }
                  try {
                    const token = localStorage.getItem('token');
                    const headers = { Authorization: `Bearer ${token}` };
                    await axios.post(`${API_URL}/rooms`, { code: newRoomCode.trim(), name: newRoomName.trim() || newRoomCode.trim() }, { headers });
                    setShowAddRoomModal(false);
                    setNewRoomCode('');
                    setNewRoomName('');
                    await fetchAll();
                  } catch (error: any) {
                    alert(error?.response?.data?.error || 'Erro ao criar sala.');
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                Criar Sala
              </button>
              <button
                onClick={() => setShowAddRoomModal(false)}
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
