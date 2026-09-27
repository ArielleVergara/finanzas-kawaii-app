import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import KawaiiIcon from './KawaiiIcon';
import AnalyticsCharts from './AnalyticsCharts';
import {
  TrendingUp, Wallet, PiggyBank,
  Plus, Calendar, CreditCard, Tags, Sparkles, ShoppingBag, Landmark, ArrowRightLeft,
  Edit2, Trash2, Save, X, FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Dashboard({ setActiveTab }) {
  const { user } = useAuth();
  const {
    monthlyAnalytics,
    bankAccountsData,
    calendarData,
    categories,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    authHeaders,
    refreshAllData
  } = useData();

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos para edición de eventos
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editBankAccountId, setEditBankAccountId] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const totalIncomes = monthlyAnalytics?.total_incomes || 0;
  const totalExpenses = monthlyAnalytics?.total_expenses || 0;
  const totalSavingsAllocated = monthlyAnalytics?.total_savings_allocated || 0;
  const netBalance = monthlyAnalytics?.net_balance || 0;

  const totalBalance = bankAccountsData?.total_balance || 0;
  const accountsList = bankAccountsData?.accounts || [];
  const projectedReturns = bankAccountsData?.projected_returns || { daily: 0, monthly: 0, annual: 0 };

  const eventsList = calendarData?.events || [];

  const incomeCategories = categories?.filter((c) => c.type === 'income') || [];
  const expenseCategories = categories?.filter((c) => c.type === 'expense') || [];

  const formatMoney = (val) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  };

  const handleStartEdit = (ev) => {
    setSelectedEvent(ev);
    const cleanTitle = ev.expense_title || ev.title?.replace(/^🔄\s*/, '').replace(/\s*\([^)]*\)$/, '') || '';
    setEditTitle(cleanTitle);
    setEditAmount(ev.total_amount || ev.amount || '');
    setEditDate(ev.date || '');
    setEditCategoryId(ev.category_id || '');
    setEditBankAccountId(ev.bank_account_id || '');
    setEditNotes(ev.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editAmount || !editDate) {
      alert('Por favor completa el concepto, monto y fecha.');
      return;
    }

    setSaving(true);
    try {
      if (selectedEvent.type === 'income') {
        const incomeId = selectedEvent.income_id || selectedEvent.raw_id;
        const payload = {
          title: editTitle.trim(),
          amount: Number(editAmount),
          date: editDate,
          category_id: editCategoryId || null,
          bank_account_id: editBankAccountId || null,
          status: selectedEvent.status || 'pagado',
          notes: editNotes,
          is_recurring: selectedEvent.is_recurring ? 1 : 0,
          recurrence_period: selectedEvent.recurrence_period || 'monthly'
        };

        const res = await fetch(`/api/incomes/${incomeId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setSelectedEvent(null);
          setIsEditing(false);
          refreshAllData();
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        } else {
          alert('Error al actualizar el ingreso');
        }
      } else {
        const expenseId = selectedEvent.expense_id || selectedEvent.raw_id;
        const payload = {
          title: editTitle.trim(),
          total_amount: Number(editAmount),
          payment_method: selectedEvent.payment_method || 'contado',
          bank_account_id: editBankAccountId || null,
          category_id: editCategoryId || null,
          total_installments: selectedEvent.total_installments || 1,
          start_date: editDate,
          initial_status: selectedEvent.status || 'por_pagar',
          is_recurring: selectedEvent.is_recurring ? 1 : 0,
          recurrence_period: selectedEvent.recurrence_period || 'monthly',
          notes: editNotes
        };

        const res = await fetch(`/api/expenses/${expenseId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setSelectedEvent(null);
          setIsEditing(false);
          refreshAllData();
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        } else {
          alert('Error al actualizar el gasto');
        }
      }
    } catch (err) {
      console.error('Error al guardar edición:', err);
      alert('Error de conexión al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const toggleEventStatus = async (ev) => {
    const nextStatus = ev.status === 'pagado' ? 'por_pagar' : 'pagado';
    try {
      if (ev.type === 'income') {
        await fetch(`/api/incomes/${ev.income_id || ev.raw_id}/status`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ status: nextStatus })
        });
      } else {
        await fetch(`/api/expenses/installments/${ev.raw_id}/status`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ status: nextStatus, date: ev.date })
        });
      }
      setSelectedEvent(null);
      setIsEditing(false);
      refreshAllData();
      if (nextStatus === 'pagado') {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('Error al alternar estado:', err);
    }
  };

  const handleDeleteEvent = async (ev) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${ev.title}"?`)) return;
    try {
      if (ev.type === 'income') {
        const incomeId = ev.income_id || ev.raw_id;
        await fetch(`/api/incomes/${incomeId}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
      } else {
        const expenseId = ev.expense_id || ev.raw_id;
        await fetch(`/api/expenses/${expenseId}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
      }
      setSelectedEvent(null);
      setIsEditing(false);
      refreshAllData();
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="kawaii-card bg-gradient-to-r from-[#FFD6E8] via-[#FFF1C5] to-[#D1F2E2] dark:from-[#3D2C42] dark:via-[#3E3725] dark:to-[#223B30] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-black/40 border-2 border-[#4A3E3D] dark:border-[#8A7398] text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-2">
              <Sparkles size={14} />
              <span>Resumen Financiero del Hogar</span>
            </div>
            <h2 className="text-3xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
              ¡Hola, {user ? user.name : 'Bienvenid@'}! 🌸
            </h2>
            <p className="text-sm text-[#4A3E3D]/90 dark:text-[#F5E8FB]/80 mt-1 font-medium">
              Vista de cuentas, aportes a ahorro y movimientos de {monthsList[selectedMonth - 1]} {selectedYear}.
            </p>
          </div>

          {/* Selector de Mes/Año */}
          <div className="flex items-center gap-2 bg-white/90 dark:bg-[#1C1724] p-2 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB] focus:outline-none cursor-pointer"
            >
              {monthsList.map((m, idx) => (
                <option key={idx} value={idx + 1} className="dark:bg-[#1C1724]">{m}</option>
              ))}
            </select>
            <span className="text-[#4A3E3D] dark:text-[#F5E8FB] font-bold">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB] focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y} className="dark:bg-[#1C1724]">{y}</option>
              ))}
            </select>
          </div>
        </div>

        {projectedReturns.daily > 0 && (
          <div className="mt-3 p-2.5 sm:p-3 bg-white/90 dark:bg-[#1C1724]/90 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] flex items-center justify-between gap-2.5 text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span>⚡ Tus cuentas de ahorro generan <strong>+{formatMoney(projectedReturns.daily)}/día</strong> (~+{formatMoney(projectedReturns.monthly)}/mes)</span>
            </div>
            <button
              onClick={() => setActiveTab('bank-accounts')}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#E3D5FF] dark:bg-[#5E476B] border-2 border-[#4A3E3D] dark:border-[#8A7398] text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] hover:opacity-80 transition-all shadow-kawaii-sm"
            >
              <span className="whitespace-nowrap">Ver cuentas</span>
              <span className="text-[10px] sm:text-xs leading-none">➔</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid de Tarjetas Principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Total Ingresos */}
        <div className="kawaii-card bg-[#D1F2E2]/60 dark:bg-[#1E3A2E] hover:translate-y-[-2px] transition-transform p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 uppercase tracking-wider">Ingresos Mes</span>
            <KawaiiIcon name="trending-up" color="#D1F2E2" size="sm" />
          </div>
          <div className="text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">{formatMoney(totalIncomes)}</div>
          <p className="text-[10px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 mt-1">Ingresos recibidos</p>
        </div>

        {/* Total Gastos */}
        <div className="kawaii-card bg-[#FFD6E8]/60 dark:bg-[#3D2331] hover:translate-y-[-2px] transition-transform p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 uppercase tracking-wider">Gastos Mes</span>
            <KawaiiIcon name="shopping-bag" color="#FFD6E8" size="sm" />
          </div>
          <div className="text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">{formatMoney(totalExpenses)}</div>
          <p className="text-[10px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 mt-1">Contado y cuotas</p>
        </div>

        {/* Ahorro Destinado Este Mes */}
        <div className="kawaii-card bg-[#E3D5FF]/60 dark:bg-[#2F213E] hover:translate-y-[-2px] transition-transform p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 uppercase tracking-wider">Ahorrado Este Mes</span>
            <KawaiiIcon name="piggy-bank" color="#E3D5FF" size="sm" />
          </div>
          <div className="text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">{formatMoney(totalSavingsAllocated)}</div>
          <p className="text-[10px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 mt-1">Aportes a cuentas de ahorro</p>
        </div>

        {/* Balance Disponible Restante */}
        <div className={`kawaii-card ${netBalance >= 0 ? 'bg-[#FFF1C5]/70 dark:bg-[#3B341E]' : 'bg-[#FFB7B2]/70 dark:bg-[#3D1E1E]'} hover:translate-y-[-2px] transition-transform p-3.5`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 uppercase tracking-wider">Disponible Libre</span>
            <KawaiiIcon name="wallet" color="#FFF1C5" size="sm" />
          </div>
          <div className="text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">{formatMoney(netBalance)}</div>
          <p className="text-[10px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 mt-1">Tras gastos y ahorro</p>
        </div>

        {/* Total Saldo Consolidado */}
        <div
          onClick={() => setActiveTab('bank-accounts')}
          className="kawaii-card bg-[#D0F4DE]/60 dark:bg-[#1E3E34] hover:translate-y-[-2px] transition-transform cursor-pointer p-3.5 group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 uppercase tracking-wider">Patrimonio Total</span>
            <KawaiiIcon name="landmark" color="#D0F4DE" size="sm" />
          </div>
          <div className="text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB] group-hover:scale-105 transition-transform origin-left">
            {formatMoney(totalBalance)}
          </div>
          <p className="text-[10px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 mt-1 flex items-center gap-1">
            <span>{accountsList.length} cuentas activas</span>
            <span>➔</span>
          </p>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="kawaii-card bg-white dark:bg-[#2A2335]">
        <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-[#FFB7B2]" />
          <span>Acciones Rápidas</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => setActiveTab('expenses')}
            className="kawaii-btn bg-[#FFD6E8] text-[#4A3E3D] p-3 text-xs flex flex-col items-center justify-center gap-1.5"
          >
            <ShoppingBag size={18} />
            <span>Gasto</span>
          </button>

          <button
            onClick={() => setActiveTab('incomes')}
            className="kawaii-btn bg-[#D1F2E2] text-[#4A3E3D] p-3 text-xs flex flex-col items-center justify-center gap-1.5"
          >
            <Plus size={18} />
            <span>Ingreso</span>
          </button>

          <button
            onClick={() => setActiveTab('import-spreadsheet')}
            className="kawaii-btn bg-[#FFF1C5] text-[#4A3E3D] p-3 text-xs flex flex-col items-center justify-center gap-1.5"
          >
            <FileSpreadsheet size={18} className="text-amber-700" />
            <span>Cargar Excel/CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('bank-accounts')}
            className="kawaii-btn bg-[#E3D5FF] text-[#4A3E3D] p-3 text-xs flex flex-col items-center justify-center gap-1.5"
          >
            <Landmark size={18} />
            <span>Cuentas y Ahorros</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className="kawaii-btn bg-[#FFE6C7] text-[#4A3E3D] p-3 text-xs flex flex-col items-center justify-center gap-1.5"
          >
            <Tags size={18} />
            <span>Categorías</span>
          </button>
        </div>
      </div>

      {/* Resumen de Cuentas y Movimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mis Cuentas Bancarias y Ahorros */}
        <div className="kawaii-card bg-white dark:bg-[#2A2335]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
              <Landmark size={20} className="text-[#E3D5FF]" />
              <span>Mis Cuentas y Ahorros</span>
            </h3>
            <button
              onClick={() => setActiveTab('bank-accounts')}
              className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]/80 hover:underline"
            >
              Ver todas ➔
            </button>
          </div>

          {accountsList.length === 0 ? (
            <div className="text-center py-6 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30 dark:border-[#8A7398]">
              <span className="text-3xl">🏛️</span>
              <p className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-2">Aún no has agregado cuentas bancarias</p>
              <button
                onClick={() => setActiveTab('bank-accounts')}
                className="mt-2 text-xs font-bold bg-[#E3D5FF] text-[#4A3E3D] px-3 py-1 rounded-xl border-2 border-[#4A3E3D]"
              >
                + Registrar Cuenta
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {accountsList.slice(0, 4).map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm"
                  style={{ backgroundColor: acc.color || '#E3D5FF' }}
                >
                  <div className="flex items-center gap-3">
                    <KawaiiIcon name={acc.icon || 'landmark'} color="#FFFFFF" size="sm" />
                    <div>
                      <h4 className="text-sm font-bold text-[#4A3E3D]">{acc.account_name}</h4>
                      <p className="text-xs text-[#4A3E3D]/80 font-medium">🏛️ {acc.institution_name} {acc.is_savings === 1 ? '• 🏦 Ahorro' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#4A3E3D]">
                      {formatMoney(acc.balance)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eventos del Mes */}
        <div className="kawaii-card bg-white dark:bg-[#2A2335]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
              <Calendar size={20} className="text-[#FFD6E8]" />
              <span>Eventos del Mes</span>
            </h3>
            <button
              onClick={() => setActiveTab('calendar')}
              className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]/80 hover:underline"
            >
              Abrir Calendario ➔
            </button>
          </div>

          {eventsList.length === 0 ? (
            <div className="text-center py-6 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30 dark:border-[#8A7398]">
              <span className="text-3xl">🌸</span>
              <p className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-2">No hay movimientos programados para este mes</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {eventsList.slice(0, 8).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setIsEditing(false);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] bg-[#FFFDF0] dark:bg-[#1C1724] cursor-pointer hover:scale-[1.01] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <KawaiiIcon
                      name={ev.category_icon || (ev.type === 'income' ? 'wallet' : 'shopping-bag')}
                      color={ev.category_color || (ev.type === 'income' ? '#D1F2E2' : '#FFD6E8')}
                      size="sm"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">{ev.title}</h4>
                      <p className="text-[10px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 font-medium">Fecha: {ev.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${ev.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {ev.type === 'income' ? '+' : '-'}{formatMoney(ev.amount)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#4A3E3D] whitespace-nowrap shrink-0 ${
                      ev.status === 'pagado' ? 'bg-[#D1F2E2] text-emerald-900' : 'bg-[#FFB7B2] text-rose-900'
                    }`}>
                      {ev.status === 'pagado' ? 'Pagado' : 'Por pagar'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(ev);
                      }}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-[#2A2335] rounded-xl transition-colors"
                      title="Editar evento"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gráficos Embed al final del Dashboard */}
      <div className="pt-4">
        <AnalyticsCharts />
      </div>

      {/* Modal de Detalle o Edición de Evento del Mes en Inicio */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A3E3D]/50 backdrop-blur-sm">
          <div className="kawaii-card max-w-sm w-[92vw] sm:w-full max-h-[90vh] overflow-y-auto relative bg-[#FFFDF0] dark:bg-[#2A2335] animate-in zoom-in duration-200">
            <button
              onClick={() => {
                setSelectedEvent(null);
                setIsEditing(false);
              }}
              className="absolute top-3 right-3 p-1 rounded-full bg-[#FFB7B2] border-2 border-[#4A3E3D] shadow-kawaii-sm hover:scale-110"
            >
              <X size={16} />
            </button>

            {!isEditing ? (
              /* VISTA DE DETALLE */
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <KawaiiIcon
                    name={selectedEvent.category_icon || 'tag'}
                    color={selectedEvent.category_color || '#FFD6E8'}
                    size="md"
                  />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 bg-white dark:bg-[#1C1724] px-2 py-0.5 rounded-full border border-[#4A3E3D]">
                      {selectedEvent.type === 'income' ? 'Ingreso 💰' : 'Gasto 💸'}
                    </span>
                    <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-0.5">{selectedEvent.title}</h3>
                  </div>
                </div>

                <div className="space-y-2 bg-white dark:bg-[#1C1724] p-3 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] text-xs">
                  <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1">
                    <span className="text-gray-500 dark:text-gray-400">Monto:</span>
                    <span className="font-bold text-[#4A3E3D] dark:text-[#F5E8FB] text-sm">{formatMoney(selectedEvent.amount)}</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1">
                    <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                    <span className="font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">{selectedEvent.date}</span>
                  </div>

                  {selectedEvent.category_name && (
                    <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1">
                      <span className="text-gray-500 dark:text-gray-400">Categoría:</span>
                      <span className="font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">{selectedEvent.category_name}</span>
                    </div>
                  )}

                  {selectedEvent.notes && (
                    <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1">
                      <span className="text-gray-500 dark:text-gray-400">Notas:</span>
                      <span className="font-bold text-[#4A3E3D] dark:text-[#F5E8FB] italic">{selectedEvent.notes}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Estado Actual:</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full border border-[#4A3E3D] whitespace-nowrap shrink-0 ${
                      selectedEvent.status === 'pagado' ? 'bg-[#D1F2E2] text-emerald-900' : 'bg-[#FFB7B2] text-rose-900'
                    }`}>
                      {selectedEvent.status === 'pagado' ? 'Pagado' : 'Por Pagar'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <button
                    onClick={() => toggleEventStatus(selectedEvent)}
                    className="kawaii-btn w-full bg-[#FFD6E8] hover:bg-[#FFB7B2] text-[#4A3E3D] py-2 text-xs flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    <span>
                      {selectedEvent.status === 'pagado'
                        ? 'Cambiar a "Por Pagar"'
                        : '¡Marcar como Pagado! ✨'}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleStartEdit(selectedEvent)}
                      className="py-2 px-3 bg-[#E3D5FF] hover:bg-purple-200 text-[#4A3E3D] rounded-xl font-bold text-xs border-2 border-[#4A3E3D] flex items-center justify-center gap-1.5 cursor-pointer shadow-kawaii-sm"
                    >
                      <Edit2 size={14} />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDeleteEvent(selectedEvent)}
                      className="py-2 px-3 bg-[#FFB7B2] hover:bg-rose-300 text-rose-950 rounded-xl font-bold text-xs border-2 border-[#4A3E3D] flex items-center justify-center gap-1.5 cursor-pointer shadow-kawaii-sm"
                    >
                      <Trash2 size={14} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* VISTA DE EDICIÓN */
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div className="text-center mb-3">
                  <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center justify-center gap-2">
                    <Edit2 size={18} className="text-purple-600 dark:text-purple-400" />
                    <span>Editar {selectedEvent.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Concepto / Título</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="kawaii-input w-full text-xs"
                    placeholder="Ej. Sueldo, Arriendo, Supermercado"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Monto ($)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="kawaii-input w-full text-xs"
                    placeholder="Monto"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="kawaii-input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Categoría</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="kawaii-input w-full text-xs cursor-pointer"
                  >
                    <option value="">Selecciona categoría</option>
                    {(selectedEvent.type === 'income' ? incomeCategories : expenseCategories).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Cuenta Bancaria / Entidad</label>
                  <select
                    value={editBankAccountId}
                    onChange={(e) => setEditBankAccountId(e.target.value)}
                    className="kawaii-input w-full text-xs cursor-pointer"
                  >
                    <option value="">Selecciona cuenta (opcional / Efectivo)</option>
                    {accountsList.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        🏛️ {acc.institution_name} - {acc.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Notas / Observaciones</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Notas opcionales..."
                    className="kawaii-input w-full text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="kawaii-btn flex-1 bg-[#D1F2E2] hover:bg-emerald-200 text-[#4A3E3D] py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>{saving ? 'Guardando...' : 'Guardar Cambios ✨'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-xs border-2 border-[#4A3E3D] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
