import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut, Settings, Home, Users, ClipboardList, Layout as LayoutIcon, BarChart3, Clock } from 'lucide-react';

interface LayoutProps {
  user: any;
  onLogout: () => void;
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Layout({ user, onLogout, children, currentPage, onPageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const closeSidebarOnMobile = () => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setSidebarOpen(false);
    }
  };

  // Initialize sidebar visibility: closed on small screens, open on desktop
  useEffect(() => {
    try {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      setSidebarOpen(!isMobile);
    } catch (e) {
      // ignore (safe fallback)
    }
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, role: ['Admin', 'User', 'Master', 'Usuário'] },
    { id: 'salas', label: 'Salas Cirúrgicas', icon: LayoutIcon, role: ['Admin', 'User', 'Master', 'Usuário'] },
    { id: 'setup-sala', label: 'Setup Sala', icon: Clock, role: ['Admin', 'User', 'Master', 'Usuário'] },
    { id: 'cadastros', label: 'Cadastros', icon: ClipboardList, role: ['Admin', 'Master'] },
    { id: 'usuarios', label: 'Usuários', icon: Users, role: ['Admin', 'Master'] },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, role: ['Admin', 'Master'] },
  ];

  // Filter menu items by user role
  const visibleMenuItems = menuItems.filter(item => 
    item.role.includes(user?.role || 'User')
  );

  const isAdmin = user?.role === 'Admin' || user?.role === 'Master';
  const isMaster = user?.role === 'Master';

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`
        w-64
        md:w-64 md:flex flex-col
        bg-gradient-to-b from-blue-900 to-blue-800
        text-white
        transform
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:static
        h-full z-20
        shadow-xl
        overflow-hidden
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-2xl font-black">SetupSO</h1>
          <p className="text-xs text-blue-200 mt-1">Tempos e Movimentos</p>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-blue-700 bg-blue-800/50">
          <p className="text-sm font-bold">{user?.fullName}</p>
          <p className="text-xs text-blue-200 mt-1">{user?.role}</p>
          {isMaster && (
            <span className="inline-block mt-2 px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded">
              MASTER
            </span>
          )}
          {isAdmin && !isMaster && (
            <span className="inline-block mt-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
              ADMIN
            </span>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onPageChange(item.id);
                  closeSidebarOnMobile();
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-green-500 text-white font-bold shadow-lg' 
                    : 'text-blue-100 hover:bg-blue-700/50'
                  }
                `}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Menu */}
        <div className="p-4 border-t border-blue-700 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-700/50 transition-all">
            <Settings size={20} />
            <span>Configurações</span>
          </button>
          <button
            onClick={() => {
              onLogout();
              closeSidebarOnMobile();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-200 hover:bg-red-600 transition-all"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-lg px-6 py-4 flex items-center justify-between md:justify-end">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Mobile Menu Toggle */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-slate-600">Bem-vindo, {user?.fullName?.split(' ')[0]}</span>
          </div>
        </header>

        {/* Overlay ao abrir menu mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 md:hidden z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
