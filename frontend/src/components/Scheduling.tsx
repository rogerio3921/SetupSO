import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function Scheduling() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [time, setTime] = useState('08:00');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [sRes, rRes, pRes] = await Promise.all([
        axios.get(`${API_URL}/schedules`, { headers }),
        axios.get(`${API_URL}/rooms`, { headers }),
        axios.get(`${API_URL}/patients`, { headers })
      ]);
      setSchedules(Array.isArray(sRes.data) ? sRes.data : []);
      setRooms(Array.isArray(rRes.data) ? rRes.data : []);
      setPatients(Array.isArray(pRes.data) ? pRes.data : []);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
    }
  };

  const submitSchedule = async () => {
    if (!selectedPatient || !selectedRoom) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const today = new Date().toISOString().slice(0, 10);
      const iso = `${today}T${time}:00`;
      await axios.post(`${API_URL}/schedules`, { patientId: selectedPatient, roomId: selectedRoom, scheduledStart: iso }, { headers });
      setSelectedPatient(null);
      setSelectedRoom(null);
      await fetchData();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message;
      if (errorMsg) {
        alert(errorMsg);
      } else {
        console.error('Erro ao criar agendamento:', err);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="card p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black">Agendamentos - Grade do Dia</h1>
        <p className="text-sm text-slate-600">Crie e revise agendamentos para as salas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 bg-white p-4 rounded-lg border">
          <p className="text-sm font-bold mb-2">Novo Agendamento</p>
          <label className="text-xs">Paciente</label>
          <select className="w-full p-2 border rounded mb-3" value={selectedPatient || ''} onChange={(e) => setSelectedPatient(e.target.value)}>
            <option value="">— selecione —</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>

          <label className="text-xs">Sala</label>
          <select className="w-full p-2 border rounded mb-3" value={selectedRoom || ''} onChange={(e) => setSelectedRoom(e.target.value)}>
            <option value="">— selecione —</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name || r.code}</option>)}
          </select>

          <label className="text-xs">Hora</label>
          <input type="time" className="w-full p-2 border rounded mb-3" value={time} onChange={(e) => setTime(e.target.value)} />

          <button className="w-full bg-green-600 text-white py-2 rounded" onClick={submitSchedule}>Agendar</button>
        </div>

        <div className="lg:col-span-2 bg-white p-4 rounded-lg border">
          <p className="text-sm font-bold mb-3">Agendamentos</p>
          <div className="space-y-2">
            {schedules.length === 0 && <p className="text-xs text-slate-500">Nenhum agendamento.</p>}
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-bold">{s.procedureName} — {s.patient?.fullName || s.patientId}</div>
                  <div className="text-xs text-slate-500">Sala: {s.room?.name || s.roomId} • {new Date(s.scheduledStart).toLocaleString()}</div>
                </div>
                <div className="text-xs font-bold">{s.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
