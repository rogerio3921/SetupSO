import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Plus, CalendarDays, RefreshCw, Link2, Trash2, Wand2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface Patient {
  id: string;
  fullName: string;
  noticeNumber?: string | null;
  attendanceNumber?: string | null;
  birthDate?: string | null;
  allergies?: string | null;
  procedureName?: string | null;
  surgeonName?: string | null;
  plannedSurgeryTime?: string | null;
  estimatedMinutes?: number | null;
  status: string;
  roomId?: string | null;
}

interface Room {
  id: string;
  code: string;
  name: string;
}

interface ProcedureTiming {
  id: string;
  procedureName: string;
  estimatedMinutes: number;
  prepMinutes: number;
  cleanMinutes: number;
  active: boolean;
}

interface ScheduleEntry {
  id: string;
  roomId: string;
  patientId: string;
  procedureName: string;
  scheduledStart: string;
  scheduledEnd: string;
  estimatedMinutes: number;
  status: string;
  patient?: Patient;
  room?: Room;
}

type ViewId = 'cadastro' | 'agenda' | 'integracao';

const initialPatientForm = {
  fullName: '',
  noticeNumber: '',
  attendanceNumber: '',
  birthDate: '',
  allergies: '',
  procedureName: '',
  surgeonName: '',
  plannedSurgeryTime: '',
  estimatedMinutes: ''
};

