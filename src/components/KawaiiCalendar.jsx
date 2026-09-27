import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import KawaiiIcon from './KawaiiIcon';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Sparkles, X, Filter, Edit2, Trash2, Save
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function KawaiiCalendar() {
  const {
    calendarData,
    categories,
    bankAccountsData,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    authHeaders,
    refreshAllData
  } = useData();

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDayDate, setSelectedDayDate] = useState(null); // Fecha del día seleccionado para el modal de detalles
  const [isEditing, setIsEditing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense', 'por_pagar', 'pagado'
  const [saving, setSaving] = useState(false);

  // Estado para arrastrar y soltar (Drag & Drop y Touch)
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [pendingMove, setPendingMove] = useState(null); // { event, targetDate, originalDate }
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const touchGhostRef = React.useRef(null);
  const touchStartRef = React.useRef(null);

  // Procesar movimiento de eventos
  const processEventMove = (event, targetDate) => {
    if (!event || event.date === targetDate) return;

    if (event.is_recurring) {
      setPendingMove({ event, targetDate, originalDate: event.date });
      setShowRecurrenceModal(true);
    } else {
      executeMove(event, targetDate, 'single');
    }
  };

  const executeMove = async (event, targetDate, mode) => {
    try {
      const endpoint = event.type === 'income'
        ? `/api/incomes/${event.income_id || event.raw_id}/move`
        : `/api/expenses/${event.expense_id || event.raw_id}/move`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          new_date: targetDate,
          mode,
          original_date: event.date
        })
      });

      if (res.ok) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#FFD6E8', '#D1F2E2', '#FFF1C5', '#E3D5FF']
        });
        refreshAllData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Error al mover el evento');
      }
    } catch (err) {
      console.error('Error al mover evento:', err);
      alert('Error de conexión al mover el evento');
    } finally {
      setShowRecurrenceModal(false);
      setPendingMove(null);
      setDraggedEvent(null);
    }
  };

  // Handlers HTML5 Drag & Drop
  const handleDragStart = (e, ev) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: ev.id, date: ev.date }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedEvent(ev);
  };

  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverDate(null);
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!draggedEvent) return;
    processEventMove(draggedEvent, targetDate);
    setDraggedEvent(null);
  };

  // Handlers Táctiles (Touch Events)
  const handleTouchStart = (e, ev) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      ev,
      startX: touch.clientX,
      startY: touch.clientY,
      ghostCreated: false
    };
    setDraggedEvent(ev);
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const { ev, startX, startY } = touchStartRef.current;

    const dist = Math.hypot(touch.clientX - startX, touch.clientY - startY);
    if (dist > 8 && !touchStartRef.current.ghostCreated) {
      touchStartRef.current.ghostCreated = true;
      const ghost = document.createElement('div');
      ghost.className = 'fixed z-50 pointer-events-none px-2 py-1 rounded-xl border border-[#4A3E3D] text-[10px] font-bold shadow-lg opacity-90 transition-transform scale-105';
      ghost.style.backgroundColor = ev.type === 'income' ? '#D1F2E2' : '#FFD6E8';
      ghost.style.color = '#4A3E3D';
      ghost.innerText = `📦 ${ev.title}`;
      document.body.appendChild(ghost);
      touchGhostRef.current = ghost;
    }

    if (touchGhostRef.current) {
      touchGhostRef.current.style.left = `${touch.clientX - 40}px`;
      touchGhostRef.current.style.top = `${touch.clientY - 20}px`;

      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const dayCell = elem?.closest('[data-day-date]');
      if (dayCell) {
        const targetDate = dayCell.getAttribute('data-day-date');
        setDragOverDate(targetDate);
      } else {
        setDragOverDate(null);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (touchGhostRef.current) {
      document.body.removeChild(touchGhostRef.current);
      touchGhostRef.current = null;
    }

    if (touchStartRef.current && touchStartRef.current.ghostCreated) {
      const touch = e.changedTouches[0];
      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const dayCell = elem?.closest('[data-day-date]');
      if (dayCell) {
        const targetDate = dayCell.getAttribute('data-day-date');
        const ev = touchStartRef.current.ev;
        processEventMove(ev, targetDate);
      }
    }

    touchStartRef.current = null;
    setDragOverDate(null);
    setDraggedEvent(null);
  };

  // Campos para edición de eventos
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editBankAccountId, setEditBankAccountId] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const monthsNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const incomeCategories = categories?.filter((c) => c.type === 'income') || [];
  const expenseCategories = categories?.filter((c) => c.type === 'expense') || [];
  const bankAccounts = bankAccountsData?.accounts || [];

  // Cambiar de mes
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Cálculo de la grilla de días del mes
  const getDaysInMonthGrid = () => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0);

    const totalDays = lastDayOfMonth.getDate();
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const grid = [];

    // Días vacíos del mes anterior
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push({ empty: true, key: `empty-prev-${i}` });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      grid.push({
        dayNumber: d,
        dateStr,
        key: `day-${d}`
      });
    }

    return grid;
  };

  const gridDays = getDaysInMonthGrid();

  // Filtrar eventos
  const events = (calendarData?.events || []).filter((ev) => {
    if (filterType === 'income') return ev.type === 'income';
    if (filterType === 'expense') return ev.type === 'expense';
    if (filterType === 'por_pagar') return ev.status === 'por_pagar';
    if (filterType === 'pagado') return ev.status === 'pagado';
    return true;
  });

  // Mapa de eventos por fecha
  const eventsByDate = {};
  events.forEach((ev) => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  });

  const formatDateLong = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = days[date.getDay()];
    const monthName = monthsNames[month - 1];
    return `${dayName}, ${day} de ${monthName} de ${year}`;
  };

  const toggleEventStatus = async (event) => {
    const nextStatus = event.status === 'pagado' ? 'por_pagar' : 'pagado';

    try {
      if (event.type === 'income') {
        await fetch(`/api/incomes/${event.income_id || event.raw_id}/status`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ status: nextStatus })
        });
      } else {
        await fetch(`/api/expenses/installments/${event.raw_id}/status`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ status: nextStatus, date: event.date })
        });
      }

      if (nextStatus === 'pagado') {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD6E8', '#D1F2E2', '#FFF1C5', '#E3D5FF']
        });
      }

      // Si el evento estaba en vista de detalle individual, refrescarlo
      if (selectedEvent && selectedEvent.id === event.id) {
        setSelectedEvent({ ...selectedEvent, status: nextStatus });
      }

      refreshAllData();
    } catch (e) {
      console.error('Error al alternar estado:', e);
    }
  };

  const handleStartEdit = (event) => {
    setSelectedEvent(event);
    const cleanTitle = event.expense_title || event.title?.replace(/^🔄\s*/, '').replace(/\s*\([^)]*\)$/, '') || '';
    setEditTitle(cleanTitle);
    setEditAmount(event.total_amount || event.amount || '');
    setEditDate(event.date || '');
    setEditCategoryId(event.category_id || '');
    setEditBankAccountId(event.bank_account_id || '');
    setEditNotes(event.notes || '');
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
      console.error('Error al guardar edición de evento:', err);
      alert('Error de conexión al actualizar el registro');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (event) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${event.title}"?`)) return;

    try {
      if (event.type === 'income') {
        const incomeId = event.income_id || event.raw_id;
        await fetch(`/api/incomes/${incomeId}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
      } else {
        const expenseId = event.expense_id || event.raw_id;
        await fetch(`/api/expenses/${expenseId}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
      }

      setSelectedEvent(null);
      setIsEditing(false);
      refreshAllData();
    } catch (err) {
      console.error('Error al eliminar registro:', err);
      alert('Error de conexión al eliminar');
    }
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Encabezado e Controles del Calendario */}
      <div className="kawaii-card bg-white p-3 sm:p-4 dark:bg-[#2A2335]">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 w-full xl:w-auto">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#D1F2E2] border-2 border-[#4A3E3D] flex items-center justify-center font-bold text-lg sm:text-xl shadow-kawaii-sm shrink-0">
              📅
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                Calendario Financiero
              </h2>
              <p className="text-[11px] sm:text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">
                Toca cualquier día para ver sus movimientos
              </p>
            </div>
          </div>

          {/* Navegación por mes y año */}
          <div className="flex items-center justify-between sm:justify-center gap-2 w-full xl:w-auto">
            <button
              onClick={handlePrevMonth}
              aria-label="Mes anterior"
              className="p-1.5 sm:p-2 rounded-2xl bg-[#FFFDF0] dark:bg-[#1C1724] border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm hover:scale-105 active:scale-95 transition-transform"
            >
              <ChevronLeft size={18} className="text-[#4A3E3D] dark:text-[#F5E8FB]" />
            </button>

            <span className="text-sm sm:text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] px-3 py-1 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] min-w-[130px] sm:min-w-[150px] text-center shadow-kawaii-sm">
              {monthsNames[selectedMonth - 1]} {selectedYear}
            </span>

            <button
              onClick={handleNextMonth}
              aria-label="Siguiente mes"
              className="p-1.5 sm:p-2 rounded-2xl bg-[#FFFDF0] dark:bg-[#1C1724] border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm hover:scale-105 active:scale-95 transition-transform"
            >
              <ChevronRight size={18} className="text-[#4A3E3D] dark:text-[#F5E8FB]" />
            </button>
          </div>

          {/* Filtros de eventos */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center sm:justify-start w-full xl:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all ${
                filterType === 'all' ? 'bg-[#FFD6E8] shadow-kawaii-sm text-[#4A3E3D]' : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all ${
                filterType === 'income' ? 'bg-[#D1F2E2] shadow-kawaii-sm text-[#4A3E3D]' : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
              }`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all ${
                filterType === 'expense' ? 'bg-[#E3D5FF] shadow-kawaii-sm text-[#4A3E3D]' : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => setFilterType('por_pagar')}
              className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all ${
                filterType === 'por_pagar' ? 'bg-[#FFF1C5] shadow-kawaii-sm text-[#4A3E3D]' : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
              }`}
            >
              Por Pagar ⏳
            </button>
          </div>
        </div>
      </div>

      {/* Grilla del Calendario Mensual (Clásico con puntos en Celulares y Tablets, Extendida en Pantallas XL+) */}
      <div className="kawaii-card bg-white p-2.5 sm:p-5 dark:bg-[#2A2335]">
        {/* Cabecera Días de la semana */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 mb-2 sm:mb-3 text-center">
          {daysOfWeek.map((d) => (
            <div
              key={d}
              className="py-1 sm:py-2 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-xl border-2 border-[#4A3E3D] dark:border-[#8A7398] font-bold text-xs sm:text-sm text-[#4A3E3D] dark:text-[#F5E8FB]"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Celdas de los días */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {gridDays.map((cell) => {
            if (cell.empty) {
              return (
                <div
                  key={cell.key}
                  className="aspect-square xl:aspect-none xl:min-h-[115px] rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/10"
                />
              );
            }

            const dayEvents = eventsByDate[cell.dateStr] || [];
            const isToday = cell.dateStr === new Date().toISOString().split('T')[0];

            return (
              <div
                key={cell.key}
                data-day-date={cell.dateStr}
                onDragOver={(e) => handleDragOver(e, cell.dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, cell.dateStr)}
                onClick={() => {
                  if (touchStartRef.current?.ghostCreated) return;
                  setSelectedDayDate(cell.dateStr);
                }}
                className={`p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border-2 sm:border-3 border-[#4A3E3D] dark:border-[#8A7398] transition-all cursor-pointer select-none group hover:scale-[1.03] active:scale-95 ${
                  /* En celular y tablet en vertical (< xl): aspect-square. En pantallas grandes (>= xl): min-h-[115px] */
                  'aspect-square xl:aspect-none xl:min-h-[115px] xl:h-full flex flex-col justify-between min-w-0 overflow-hidden'
                } ${
                  dragOverDate === cell.dateStr
                    ? 'bg-[#D1F2E2] ring-4 ring-emerald-400 scale-[1.05] shadow-lg z-10'
                    : isToday
                    ? 'bg-[#FFD6E8] dark:bg-[#FFD6E8]/20 border-pink-500 dark:border-pink-400 shadow-kawaii-sm font-bold'
                    : 'bg-[#FFFDF0] dark:bg-[#1C1724] hover:bg-white dark:hover:bg-[#2A2335]'
                }`}
              >
                {/* --- VISTA CELULARES Y TABLETS EN PORTRAIT (< xl): Casillas cuadradas con número y puntos --- */}
                <div className="flex xl:hidden flex-col items-center justify-between h-full w-full min-w-0">
                  <div className="flex-1 flex items-center justify-center">
                    <span
                      className={`text-xs sm:text-base md:text-lg font-extrabold ${
                        isToday
                          ? 'text-[#4A3E3D] dark:text-[#FFD6E8]'
                          : 'text-[#4A3E3D] dark:text-[#F5E8FB]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                  </div>

                  {/* Puntos de colores para eventos */}
                  <div className="flex items-center justify-center gap-1 h-2 sm:h-3">
                    {dayEvents.slice(0, 4).map((ev, idx) => (
                      <span
                        key={ev.id || idx}
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-[#4A3E3D]/40 ${
                          ev.type === 'income'
                            ? 'bg-emerald-400'
                            : ev.status === 'por_pagar'
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                        title={`${ev.title} (${ev.type === 'income' ? 'Ingreso' : 'Gasto'})`}
                      />
                    ))}
                    {dayEvents.length > 4 && (
                      <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                    )}
                  </div>
                </div>

                {/* --- VISTA COMPUTADOR / ESCRITORIO (>= xl): Tarjetas extendidas con detalles --- */}
                <div className="hidden xl:flex flex-col justify-between h-full w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between mb-1 min-w-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border border-[#4A3E3D] font-bold ${
                        isToday
                          ? 'bg-[#FFD6E8] text-[#4A3E3D]'
                          : 'bg-white text-[#4A3E3D] dark:bg-[#2A2335] dark:text-[#F5E8FB]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#4A3E3D]/10 dark:bg-[#F5E8FB]/10 text-[#4A3E3D] dark:text-[#F5E8FB] truncate">
                        {dayEvents.length} {dayEvents.length === 1 ? 'mov' : 'movs'}
                      </span>
                    )}
                  </div>

                  {/* Pills de Eventos detallados con recorte estricto */}
                  <div className="space-y-1 overflow-y-auto max-h-[75px] scrollbar-none my-1 min-w-0 w-full">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <button
                        key={ev.id}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, ev)}
                        onTouchStart={(e) => handleTouchStart(e, ev)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (touchStartRef.current?.ghostCreated) return;
                          setSelectedEvent(ev);
                          setIsEditing(false);
                        }}
                        className={`w-full max-w-full min-w-0 text-left px-2 py-1 rounded-xl border border-[#4A3E3D] text-[11px] font-bold transition-transform hover:scale-102 flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing ${
                          ev.type === 'income'
                            ? 'bg-[#D1F2E2] text-emerald-950'
                            : ev.status === 'pagado'
                            ? 'bg-emerald-100 text-emerald-950'
                            : 'bg-[#FFD6E8] text-rose-950'
                        }`}
                      >
                        <span className="truncate min-w-0 flex-1">{ev.title}</span>
                        <span className="text-[10px] shrink-0">
                          {ev.status === 'pagado' ? '✨' : '⏳'}
                        </span>
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-center font-bold text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 bg-[#FFF1C5] dark:bg-amber-900/40 py-0.5 rounded-lg border border-[#4A3E3D]/30 truncate min-w-0">
                        + {dayEvents.length - 2} más
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL CON LA LISTA DE MOVIMIENTOS DEL DÍA */}
      {selectedDayDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#4A3E3D]/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="kawaii-card max-w-md w-full max-h-[90vh] flex flex-col relative bg-[#FFFDF0] dark:bg-[#2A2335] border-3 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii animate-in zoom-in duration-200">
            {/* Header Modal Día */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#4A3E3D]/20 dark:border-[#8A7398]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FFD6E8] border-2 border-[#4A3E3D] flex items-center justify-center text-lg font-bold shadow-kawaii-sm">
                  🗓️
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#4A3E3D] dark:text-[#F5E8FB] capitalize">
                    {formatDateLong(selectedDayDate)}
                  </h3>
                  {selectedDayDate === new Date().toISOString().split('T')[0] && (
                    <span className="text-[10px] font-bold bg-[#FFD6E8] text-[#4A3E3D] px-2 py-0.5 rounded-full border border-[#4A3E3D]">
                      ¡Hoy! ✨
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedDayDate(null)}
                aria-label="Cerrar modal"
                className="p-1.5 rounded-full bg-[#FFB7B2] border-2 border-[#4A3E3D] shadow-kawaii-sm hover:scale-110 active:scale-95 transition-transform"
              >
                <X size={16} />
              </button>
            </div>

            {/* Lista de Movimientos */}
            {(() => {
              const dayEvents = eventsByDate[selectedDayDate] || [];

              return (
                <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 scrollbar-thin">
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>Movimientos del Día ({dayEvents.length})</span>
                    </span>
                  </div>

                  {dayEvents.length > 0 ? (
                    <div className="space-y-2.5">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] bg-white dark:bg-[#1C1724] shadow-kawaii-sm flex flex-col gap-2 transition-transform hover:scale-[1.01]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <KawaiiIcon
                                name={ev.category_icon || (ev.type === 'income' ? 'wallet' : 'shopping-bag')}
                                color={ev.category_color || (ev.type === 'income' ? '#D1F2E2' : '#FFD6E8')}
                                size="sm"
                              />
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB] line-clamp-1">
                                  {ev.title}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border border-[#4A3E3D] ${
                                    ev.type === 'income'
                                      ? 'bg-[#D1F2E2] text-emerald-950'
                                      : 'bg-[#FFD6E8] text-rose-950'
                                  }`}>
                                    {ev.type === 'income' ? '💰 Ingreso' : '💸 Gasto'}
                                  </span>
                                  {ev.category_name && (
                                    <span className="text-[9px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 font-semibold">
                                      • {ev.category_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`text-xs sm:text-sm font-extrabold block ${
                                ev.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {ev.type === 'income' ? '+' : '-'}{formatMoney(ev.amount || ev.total_amount)}
                              </span>
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-[#4A3E3D] mt-0.5 whitespace-nowrap shrink-0 ${
                                ev.status === 'pagado' ? 'bg-[#D1F2E2] text-emerald-900' : 'bg-[#FFB7B2] text-rose-900'
                              }`}>
                                {ev.status === 'pagado' ? 'Pagado' : 'Por Pagar'}
                              </span>
                            </div>
                          </div>

                          {/* Acciones para cada movimiento */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 gap-2">
                            <button
                              onClick={() => toggleEventStatus(ev)}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-[#FFFDF0] dark:bg-[#2A2335] hover:bg-[#FFE6C7] border-2 border-[#4A3E3D] text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-1 cursor-pointer shadow-kawaii-sm transition-transform active:scale-95"
                            >
                              <Sparkles size={12} className="text-amber-500" />
                              <span>{ev.status === 'pagado' ? 'Marcar Por Pagar' : '¡Marcar Pagado! ✨'}</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEdit(ev)}
                                className="p-1.5 rounded-xl bg-[#E3D5FF] border-2 border-[#4A3E3D] text-[#4A3E3D] hover:scale-110 active:scale-95 transition-transform"
                                title="Editar"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(ev)}
                                className="p-1.5 rounded-xl bg-[#FFB7B2] border-2 border-[#4A3E3D] text-rose-950 hover:scale-110 active:scale-95 transition-transform"
                                title="Eliminar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 bg-white dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 space-y-2">
                      <div className="text-4xl">🌸✨</div>
                      <h4 className="text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                        Sin movimientos en este día
                      </h4>
                      <p className="text-xs text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 max-w-xs mx-auto">
                        ¡Un día libre de gastos!
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Footer Modal Día */}
            <div className="pt-3 border-t-2 border-[#4A3E3D]/20 dark:border-[#8A7398]/30">
              <button
                onClick={() => setSelectedDayDate(null)}
                className="w-full py-2 bg-[#FFD6E8] hover:bg-pink-200 text-[#4A3E3D] font-bold text-xs rounded-xl border-2 border-[#4A3E3D] shadow-kawaii-sm transition-transform active:scale-98"
              >
                Cerrar Lista ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popover / Modal de Detalle individual o Edición de Evento */}
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
              /* VISTA DE DETALLE DEL EVENTO INDIVIDUAL */
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
                    <span className="font-bold text-[#4A3E3D] dark:text-[#F5E8FB] text-sm">{formatMoney(selectedEvent.amount || selectedEvent.total_amount)}</span>
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

                  {selectedEvent.card_name && (
                    <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1">
                      <span className="text-gray-500 dark:text-gray-400">Tarjeta:</span>
                      <span className="font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">{selectedEvent.card_name}</span>
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
              /* VISTA DE EDICIÓN DEL EVENTO */
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
                    {bankAccounts.map((acc) => (
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

      {/* Modal de decisión para eventos cíclicos movidos */}
      {showRecurrenceModal && pendingMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A3E3D]/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="kawaii-card max-w-md w-[92vw] sm:w-full max-h-[90vh] overflow-y-auto relative bg-[#FFFDF0] dark:bg-[#2A2335] border-3 border-[#4A3E3D] shadow-kawaii animate-in zoom-in duration-200">
            <button
              onClick={() => {
                setShowRecurrenceModal(false);
                setPendingMove(null);
              }}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-[#FFB7B2] border-2 border-[#4A3E3D] shadow-kawaii-sm hover:scale-110"
            >
              <X size={16} />
            </button>

            <div className="text-center mb-4">
              <div className="inline-block p-3 rounded-2xl bg-[#FFE6C7] border-2 border-[#4A3E3D] shadow-kawaii-sm mb-2 text-3xl">
                🔄✨
              </div>
              <h3 className="text-lg font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                ¿Cómo deseas mover este evento cíclico?
              </h3>
              <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 mt-1">
                Moviste <strong>"{pendingMove.event.title?.replace(/^🔄\s*/, '')}"</strong> del día{' '}
                <span className="font-bold underline">{pendingMove.originalDate.split('-')[2]}</span> al día{' '}
                <span className="font-bold underline text-emerald-600 dark:text-emerald-400">{pendingMove.targetDate.split('-')[2]}</span>.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => executeMove(pendingMove.event, pendingMove.targetDate, 'single')}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-[#4A3E3D] bg-[#D1F2E2] hover:bg-emerald-200 text-[#4A3E3D] transition-transform hover:scale-101 shadow-kawaii-sm cursor-pointer"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>📅</span>
                  <span>Cambio Único (Solo este mes)</span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5 ml-6">
                  Mueve la fecha solo para este mes. Los meses siguientes mantendrán su día habitual.
                </p>
              </button>

              <button
                onClick={() => executeMove(pendingMove.event, pendingMove.targetDate, 'cycle')}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-[#4A3E3D] bg-[#FFD6E8] hover:bg-pink-200 text-[#4A3E3D] transition-transform hover:scale-101 shadow-kawaii-sm cursor-pointer"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>🔄</span>
                  <span>Actualizar el Ciclo (De aquí en adelante)</span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5 ml-6">
                  Cambia el día de cobro/pago para este mes y todos los meses futuros a partir de ahora.
                </p>
              </button>

              <button
                onClick={() => {
                  setShowRecurrenceModal(false);
                  setPendingMove(null);
                }}
                className="w-full py-2 font-bold text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 text-center cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
