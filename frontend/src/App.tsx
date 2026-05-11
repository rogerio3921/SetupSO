import React, { useEffect, useState } from 'react';
import Login from './Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StatusLegendCRUD from './components/StatusLegendCRUD';
import UsersCRUD from './components/UsersCRUD';
import SetupSala from './components/SetupSala';
import SalasCirurgicas from './components/SalasCirurgicas';
import Reports from './components/Reports';
import Pacientes from './components/Pacientes';
import './App.css';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

type PageId = 'dashboard' | 'salas' | 'setup-sala' | 'cadastros' | 'usuarios' | 'relatorios' | 'pacientes';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      return null;
    }
  });
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  useEffect(() => {
    if (!token) {
      setUser(null);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setCurrentPage('dashboard');
  };

  const handleLoginSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onOpenSetupSala={(roomId) => {
          localStorage.setItem('setupRoomId', roomId);
          setCurrentPage('setup-sala');
        }} />;
      case 'setup-sala':
        return <SetupSala />;
      case 'cadastros':
        return <StatusLegendCRUD />;
      case 'usuarios':
        return <UsersCRUD />;
      case 'salas':
        return <SalasCirurgicas />;
      case 'pacientes':
        return <Pacientes />;
      case 'relatorios':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout
      user={user}
      onLogout={handleLogout}
      currentPage={currentPage}
      onPageChange={(page) => setCurrentPage(page as PageId)}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;
