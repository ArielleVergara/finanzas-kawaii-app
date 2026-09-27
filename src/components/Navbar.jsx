import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Calendar, ShoppingCart, DollarSign,
  Landmark, Tags, LogOut, FileSpreadsheet,
  Moon, Sun, ChevronDown, Sparkles, ShieldCheck
} from 'lucide-react';
import SecuritySettingsModal from './SecuritySettingsModal';

export default function Navbar({ activeTab, setActiveTab, darkMode, setDarkMode }) {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  const mainTabs = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, color: '#FFD6E8' },
    { id: 'calendar', label: 'Calendario', icon: Calendar, color: '#D1F2E2' },
    { id: 'import-spreadsheet', label: 'Cargar Planilla', icon: FileSpreadsheet, color: '#FFF1C5' },
  ];

  const sectionsMenu = [
    { id: 'expenses', label: 'Gastos y Cuotas', icon: ShoppingCart, color: '#FFB7B2' },
    { id: 'incomes', label: 'Ingresos', icon: DollarSign, color: '#FFF1C5' },
    { id: 'bank-accounts', label: 'Cuentas y Tarjetas', icon: Landmark, color: '#E3D5FF' },
    { id: 'categories', label: 'Categorías', icon: Tags, color: '#FFE6C7' },
  ];

  const avatarEmojis = {
    bunny: '🐰',
    frog: '🐸',
    kitty: '🐱',
    ghost: '👻',
    bear: '🐻',
    star: '⭐'
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FFFDF0]/90 dark:bg-[#1C1724]/95 backdrop-blur-md border-b-3 border-[#4A3E3D] dark:border-[#8A7398] px-2 sm:px-6 py-2 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          
          {/* Logo y Botones de Acción Móviles / Tablet */}
          <div className="flex items-center justify-between lg:justify-start gap-3 shrink-0">
            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#FFD6E8] dark:bg-[#5E476B] border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm flex items-center justify-center text-lg sm:text-xl group-hover:rotate-6 transition-transform">
                🌸
              </div>
              <div className="whitespace-nowrap">
                <h1 className="text-sm sm:text-lg font-bold tracking-tight text-[#4A3E3D] dark:text-[#F5E8FB]">
                  Finanzas Kawaii
                </h1>
              </div>
            </div>

            {/* En Móvil y Tablet (< lg): Botones de Acción integrados */}
            <div className="flex lg:hidden items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsSecurityOpen(true)}
                className="p-1.5 rounded-xl bg-[#E3D5FF] dark:bg-[#5E476B] border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm hover:scale-105 transition-transform text-[#4A3E3D] dark:text-[#F5E8FB]"
                title="Ajustes de Seguridad 🔒"
              >
                <ShieldCheck size={16} className="text-purple-700 dark:text-purple-300" />
              </button>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 rounded-xl bg-white dark:bg-[#2A2335] border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm hover:scale-105 transition-transform text-[#4A3E3D] dark:text-[#F5E8FB]"
                title={darkMode ? 'Modo Claro ☀️' : 'Modo Oscuro 🌙'}
              >
                {darkMode ? <Sun size={16} className="text-amber-300" /> : <Moon size={16} className="text-purple-600" />}
              </button>

              {user && (
                <div className="flex items-center gap-1 bg-white dark:bg-[#2A2335] px-2 py-1 rounded-xl border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm">
                  <span className="text-sm">{avatarEmojis[user.avatar] || '🐰'}</span>
                  <span className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] max-w-[70px] truncate">{user.name}</span>
                  <button
                    onClick={logout}
                    title="Cerrar sesión"
                    className="p-0.5 rounded-lg hover:bg-[#FFB7B2] text-[#4A3E3D] dark:text-[#F5E8FB] border border-[#4A3E3D]"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pestañas de Navegación Fijas y Fluidas (Sin Tres Puntos ...) */}
          <div className="w-full lg:w-auto lg:flex-1 flex items-center justify-center py-0.5">
            <div className="grid grid-cols-4 gap-1 sm:gap-2 w-full max-w-xl">
              {mainTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-center gap-1 sm:gap-1.5 px-0.5 sm:px-2.5 py-1.5 rounded-2xl font-bold text-[9px] xs:text-[10px] sm:text-xs md:text-sm border-2 transition-all min-w-0 w-full ${
                      isActive
                        ? 'shadow-kawaii translate-x-[-1px] translate-y-[-1px] !text-[#4A3E3D] !border-[#4A3E3D]'
                        : 'bg-white/70 dark:bg-[#2A2335] hover:bg-white text-[#4A3E3D] dark:text-[#F5E8FB] border-[#4A3E3D] dark:border-[#8A7398]'
                    }`}
                    style={{
                      backgroundColor: isActive ? item.color : undefined,
                      color: isActive ? '#4A3E3D' : undefined,
                      borderColor: isActive ? '#4A3E3D' : undefined
                    }}
                  >
                    <Icon size={13} className="shrink-0 sm:w-4 sm:h-4" strokeWidth={2.5} style={{ color: isActive ? '#4A3E3D' : undefined }} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}

              {/* Menú Desplegable de Secciones */}
              <div className="relative min-w-0 w-full" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen((prev) => !prev);
                  }}
                  className={`flex items-center justify-center gap-0.5 sm:gap-1.5 px-0.5 sm:px-2.5 py-1.5 rounded-2xl font-bold text-[9px] xs:text-[10px] sm:text-xs md:text-sm border-2 transition-all min-w-0 w-full ${
                    sectionsMenu.some((s) => s.id === activeTab)
                      ? 'shadow-kawaii translate-x-[-1px] translate-y-[-1px] !text-[#4A3E3D] !border-[#4A3E3D]'
                      : 'bg-white/80 dark:bg-[#2A2335] text-[#4A3E3D] dark:text-[#F5E8FB] border-[#4A3E3D] dark:border-[#8A7398]'
                  }`}
                  style={{
                    backgroundColor: sectionsMenu.some((s) => s.id === activeTab) ? '#E3D5FF' : undefined,
                    color: sectionsMenu.some((s) => s.id === activeTab) ? '#4A3E3D' : undefined,
                    borderColor: sectionsMenu.some((s) => s.id === activeTab) ? '#4A3E3D' : undefined
                  }}
                >
                  <Sparkles size={13} className={`shrink-0 sm:w-4 sm:h-4 ${sectionsMenu.some((s) => s.id === activeTab) ? 'text-[#4A3E3D]' : 'text-purple-600'}`} />
                  <span className="whitespace-nowrap">Secciones</span>
                  <ChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#2A2335] rounded-3xl border-3 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-[#4A3E3D]/60 dark:text-[#F5E8FB]/60 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 mb-1">
                      Módulos de Gestión
                    </div>
                    {sectionsMenu.map((sec) => {
                      const Icon = sec.icon;
                      const isActive = activeTab === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(sec.id);
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all mb-1 ${
                            isActive
                              ? 'bg-[#FFD6E8] !text-[#4A3E3D] border border-[#4A3E3D]'
                              : 'hover:bg-[#FFFDF0] dark:hover:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
                          }`}
                        >
                          <span className="p-1 rounded-xl border border-[#4A3E3D]" style={{ backgroundColor: sec.color }}>
                            <Icon size={14} className="text-[#4A3E3D]" />
                          </span>
                          <span>{sec.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botones de Acción Escritorio (lg:) */}
          <div className="hidden lg:flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => setIsSecurityOpen(true)}
              className="p-2 rounded-2xl bg-[#E3D5FF] dark:bg-[#5E476B] border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm hover:scale-110 transition-transform text-[#4A3E3D] dark:text-[#F5E8FB]"
              title="Ajustes de Seguridad y PIN 🔒"
            >
              <ShieldCheck size={18} className="text-purple-700 dark:text-purple-300" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-2xl bg-white dark:bg-[#2A2335] border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm hover:scale-110 transition-transform text-[#4A3E3D] dark:text-[#F5E8FB]"
              title={darkMode ? 'Cambiar a Modo Claro ☀️' : 'Cambiar a Modo Oscuro 🌙'}
            >
              {darkMode ? <Sun size={18} className="text-amber-300" /> : <Moon size={18} className="text-purple-600" />}
            </button>

            {user && (
              <div className="flex items-center gap-2 bg-white dark:bg-[#2A2335] px-3 py-1.5 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm">
                <span className="text-xl">{avatarEmojis[user.avatar] || '🐰'}</span>
                <span className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] max-w-[90px] truncate">{user.name}</span>
                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  className="p-1 rounded-xl hover:bg-[#FFB7B2] text-[#4A3E3D] dark:text-[#F5E8FB] transition-colors border border-[#4A3E3D] dark:border-[#8A7398]"
                >
                  <LogOut size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Modal de Configuración de Seguridad y PIN */}
      <SecuritySettingsModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />
    </>
  );
}
