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
    { id: 'salas', label: 'Mapa Cirúrgico', icon: LayoutIcon, role: ['Admin', 'User', 'Master', 'Usuário'] },
    { id: 'setup-sala', label: 'Setup Sala', icon: Clock, role: ['Admin', 'User', 'Master', 'Usuário'] },
    { id: 'pacientes', label: 'Pacientes', icon: Users, role: ['Admin', 'Master'] },
    { id: 'fluxo-sala', label: 'Fluxo de Sala', icon: Settings, role: ['Admin', 'Master'] },
    { id: 'config-cc', label: 'Custos CC', icon: Settings, role: ['Admin', 'Master'] },
    { id: 'custom-metrics', label: 'Cálculos', icon: ClipboardList, role: ['Admin', 'Master'] },
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
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className={`
        w-64
        md:w-64 md:flex flex-col
        bg-gradient-to-b from-[#0b2a4a] via-[#0f3c6e] to-[#134e91]
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
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight">SetupSO</h1>
            <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] font-black">MVP 2</span>
          </div>
          <p className="text-[10px] text-blue-100/80 mt-1">Salas • Dashboard TV • Relatórios</p>
        </div>

        {/* User Info */}
        <div className="px-4 py-2 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate flex-1">{user?.fullName}</p>
            {isMaster && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full">MASTER</span>
            )}
            {isAdmin && !isMaster && (
              <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-black rounded-full">ADMIN</span>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-hidden p-3 space-y-1">
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
                  w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-white/18 text-white font-black shadow-lg border border-white/20' 
                    : 'text-blue-100 hover:bg-white/10 border border-transparent'
                  }
                `}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Menu */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={() => {
              onLogout();
              closeSidebarOnMobile();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-red-200 hover:bg-red-500/20 transition-all text-sm"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Top Bar */}
        <header className="bg-white/85 backdrop-blur border-b border-slate-200 px-4 md:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-xl"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-700">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {user?.fullName?.split(' ')[0] || 'Usuário'}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-black">
              <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">Dashboard TV • Tempo real</span>
            </div>
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
