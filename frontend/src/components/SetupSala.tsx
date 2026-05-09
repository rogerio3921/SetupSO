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
}

export default function SetupSala() {
  const [rooms, setRooms] = useState<RoomSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showDelayPopup, setShowDelayPopup] = useState(false);
  const [delayReason, setDelayReason] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Mock data with setup times
      const roomsWithSetup: RoomSetup[] = response.data.map((room: Room) => ({
        ...room,
        patientName: 'José Carlos',
        scheduledStart: '08:00',
        times: {}
      }));
      setRooms(roomsWithSetup);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar salas:', error);
      setLoading(false);
    }
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
    if (selectedRoom) {
      const room = rooms.find(r => r.id === selectedRoom);
      if (room) {
        setRooms(rooms.map(r => 
          r.id === selectedRoom 
            ? { ...r, delayReason } 
            : r
        ));
      }
    }
    setShowDelayPopup(false);
    setDelayReason('');
  };

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  const activeRoom = rooms.find(r => r.id === selectedRoom);

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
                  <strong>Hora Prevista:</strong> {room.scheduledStart || '—'}
                </p>
                <div className={`mt-2 px-2 py-1 rounded text-xs font-bold ${
                  isDelayed ? 'bg-red-200 text-red-900' : 'bg-green-200 text-green-900'
                }`}>
                  {getStatusText(room)}
                </div>
              </div>

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

          {/* Status Alert */}
          {calculateDelay(activeRoom).isDelayed && (
            <div className="mb-4 bg-red-100 border-l-4 border-red-500 p-3 rounded">
              <p className="text-sm font-bold text-red-800">
                ⚠️ Atraso de {calculateDelay(activeRoom).minutes} minutos detectado
                {activeRoom.delayReason && ` - Motivo: ${activeRoom.delayReason}`}
              </p>
            </div>
          )}

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