export default function Pacientes() {
  const [currentView, setCurrentView] = useState<ViewId>('cadastro');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timings, setTimings] = useState<ProcedureTiming[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [scheduleForm, setScheduleForm] = useState({
    patientId: '',
    roomId: '',
    date: new Date().toISOString().slice(0, 10),
    time: '07:00',
    procedureName: '',
    estimatedMinutes: ''
  });
  const [integrationForm, setIntegrationForm] = useState({
    sourceUrl: '',
    token: ''
  });
  const [importResult, setImportResult] = useState<string | null>(null);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === scheduleForm.patientId),
    [patients, scheduleForm.patientId]
  );

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!scheduleForm.patientId) return;
    const patient = patients.find((item) => item.id === scheduleForm.patientId);
    if (!patient) return;

    setScheduleForm((current) => ({
      ...current,
      procedureName: patient.procedureName || current.procedureName,
      estimatedMinutes: patient.estimatedMinutes ? String(patient.estimatedMinutes) : current.estimatedMinutes
    }));
  }, [scheduleForm.patientId, patients]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [patientsRes, roomsRes, timingsRes, schedulesRes] = await Promise.all([
        axios.get(`${API_URL}/patients`, { headers }),
        axios.get(`${API_URL}/rooms`, { headers }),
        axios.get(`${API_URL}/procedure-timings`, { headers }),
        axios.get(`${API_URL}/schedules`, { headers })
      ]);

      setPatients(patientsRes.data || []);
      setRooms(roomsRes.data || []);
      setTimings(timingsRes.data || []);
      setSchedules(schedulesRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes/agendas', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/patients`,
        {
          ...patientForm,
          estimatedMinutes: patientForm.estimatedMinutes ? Number(patientForm.estimatedMinutes) : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPatientForm(initialPatientForm);
      await fetchAll();
      setCurrentView('agenda');
    } catch (error) {
      console.error('Erro ao salvar paciente', error);
    }
  };

  const handleScheduleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const scheduledStart = `${scheduleForm.date}T${scheduleForm.time}:00`;
      await axios.post(
        `${API_URL}/schedules`,
        {
          patientId: scheduleForm.patientId,
          roomId: scheduleForm.roomId,
          scheduledStart,
          procedureName: scheduleForm.procedureName,
          estimatedMinutes: scheduleForm.estimatedMinutes ? Number(scheduleForm.estimatedMinutes) : undefined,
          source: 'manual'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchAll();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message;
      if (errorMsg) {
        alert(errorMsg);
      } else {
        console.error('Erro ao criar agendamento', error);
      }
    }
  };

  const handleAutoPlan = async () => {
    try {
      if (!scheduleForm.roomId) return;
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/schedules/auto-plan`,
        {
          roomId: scheduleForm.roomId,
          date: scheduleForm.date,
          startTime: scheduleForm.time
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchAll();
    } catch (error) {
      console.error('Erro ao montar agenda automática', error);
    }
  };

  const handleImportPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/integrations/patients/import`,
        integrationForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setImportResult(`Importados ${response.data.importedCount || 0} pacientes.`);
      await fetchAll();
      setCurrentView('agenda');
    } catch (error) {
      console.error('Erro ao importar pacientes', error);
      setImportResult('Falha ao importar pacientes. Verifique a URL da API.');
    }
  };

  const handleProcedureSuggestion = (procedureName: string) => {
    const timing = timings.find((item) => item.procedureName === procedureName);
    if (!timing) return;

    setPatientForm((current) => ({
      ...current,
      procedureName,
      estimatedMinutes: String(timing.estimatedMinutes)
    }));
  };

  const removePatient = async (id: string) => {
    if (!window.confirm('Remover paciente?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchAll();
    } catch (error) {
      console.error('Erro ao remover paciente', error);
    }
  };

  const viewButtons = [
    { id: 'cadastro' as ViewId, label: 'Adicionar Paciente' },
    { id: 'agenda' as ViewId, label: 'Manage Pacientes / Agenda' },
    { id: 'integracao' as ViewId, label: 'API de Pacientes' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Pacientes e Agenda</h1>
          <p className="text-slate-600 mt-1">Cadastro, sincronização com API externa e alocação por sala/procedimento.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {viewButtons.map((button) => (
            <button
              key={button.id}
              onClick={() => setCurrentView(button.id)}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                currentView === button.id
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              {button.label}
            </button>
          ))}
          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-600">Carregando pacientes e agenda...</div>
      ) : null}

      {currentView === 'cadastro' && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-black text-xl">
            <Plus size={20} />
            Novo paciente
          </div>

          <form onSubmit={handlePatientSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input className="input" placeholder="Nome completo" value={patientForm.fullName} onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })} required />
            <input className="input" placeholder="Número do aviso" value={patientForm.noticeNumber} onChange={(e) => setPatientForm({ ...patientForm, noticeNumber: e.target.value })} />
            <input className="input" placeholder="Número de atendimento" value={patientForm.attendanceNumber} onChange={(e) => setPatientForm({ ...patientForm, attendanceNumber: e.target.value })} />
            <input className="input" type="date" value={patientForm.birthDate} onChange={(e) => setPatientForm({ ...patientForm, birthDate: e.target.value })} />
            <input className="input" placeholder="Procedimento" value={patientForm.procedureName} onChange={(e) => setPatientForm({ ...patientForm, procedureName: e.target.value })} list="procedure-suggestions" />
            <input className="input" placeholder="Cirurgião" value={patientForm.surgeonName} onChange={(e) => setPatientForm({ ...patientForm, surgeonName: e.target.value })} />
            <input className="input" placeholder="Tempo previsto de cirurgia (min)" type="number" value={patientForm.estimatedMinutes} onChange={(e) => setPatientForm({ ...patientForm, estimatedMinutes: e.target.value })} />
            <input className="input md:col-span-2 lg:col-span-3" placeholder="Alergias / observações" value={patientForm.allergies} onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })} />

            <div className="md:col-span-2 lg:col-span-3 flex flex-wrap gap-2 pt-2">
              <button type="submit" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg">
                <Plus size={16} />
                Salvar paciente
              </button>
              <button type="button" onClick={() => setCurrentView('agenda')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg">
                Ir para agenda
              </button>
            </div>
          </form>

          <datalist id="procedure-suggestions">
            {timings.map((timing) => (
              <option key={timing.id} value={timing.procedureName} />
            ))}
          </datalist>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {timings.slice(0, 6).map((timing) => (
              <button
                key={timing.id}
                type="button"
                onClick={() => handleProcedureSuggestion(timing.procedureName)}
                className="text-left bg-slate-50 hover:bg-slate-100 rounded-xl p-4 border border-slate-200"
              >
                <p className="text-xs text-slate-500">Sugestão de procedimento</p>
                <p className="font-black text-slate-900">{timing.procedureName}</p>
                <p className="text-sm text-green-700 font-bold">{timing.estimatedMinutes} min</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentView === 'agenda' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Manage pacientes e agenda</h2>
                <p className="text-slate-600">Escolha paciente, sala e horário. O fim da cirurgia é calculado pelo tempo estimado.</p>
              </div>
              <button onClick={handleAutoPlan} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
                <Wand2 size={16} />
                Auto-planejar sala
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="input" value={scheduleForm.patientId} onChange={(e) => setScheduleForm({ ...scheduleForm, patientId: e.target.value })} required>
                <option value="">Selecionar paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName} {patient.procedureName ? `- ${patient.procedureName}` : ''}
                  </option>
                ))}
              </select>
              <select className="input" value={scheduleForm.roomId} onChange={(e) => setScheduleForm({ ...scheduleForm, roomId: e.target.value })} required>
                <option value="">Selecionar sala</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} - {room.name}
                  </option>
                ))}
              </select>
              <input className="input" type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })} />
              <input className="input" type="time" value={scheduleForm.time} onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })} />
              <input className="input" placeholder="Procedimento" value={scheduleForm.procedureName} onChange={(e) => setScheduleForm({ ...scheduleForm, procedureName: e.target.value })} list="procedure-suggestions-agenda" />
              <input className="input" type="number" placeholder="Tempo previsto de cirurgia (min)" value={scheduleForm.estimatedMinutes} onChange={(e) => setScheduleForm({ ...scheduleForm, estimatedMinutes: e.target.value })} />

              <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
                <button type="submit" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg">
                  <CalendarDays size={16} />
                  Criar agenda manual
                </button>
                <button type="button" onClick={() => setScheduleForm((current) => ({ ...current, patientId: '' }))} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg">
                  Limpar seleção
                </button>
              </div>
            </form>

            <datalist id="procedure-suggestions-agenda">
              {timings.map((timing) => (
                <option key={timing.id} value={timing.procedureName} />
              ))}
            </datalist>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs text-slate-500">Paciente selecionado</p>
                <p className="font-black text-slate-900">{selectedPatient?.fullName || 'Nenhum selecionado'}</p>
                <p className="text-sm text-slate-600">Procedimento: {selectedPatient?.procedureName || '—'}</p>
                <p className="text-sm text-slate-600">Tempo previsto: {selectedPatient?.estimatedMinutes || '—'} min</p>
                <p className="text-sm text-slate-600">Alergia: {selectedPatient?.allergies || '—'}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs text-slate-500">Sala selecionada</p>
                <p className="font-black text-slate-900">{rooms.find((room) => room.id === scheduleForm.roomId)?.code || 'Nenhuma selecionada'}</p>
                <p className="text-sm text-slate-600">Clique em auto-planejar para distribuir a fila usando o tempo estimado</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Fila de pacientes</h2>
              <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">{patients.length} pacientes</span>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
              {patients.map((patient) => (
                <div key={patient.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">{patient.fullName}</p>
                      <p className="text-sm text-slate-600">{patient.procedureName || 'Sem procedimento'}</p>
                      <p className="text-xs text-slate-500 mt-1">{patient.noticeNumber || patient.attendanceNumber || 'Sem aviso/atendimento'}</p>
                      <p className="text-xs text-slate-500 mt-1">Alergia: {patient.allergies || '—'}</p>
                    </div>
                    <button onClick={() => setScheduleForm((current) => ({ ...current, patientId: patient.id, procedureName: patient.procedureName || current.procedureName, estimatedMinutes: patient.estimatedMinutes ? String(patient.estimatedMinutes) : current.estimatedMinutes }))} className="text-xs font-bold px-3 py-2 rounded-lg bg-blue-50 text-blue-700">
                      Selecionar
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{patient.status}</span>
                    <button onClick={() => removePatient(patient.id)} className="inline-flex items-center gap-1 text-red-600 font-bold">
                      <Trash2 size={14} />
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              {patients.length === 0 && <p className="text-slate-500 text-sm">Nenhum paciente cadastrado.</p>}
            </div>
          </div>
        </div>
      )}

      {currentView === 'integracao' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xl">
              <Link2 size={20} />
              Conexão com API de pacientes
            </div>
            <p className="text-slate-600">Essa área busca pacientes de uma API externa e sincroniza com o cadastro interno.</p>
            <input className="input" placeholder="URL da API externa de pacientes" value={integrationForm.sourceUrl} onChange={(e) => setIntegrationForm({ ...integrationForm, sourceUrl: e.target.value })} />
            <input className="input" placeholder="Token da API externa (opcional)" value={integrationForm.token} onChange={(e) => setIntegrationForm({ ...integrationForm, token: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              <button onClick={handleImportPatients} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg">
                <Link2 size={16} />
                Importar pacientes da API
              </button>
              <button onClick={() => setCurrentView('agenda')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg">
                Voltar para agenda
              </button>
            </div>
            {importResult && <div className="bg-blue-50 text-blue-800 font-bold rounded-xl p-3">{importResult}</div>}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 space-y-3">
            <h2 className="text-xl font-black text-slate-900">Agendamentos criados</h2>
            <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">{schedule.patient?.fullName || 'Paciente'}</p>
                      <p className="text-sm text-slate-600">Sala: {schedule.room?.code || '—'}</p>
                      <p className="text-sm text-slate-600">{schedule.procedureName}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">{schedule.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{new Date(schedule.scheduledStart).toLocaleString('pt-BR')} - {new Date(schedule.scheduledEnd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))}
              {schedules.length === 0 && <p className="text-slate-500 text-sm">Nenhuma agenda criada ainda.</p>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.75rem 1rem;
          outline: none;
          background: white;
        }
        .input:focus {
          border-color: rgb(22 163 74);
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
        }
      `}</style>
    </div>
  );
}
