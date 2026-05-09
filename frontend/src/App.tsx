import React, { useEffect, useState } from 'react';
import Login from './Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StatusLegendCRUD from './components/StatusLegendCRUD';
import UsersCRUD from './components/UsersCRUD';
import SetupSala from './components/SetupSala';
import './App.css';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Parse user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to parse user:', err);
      }
    }
  }, []);

localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const handleLoginSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (loading) return <div className="text-center p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black">SetupSO</h1>
            <p className="text-blue-100 mt-1">Sistema de Gestão de Tempos e Movimentos</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{user?.fullName}</p>
            <p className="text-xs text-blue-200">{user?.role}</p>
            <button
              onClick={handleLogout}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-sm"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
  // Render current page based on selection
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'setup-sala':
        return <SetupSala />;
      case 'cadastros':
        return <StatusLegendCRUD />;
      case 'usuarios':
        return <UsersCRUD />;
      case 'salas':
        return <div className="space-y-6"><h1 className="text-3xl font-black">Salas Cirúrgicas</h1><p className="text-slate-600">Módulo em desenvolvimento...</p></div>;
      case 'relatorios':
        return <div className="space-y-6"><h1 className="text-3xl font-black">Relatórios</h1><p className="text-slate-600">Módulo em desenvolvimento...</p></div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
    >
      {renderPage()}
    </Layout