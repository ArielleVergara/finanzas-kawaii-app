import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SecurityProvider } from './context/SecurityContext';

import Navbar from './components/Navbar';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import KawaiiCalendar from './components/KawaiiCalendar';
import ExpenseManager from './components/ExpenseManager';
import IncomeManager from './components/IncomeManager';
import BankAccountManager from './components/BankAccountManager';
import CategoryManager from './components/CategoryManager';
import AnalyticsCharts from './components/AnalyticsCharts';
import SpreadsheetImporter from './components/SpreadsheetImporter';
import PinLockModal from './components/PinLockModal';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('kawaii_dark_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('kawaii_dark_mode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF0] dark:bg-[#1C1724] flex flex-col items-center justify-center font-kawaii">
        <div className="w-16 h-16 rounded-3xl bg-[#FFD6E8] dark:bg-[#5E476B] border-3 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii flex items-center justify-center text-3xl animate-spin mb-3">
          🌸
        </div>
        <p className="text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">Cargando tus finanzas kawaii...</p>
      </div>
    );
  }

  // Si no hay usuario autenticado, mostrar la pantalla de inicio de sesión / registro
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#FFFDF0] dark:bg-[#1C1724] flex flex-col font-kawaii transition-colors relative">
      {/* Modal de Bloqueo por PIN / Biometría OWASP MASVS */}
      <PinLockModal />

      {/* Navbar Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === 'calendar' && <KawaiiCalendar />}
        {activeTab === 'import-spreadsheet' && <SpreadsheetImporter setActiveTab={setActiveTab} />}
        {activeTab === 'expenses' && <ExpenseManager />}
        {activeTab === 'incomes' && <IncomeManager />}
        {(activeTab === 'bank-accounts' || activeTab === 'savings' || activeTab === 'cards') && <BankAccountManager />}
        {activeTab === 'categories' && <CategoryManager />}
        {activeTab === 'analytics' && <AnalyticsCharts />}
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-[#4A3E3D] dark:border-[#8A7398] bg-white dark:bg-[#2A2335] py-4 px-6 text-center text-xs font-bold text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70">
        <p>Finanzas Kawaii 🌸 • Creado con amor para la gestión financiera del hogar ✨</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SecurityProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </SecurityProvider>
    </AuthProvider>
  );
}
