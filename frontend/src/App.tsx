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

type PageId = 'dashboard' | 'salas' | 'setup-sala' | 'cadastros' | 'usuarios' | 'relatorios';

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
        return <Dashboard />;
      case 'setup-sala':
        return <SetupSala />;
      case 'cadastros':
        return <StatusLegendCRUD />;
      case 'usuarios':
        return <UsersCRUD />;
      case 'salas':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-black">Salas Cirúrgicas</h1>
            <p className="text-slate-600">Módulo em desenvolvimento...</p>
          </div>
        );
      case 'relatorios':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-black">Relatórios</h1>
            <p className="text-slate-600">Módulo em desenvolvimento...</p>
          </div>
        );
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
