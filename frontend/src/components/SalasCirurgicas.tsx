import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface Room {
  id: string;
  code: string;
  name: string;
  status?: string;
}

export default function SalasCirurgicas() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.get(`${API_URL}/rooms`, { headers });
      setRooms(res.data || []);
    } catch (err) {
      console.error('Erro ao buscar salas', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = rooms.filter(r =>
    r.code.toLowerCase().includes(query.toLowerCase()) ||
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Salas Cirúrgicas</h1>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar por código ou nome"
            className="px-3 py-2 border rounded-lg"
          />
          <button onClick={fetchRooms} className="bg-green-600 text-white px-4 py-2 rounded-lg">Atualizar</button>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(room => (
            <div key={room.id} className="bg-white rounded-lg p-4 shadow-md border-l-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500">Sala</p>
                  <p className="text-xl font-black">{room.code} - {room.name}</p>
                </div>
                <div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${room.status === 'LIBERADO' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                    {room.status || 'INDISP.'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
