import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Zap, AlertCircle, Plus, X, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface KPIData {
  totalSurgeries: number;
  averageRoomTime: number;
  minimumRoomTime: number;
  maximumRoomTime: number;
  roomsInUse: number;
  roomsInPrep: number;
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

export default function Dashboard() {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalSurgeries: 0,
    averageRoomTime: 0,
    minimumRoomTime: 0,
    maximumRoomTime: 0,
    roomsInUse: 0,
    roomsInPrep: 0,
  });
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [roomTimes, setRoomTimes] = useState<RoomTimes>({});

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [roomsRes, casesRes] = await Promise.all([
        axios.get(`${API_URL}/rooms`, { headers }),
        axios.get(`${API_URL}/cases`, { headers })
      ]);

      setRooms(roomsRes.data);
      setCases(casesRes.data);

      // Calcular KPIs corretamente
      const activeSurgeries = casesRes.data.filter((c: any) => c.status !== 'LIBERADO').length;
      const inPrep = casesRes.data.filter((c: any) => c.status === 'EM PREPARO').length;
      
      // Calcular tempos (mock data por enquanto)
      const totalSurgeries = casesRes.data.length;
      const avgTime = Math.round(Math.random() * 180 + 60); // 60-240 min
      const minTime = 45;
      const maxTime = 240;

      setKpiData({
        totalSurgeries,
        averageRoomTime: avgTime,
        minimumRoomTime: minTime,
        maximumRoomTime: maxTime,
        roomsInUse: activeSurgeries,
        roomsInPrep: inPrep,
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
  };

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  const expandedRoom = rooms.find(r => r.id === expandedRoomId);
  const expandedCase = cases.find(c => c.roomId === expandedRoomId);

  // Se está em modo expandido, mostrar detalhes
  if (expandedRoomId && expandedRoom) {
    return (
      <div className="space-y-4">
        {/* Header Expandido */}
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={handleCloseExpanded}
            className="text-slate-600 hover:text-slate-900"
          >
            <X size={24} />
          </button>
          <h1 className="text-3xl font-black text-slate-900">Dashboard - {expandedRoom.code}</h1>
        </div>

        {/* Layout: Card + Tempos */}
        <div className="grid grid-cols-12 gap-6">
          {/* Coluna Esquerda: Card da Sala */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-500">
              <p className="text-xl font-bold text-slate-900 mb-2">{expandedRoom.code} - {expandedRoom.name}</p>
              
              {expandedCase ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-slate-600">CIRURGIÃO</p>
                    <p className="text-lg font-bold text-slate-900">{expandedCase.surgeon || 'N/A'}</p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-slate-600">PACIENTE</p>
                    <p className="text-lg font-bold text-slate-900">{expandedCase.patientFullName || 'N/A'}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-slate-600">PROCEDIMENTO</p>
                    <p className="text-lg font-bold text-slate-900">{expandedCase.procedureName || 'N/A'}</p>
                  </div>

                  <div className="mb-4 p-3 bg-white rounded border-l-4 border-green-500">
                    <p className="text-xs text-slate-500">STATUS</p>
                    <p className="text-lg font-bold text-green-600">{expandedCase.status || 'LIBERADO'}</p>
                  </div>

                  {/* Tempos Totais */}
                  <div className="space-y-3 mt-6">
                    <div className="bg-white p-3 rounded">
                      <p className="text-xs text-slate-500">TEMPO TOTAL DA SALA</p>
                      <p className="text-2xl font-black text-slate-900">03h45</p>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <p className="text-xs text-slate-500">MÉDIA TOTAL DE SALA</p>
                      <p className="text-2xl font-black text-slate-900">03h15</p>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <p className="text-xs text-slate-500">INTERVALO ENTRE CIRURGIAS</p>
                      <p className="text-2xl font-black text-slate-900">00h26</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 italic">Sala disponível</p>
              )}
            </div>
          </div>

          {/* Coluna Direita: Grid de Tempos e Movimentos */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6">SETUP DE SALA – TEMPOS E MOVIMENTOS</h2>
              
              {/* Grid 3x5 de Tempos */}
              <div className="grid grid-cols-3 gap-4">
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
        <h1 className="text-3xl font-black text-slate-900">Dashboard</h1>
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
              <p className="text-sm text-slate-600 font-bold">TOTAL CIRURGIAS</p>
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
              <p className="text-sm text-slate-600 font-bold">TEMPO MÉDIO SALAS</p>
              <p className="text-4xl font-black text-purple-600 mt-2">{kpiData.averageRoomTime}min</p>
              <p className="text-xs text-slate-500 mt-1">tempo médio por sala</p>
            </div>
            <TrendingUp className="text-purple-500" size={32} />
          </div>
        </div>

        {/* Tempo Mínimo */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600 font-bold">TEMPO MÍNIMO SALA</p>
              <p className="text-4xl font-black text-green-600 mt-2">{kpiData.minimumRoomTime}min</p>
              <p className="text-xs text-slate-500 mt-1">melhor performance</p>
            </div>
            <Zap className="text-green-500" size={32} />
          </div>
        </div>

        {/* Tempo Máximo */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600 font-bold">TEMPO MÁXIMO SALA</p>
              <p className="text-4xl font-black text-red-600 mt-2">{kpiData.maximumRoomTime}min</p>
              <p className="text-xs text-slate-500 mt-1">tempo mais longo</p>
            </div>
            <AlertCircle className="text-red-500" size={32} />
          </div>
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
