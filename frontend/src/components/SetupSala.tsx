import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, X, Check } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface Room {
  id: string;
  code: string;
  name: string;
  status: string;
}

interface SetupTimes {
  transportStart?: string;
  transportEnd?: string;
  surgeryStart?: string;
  surgeryEnd?: string;
  anesthesiaStart?: string;
  anesthesiaEnd?: string;
  cleaningStart?: string;
  cleaningEnd?: string;
  equipmentStart?: string;
  equipmentEnd?: string;
  anesthesiologistStart?: string;
  anesthesiologistEnd?: string;
  nurseStart?: string;
  nurseEnd?: string;
  surgicalTeamStart?: string;
  surgicalTeamEnd?: string;
}

interface RoomSetup extends Room {
  patientName?: string;
  times?: SetupTimes;
  scheduledStart?: string;
  isDelayed?: boolean;
  delayReason?: string;
  procedureName?: string;
  surgeonName?: string;
  caseId?: string;
}

type TimelineActionKey = 'start' | 'end' | 'in' | 'out';

interface TimelineStage {
  key: string;
  label: string;
  kind: 'start_end' | 'in_out';
  actions: Array<{ label: string; action: TimelineActionKey }>;
}

export default function SetupSala() {
  const [rooms, setRooms] = useState<RoomSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showDelayPopup, setShowDelayPopup] = useState(false);
  const [delayReason, setDelayReason] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [openingRoomId, setOpeningRoomId] = useState<string | null>(null);
  const [caseEvents, setCaseEvents] = useState<any[]>([]);

  const delayReasons = [
    'Atraso no transporte',
    'Atraso Equipe Médica',
    'Atraso Equipe Anestesiologia',
    'Atraso Equipe Enfermagem',
    'Atraso Equipamento',
    'Atraso Preparação Sala',
    'Outro motivo'
  ];

  const timeFields = [
    { key: 'transportStart', label: 'TRANSPORTE', subLabel: 'Saída da Unidade' },
    { key: 'transportEnd', label: 'PACIENTE ENTRADA', subLabel: 'Entrada no CC' },
    { key: 'surgeryStart', label: 'CIRURGIA', subLabel: 'Início/Fim' },
    { key: 'anesthesiaStart', label: 'ANESTESIA', subLabel: 'Início/Fim' },
    { key: 'positioningStart', label: 'POSICIONAMENTO', subLabel: 'Início/Fim' },
    { key: 'timeOutStart', label: 'TIME OUT', subLabel: 'Início/Fim' },
    { key: 'cleaningStart', label: 'LIMPEZA', subLabel: 'Entrada/Saída' },
    { key: 'equipmentStart', label: 'FARMÁCIA', subLabel: 'Entrada/Saída' },
    { key: 'surgicalTeamStart', label: 'ENG CLÍNICA', subLabel: 'Entrada/Saída' }
  ];

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    const activeRoom = rooms.find((room) => room.id === selectedRoom);
    if (!activeRoom?.caseId) {
      setCaseEvents([]);
      return;
    }

    fetchCaseEvents(activeRoom.caseId);
  }, [rooms, selectedRoom]);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [roomsResponse, casesResponse, patientsResponse] = await Promise.all([
        axios.get(`${API_URL}/rooms`, { headers }),
        axios.get(`${API_URL}/cases`, { headers }),
        axios.get(`${API_URL}/patients`, { headers })
      ]);

      const scheduledPatients = Array.isArray(patientsResponse.data)
        ? patientsResponse.data.filter((patient: any) => patient.roomId && patient.status === 'scheduled')
        : [];

      const activeCasesByRoom = new Map<string, any>();
      casesResponse.data
        .filter((item: any) => item.status === 'active')
        .forEach((item: any) => activeCasesByRoom.set(item.roomId, item));

      const roomsNeedingSync = roomsResponse.data.filter((room: Room) => {
        const hasActiveCase = activeCasesByRoom.has(room.id);
        const hasScheduledPatient = scheduledPatients.some((patient: any) => patient.roomId === room.id);
        return !hasActiveCase && hasScheduledPatient;
      });

      if (roomsNeedingSync.length > 0) {
        const syncedCases = await Promise.all(
          roomsNeedingSync.map(async (room: Room) => {
            const response = await axios.get(`${API_URL}/rooms/${room.id}/case`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
          })
        );

        syncedCases.forEach((item) => {
          if (item?.roomId) {
            activeCasesByRoom.set(item.roomId, item);
          }
        });
      }

      const roomsWithSetup: RoomSetup[] = roomsResponse.data.map((room: Room) => {
        const activeCase = activeCasesByRoom.get(room.id);

        return {
          ...room,
          caseId: activeCase?.id,
          patientName: activeCase?.patientFullName || 'Não informado',
          procedureName: activeCase?.procedureName || 'Procedimento não informado',
          surgeonName: activeCase?.surgeonName || 'Cirurgião não informado',
          scheduledStart: activeCase?.plannedSurgeryTime || '—',
          delayReason: activeCase?.delayReason || undefined,
          times: {}
        };
      });
      setRooms(roomsWithSetup);

      const roomToOpen = localStorage.getItem('setupRoomId');
      if (roomToOpen) {
        setSelectedRoom(roomToOpen);
        localStorage.removeItem('setupRoomId');
      }

      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar salas:', error);
      setLoading(false);
    }
  };

  const handleOpenRoomCase = async (roomId: string) => {
    try {
      setOpeningRoomId(roomId);
      const token = localStorage.getItem('token');
      await axios.get(`${API_URL}/rooms/${roomId}/case`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchRooms();
      setSelectedRoom(roomId);
    } catch (error) {
      console.error('Erro ao abrir caso da sala:', error);
    } finally {
      setOpeningRoomId(null);
    }
  };

  const fetchCaseEvents = async (caseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/cases/${caseId}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseEvents(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar eventos da sala:', error);
    }
  };

  const recordEvent = async (caseId: string, eventKey: string, action: 'start' | 'end' | 'in' | 'out') => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/events`,
        { caseId, eventKey, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchRooms();

      const active = rooms.find((room) => room.id === selectedRoom);
      if (active?.caseId) {
        await fetchCaseEvents(active.caseId);
      }
    } catch (error) {
      console.error('Erro ao registrar evento:', error);
    }
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

  const getStageEvents = (caseId: string | undefined, stageKey: string) => {
    if (!caseId) return [];
    return caseEvents
      .filter((event) => event.caseId === caseId && event.eventKey === stageKey)
      .sort((a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime());
  };

  const formatEventTime = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStageStatus = (stage: TimelineStage, events: any[]) => {
    const startEvent = events.find((event) => event.action === (stage.kind === 'start_end' ? 'start' : 'in'));
    const endEvent = events.find((event) => event.action === (stage.kind === 'start_end' ? 'end' : 'out'));

    if (startEvent && endEvent) return 'done';
    if (startEvent && !endEvent) return 'active';
    return 'pending';
  };

  const getStageButtonDisabled = (stage: TimelineStage, events: any[], action: TimelineActionKey) => {
    const startAction = stage.kind === 'start_end' ? 'start' : 'in';
    const endAction = stage.kind === 'start_end' ? 'end' : 'out';
    if (action === startAction) {
      return Boolean(events.find((event) => event.action === startAction));
    }
    return !events.find((event) => event.action === startAction) || Boolean(events.find((event) => event.action === endAction));
  };

  const stageBadgeClass = (status: 'done' | 'active' | 'pending') => {
    if (status === 'done') return 'bg-green-100 text-green-700';
    if (status === 'active') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  };

  const stageBorderClass = (status: 'done' | 'active' | 'pending') => {
    if (status === 'done') return 'border-green-300 bg-green-50';
    if (status === 'active') return 'border-amber-300 bg-amber-50';
    return 'border-slate-200 bg-white';
  };

  const calculateDelay = (room: RoomSetup): { isDelayed: boolean; minutes: number } => {
    if (!room.scheduledStart || !room.times?.transportEnd) {
      return { isDelayed: false, minutes: 0 };
    }

    const [scheduledHour, scheduledMin] = room.scheduledStart.split(':').map(Number);
    const scheduledTime = scheduledHour * 60 + scheduledMin;

    const [actualHour, actualMin] = room.times.transportEnd.split(':').map(Number);
    const actualTime = actualHour * 60 + actualMin;

    const difference = actualTime - scheduledTime;
    return { isDelayed: difference > 0, minutes: Math.abs(difference) };
  };

  const getStatusColor = (room: RoomSetup) => {
    const { isDelayed } = calculateDelay(room);
    if (isDelayed) return 'bg-red-100 border-red-400';
    if (room.times?.surgeryStart) return 'bg-green-100 border-green-400';
    return 'bg-blue-100 border-blue-400';
  };

  const getStatusText = (room: RoomSetup) => {
    const { isDelayed, minutes } = calculateDelay(room);
    if (isDelayed) return `EM ATRASO (${minutes}min)`;
    if (room.times?.surgeryStart) return 'EM CIRURGIA';
    if (room.times?.transportEnd) return 'PACIENTE NA SALA';
    return 'AGUARDANDO';
  };

  const handleTimeUpdate = async (roomId: string, field: string, value: string) => {
    try {
      const token = localStorage.getItem('token');
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      const updatedRoom = {
        ...room,
        times: { ...room.times, [field]: value }
      };

      // Check for delay and show popup if needed
      const { isDelayed } = calculateDelay(updatedRoom);
      if (isDelayed && field === 'transportEnd') {
        setSelectedRoom(roomId);
        setShowDelayPopup(true);
      }

      // Update locally
      setRooms(rooms.map(r => r.id === roomId ? updatedRoom : r));
      
      // API call would go here
      // await axios.patch(`${API_URL}/rooms/${roomId}`, { times: updatedRoom.times }, { headers });
    } catch (error) {
      console.error('Erro ao atualizar tempo:', error);
    }
  };

  const handleDelaySubmit = () => {
    const room = rooms.find((item) => item.id === selectedRoom);

    if (!room?.caseId) {
      setShowDelayPopup(false);
      setDelayReason('');
      return;
    }

    const token = localStorage.getItem('token');
    axios.patch(
      `${API_URL}/cases/${room.caseId}`,
      { delayReason },
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(() => {
        setRooms((current) => current.map((item) => (
          item.id === selectedRoom ? { ...item, delayReason } : item
        )));
      })
      .catch((error) => {
        console.error('Erro ao salvar justificativa do atraso:', error);
      })
      .finally(() => {
        setShowDelayPopup(false);
        setDelayReason('');
      });
  };

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  const activeRoom = rooms.find(r => r.id === selectedRoom);

  const selectedRoomCaseEvents = activeRoom?.caseId ? caseEvents.filter((event) => event.caseId === activeRoom.caseId) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="text-green-600" size={32} />
        <h1 className="text-3xl font-black text-slate-900">Setup de Sala - Tempos e Movimentos</h1>
      </div>

      {/* Grid de Salas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {rooms.map((room) => {
          const { isDelayed, minutes } = calculateDelay(room);
          
          return (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all ${getStatusColor(room)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-lg">{room.code}</h3>
                <span className="text-xs font-bold bg-white px-2 py-1 rounded">
                  {room.times?.transportStart ? '1' : '—'}
                </span>
              </div>

              <p className="text-sm font-bold text-slate-900">{room.name}</p>
              
              <div className="mt-3 space-y-1">
                <p className="text-xs text-slate-600">
                  <strong>Paciente:</strong> {room.patientName || 'Não informado'}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Procedimento:</strong> {room.procedureName || '—'}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Hora Prevista:</strong> {room.scheduledStart || '—'}
                </p>
                <div className={`mt-2 px-2 py-1 rounded text-xs font-bold ${
                  isDelayed ? 'bg-red-200 text-red-900' : 'bg-green-200 text-green-900'
                }`}>
                  {getStatusText(room)}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenRoomCase(room.id);
                }}
                className="mt-3 w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg"
              >
                {openingRoomId === room.id ? 'Abrindo...' : 'Abrir caso da sala'}
              </button>

              {isDelayed && (
                <div className="mt-2 flex items-center gap-1 text-red-600 text-xs font-bold">
                  <AlertCircle size={14} />
                  Justificar atraso
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detalhes da Sala Selecionada */}
      {activeRoom && (
        <div className="bg-white rounded-lg border-2 border-green-400 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-900">
              {activeRoom.code} - {activeRoom.patientName}
            </h2>
            <button
              onClick={() => setSelectedRoom(null)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenRoomCase(activeRoom.id)}
            className="mb-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
          >
            {openingRoomId === activeRoom.id ? 'Sincronizando...' : 'Abrir / sincronizar caso ativo'}
          </button>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-500">PACIENTE</p>
              <p className="font-bold text-slate-900">{activeRoom.patientName || 'Não informado'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-500">PROCEDIMENTO</p>
              <p className="font-bold text-slate-900">{activeRoom.procedureName || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-500">CIRURGIÃO</p>
              <p className="font-bold text-slate-900">{activeRoom.surgeonName || '—'}</p>
            </div>
          </div>

          {/* Status Alert */}
          {calculateDelay(activeRoom).isDelayed && (
            <div className="mb-4 bg-red-100 border-l-4 border-red-500 p-3 rounded">
              <p className="text-sm font-bold text-red-800">
                ⚠️ Atraso de {calculateDelay(activeRoom).minutes} minutos detectado
                {activeRoom.delayReason && ` - Motivo: ${activeRoom.delayReason}`}
              </p>
            </div>
          )}

          <div className="mb-6 bg-slate-50 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-black text-slate-900">Linha do tempo da execução</p>
                <p className="text-xs text-slate-500">Cada etapa mostra o estado atual e o próximo registro esperado.</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                {selectedRoomCaseEvents.length} eventos
              </span>
            </div>

            <div className="space-y-3">
              {timelineStages.map((stage, index) => {
                const stageEvents = getStageEvents(activeRoom.caseId, stage.key);
                const status = getStageStatus(stage, stageEvents);
                const startEvent = stageEvents.find((event) => event.action === (stage.kind === 'start_end' ? 'start' : 'in'));
                const endEvent = stageEvents.find((event) => event.action === (stage.kind === 'start_end' ? 'end' : 'out'));

                return (
                  <div key={stage.key} className={`relative rounded-xl border p-4 ${stageBorderClass(status)}`}>
                    {index < timelineStages.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-px bg-slate-200" />
                    )}

                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between relative z-10">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-4 w-4 rounded-full border-2 ${status === 'done' ? 'bg-green-500 border-green-500' : status === 'active' ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-300'}`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-slate-900">{stage.label}</p>
                            <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${stageBadgeClass(status)}`}>
                              {status === 'done' ? 'Concluída' : status === 'active' ? 'Em andamento' : 'Pendente'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Início: {formatEventTime(startEvent?.happenedAt)}
                            {stage.kind === 'start_end' ? ` • Fim: ${formatEventTime(endEvent?.happenedAt)}` : ` • Saída: ${formatEventTime(endEvent?.happenedAt)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {stage.actions.map((action) => {
                          const disabled = !activeRoom.caseId || getStageButtonDisabled(stage, stageEvents, action.action);
                          const isPrimary = action.action === (stage.kind === 'start_end' ? 'start' : 'in');
                          return (
                            <button
                              key={`${stage.key}-${action.action}`}
                              type="button"
                              disabled={disabled}
                              onClick={() => activeRoom.caseId && recordEvent(activeRoom.caseId, stage.key, action.action)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                disabled
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : isPrimary
                                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              {stageEvents.some((event) => event.action === action.action) ? `✓ ${action.label}` : action.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {stageEvents.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {stageEvents.map((event) => (
                          <div key={event.id} className="flex items-center justify-between rounded-lg bg-white/80 border border-slate-200 px-3 py-2">
                            <span className="font-bold text-slate-700">{event.action}</span>
                            <span className="text-slate-500">{formatEventTime(event.happenedAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 bg-white rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-bold text-slate-500 mb-2">Resumo da sala</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-50 p-2">
                  <span className="block text-slate-500">Paciente</span>
                  <span className="font-bold text-slate-900">{activeRoom.patientName || '—'}</span>
                </div>
                <div className="rounded bg-slate-50 p-2">
                  <span className="block text-slate-500">Procedimento</span>
                  <span className="font-bold text-slate-900">{activeRoom.procedureName || '—'}</span>
                </div>
                <div className="rounded bg-slate-50 p-2">
                  <span className="block text-slate-500">Cirurgião</span>
                  <span className="font-bold text-slate-900">{activeRoom.surgeonName || '—'}</span>
                </div>
                <div className="rounded bg-slate-50 p-2">
                  <span className="block text-slate-500">Previsto</span>
                  <span className="font-bold text-slate-900">{activeRoom.scheduledStart || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Campos de Tempo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timeFields.map((field) => (
              <div key={field.key} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-600 mb-1">{field.label}</p>
                <p className="text-xs text-slate-500 mb-3">{field.subLabel}</p>
                
                <div className="space-y-2">
                  <input
                    type="time"
                    value={activeRoom.times?.[field.key as keyof SetupTimes] || ''}
                    onChange={(e) => handleTimeUpdate(activeRoom.id, field.key, e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="HH:MM"
                  />
                  
                  <div className="flex justify-between">
                    <button className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                      Início
                    </button>
                    <button className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                      Fim
                    </button>
                  </div>

                  {activeRoom.times?.[field.key as keyof SetupTimes] && (
                    <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                      <Check size={12} />
                      {activeRoom.times[field.key as keyof SetupTimes]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Informações Adicionais */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-bold text-slate-900 mb-2">ℹ️ Instruções:</p>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Clique em "Início" ou "Fim" para registrar os horários</li>
              <li>• Se um registro não for preenchido, assumirá 00h00</li>
              <li>• Sistema alertará se houver atrasos na cirurgia</li>
              <li>• Registre a justificativa ao ser solicitado</li>
            </ul>
          </div>

          {/* Botão Salvar */}
          <div className="mt-6 flex gap-2">
            <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all">
              ✓ Salvar Alterações
            </button>
            <button
              onClick={() => setSelectedRoom(null)}
              className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-bold py-2 px-4 rounded-lg transition-all"
            >
              Próxima Sala
            </button>
          </div>
        </div>
      )}

      {/* Popup de Justificativa de Atraso */}
      {showDelayPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-600" size={32} />
              <h2 className="text-xl font-bold text-slate-900">Justificar Atraso</h2>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              O paciente chegou com atraso. Por favor, selecione o motivo:
            </p>

            <div className="space-y-2 mb-6">
              {delayReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setDelayReason(reason)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-bold text-left transition-all ${
                    delayReason === reason
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDelaySubmit}
                disabled={!delayReason}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setShowDelayPopup(false);
                  setDelayReason('');
                }}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-bold py-2 px-4 rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legenda de Status */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-xs font-bold text-slate-600 mb-3">LEGENDA STATUS:</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-400 rounded"></span>
            <span className="text-xs">LIBERADO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-400 rounded"></span>
            <span className="text-xs">EM PREPARO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-400 rounded"></span>
            <span className="text-xs">EM TRANSPORTE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-400 rounded"></span>
            <span className="text-xs">EM ATRASO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-purple-400 rounded"></span>
            <span className="text-xs">INICIADO CIRURGIA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
