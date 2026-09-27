import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import KawaiiIcon, { availableIcons } from './KawaiiIcon';
import { DollarSign, Plus, Trash2, Edit2, CheckCircle2, Clock, Sparkles, Repeat, Landmark, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function IncomeManager() {
  const { incomes, categories, bankAccountsData, authHeaders, refreshAllData } = useData();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [status, setStatus] = useState('pagado');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState('monthly');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const bankAccounts = bankAccountsData?.accounts || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || !date) {
      alert('Por favor completa el concepto, monto y fecha del ingreso.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const finalStatus = date < todayStr ? 'pagado' : status;

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        amount: Number(amount),
        date,
        category_id: categoryId || null,
        bank_account_id: bankAccountId || null,
        status: finalStatus,
        notes,
        is_recurring: isRecurring ? 1 : 0,
        recurrence_period: recurrencePeriod
      };

      if (editingId) {
        const res = await fetch(`/api/incomes/${editingId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          resetForm();
          refreshAllData();
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'Error al actualizar el ingreso');
        }
      } else {
        const res = await fetch('/api/incomes', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          resetForm();
          refreshAllData();
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'Error al guardar el ingreso');
        }
      }
    } catch (err) {
      console.error('Error al guardar ingreso:', err);
      alert('Error de conexión al guardar el ingreso');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (inc) => {
    setEditingId(inc.id);
    setTitle(inc.title || '');
    setAmount(inc.amount || '');
    setDate(inc.date || new Date().toISOString().split('T')[0]);
    setCategoryId(inc.category_id || '');
    setBankAccountId(inc.bank_account_id || '');
    setStatus(inc.status || 'pagado');
    setNotes(inc.notes || '');
    setIsRecurring(inc.is_recurring === 1);
    setRecurrencePeriod(inc.recurrence_period || 'monthly');
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategoryId('');
    setBankAccountId('');
    setStatus('pagado');
    setNotes('');
    setIsRecurring(false);
    setRecurrencePeriod('monthly');
    setEditingId(null);
  };

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'pagado' ? 'por_pagar' : 'pagado';
    try {
      await fetch(`/api/incomes/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
      refreshAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Deseas eliminar este ingreso?')) return;
    try {
      await fetch(`/api/incomes/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      refreshAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  };

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#D1F2E2');
  const [newCatIcon, setNewCatIcon] = useState('wallet');

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: newCatName.trim(),
          type: 'income',
          color: newCatColor,
          icon: newCatIcon
        })
      });

      if (res.ok) {
        const created = await res.json();
        setNewCatName('');
        setIsCatModalOpen(false);
        await refreshAllData();
        setCategoryId(created.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Error al crear la categoría');
      }
    } catch (err) {
      console.error('Error al crear categoría:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
            <DollarSign className="text-emerald-600 dark:text-emerald-400" size={28} />
            <span>Gestión de Ingresos</span>
          </h2>
          <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">Registra salarios, ventas, aportes o ingresos cíclicos asignados a tus cuentas bancarias</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de registro */}
        <div className="kawaii-card bg-[#D1F2E2]/30 dark:bg-[#2A2335] lg:col-span-1 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
              <Plus size={18} />
              <span>{editingId ? 'Editar Ingreso' : 'Nuevo Ingreso'}</span>
            </h3>
            {editingId && (
              <button
                onClick={resetForm}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                <X size={14} /> Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Concepto / Título</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Sueldo mensual, Arriendo cobrado"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Monto ($)</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej. 850000"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Cuenta de Destino</label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="kawaii-input w-full text-sm cursor-pointer"
              >
                <option value="">Selecciona cuenta bancaria (opcional / Efectivo)</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    🏛️ {acc.institution_name} - {acc.account_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Fecha de Ingreso / Inicio</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  const val = e.target.value;
                  setDate(val);
                  const todayStr = new Date().toISOString().split('T')[0];
                  if (val <= todayStr) {
                    setStatus('pagado');
                  } else {
                    setStatus('por_pagar');
                  }
                }}
                className="kawaii-input w-full text-sm"
              />
            </div>

            {/* Opción Cíclico / Recurrente */}
            <div className="p-3 bg-white dark:bg-[#1C1724] rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-1.5">
                  <Repeat size={16} className="text-emerald-700 dark:text-emerald-400" />
                  <span>¿Ingreso Cíclico / Recurrente?</span>
                </span>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>

              {isRecurring && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Frecuencia Cíclica</label>
                  <select
                    value={recurrencePeriod}
                    onChange={(e) => setRecurrencePeriod(e.target.value)}
                    className="kawaii-input w-full text-xs cursor-pointer"
                  >
                    <option value="monthly">📅 Mensual (Cada mes)</option>
                    <option value="biweekly">🗓️ Quincenal (Cada 2 semanas)</option>
                    <option value="weekly">📆 Semanal (Todas las semanas)</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">Categoría</label>
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(true)}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus size={12} /> Nueva Categoría
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="kawaii-input w-full text-sm cursor-pointer"
              >
                <option value="">Selecciona categoría (opcional)</option>
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Estado de Pago Inicial</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('pagado')}
                  className={`py-1.5 px-3 rounded-xl font-bold text-xs border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all flex items-center justify-center gap-1 ${
                    status === 'pagado' ? 'bg-[#D1F2E2] text-[#4A3E3D] shadow-kawaii' : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
                  }`}
                >
                  <CheckCircle2 size={14} className="text-emerald-700" />
                  <span>Recibido</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('por_pagar')}
                  className={`py-1.5 px-3 rounded-xl font-bold text-xs border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all flex items-center justify-center gap-1 ${
                    status === 'por_pagar' ? 'bg-[#FFB7B2] text-[#4A3E3D] shadow-kawaii' : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
                  }`}
                >
                  <Clock size={14} className="text-rose-700" />
                  <span>Por Recibir</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Notas / Detalles</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas opcionales..."
                className="kawaii-input w-full text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="kawaii-btn w-full bg-[#D1F2E2] hover:bg-emerald-200 text-[#4A3E3D] py-2.5 text-sm flex items-center justify-center gap-2 mt-4"
            >
              <Sparkles size={16} />
              <span>{loading ? 'Guardando...' : editingId ? 'Actualizar Ingreso' : 'Guardar Ingreso'}</span>
            </button>
          </form>
        </div>

        {/* Listado de ingresos */}
        <div className="kawaii-card bg-white dark:bg-[#2A2335] lg:col-span-2">
          <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-4">Historial de Ingresos</h3>

          {incomes.length === 0 ? (
            <div className="text-center py-10 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30 dark:border-[#8A7398]">
              <span className="text-4xl">💰</span>
              <p className="text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-2">No has registrado ningún ingreso aún</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {incomes.map((inc) => (
                <div
                  key={inc.id}
                  className="rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] bg-[#FFFDF0] dark:bg-[#1C1724] overflow-hidden transition-all"
                >
                  {/* Ficha resumen del ingreso */}
                  <div className="p-3 sm:p-3.5 space-y-2">
                    {/* Fila Principal: Ícono + Título + Categoría/Banco a la izquierda, Monto y Acciones a la derecha */}
                    <div className="flex items-center justify-between gap-3">
                      {/* Izquierda: Ícono + Detalle del ingreso */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <KawaiiIcon
                          name={inc.category_icon || 'wallet'}
                          color={inc.category_color || '#D1F2E2'}
                          size="md"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="text-xs sm:text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB] truncate">
                            {inc.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 font-medium">
                            <span>{inc.date}</span>
                            {inc.category_name && <span>{inc.category_name}</span>}
                            {inc.institution_name && (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                🏛️ {inc.institution_name}
                              </span>
                            )}
                          </div>
                          {inc.notes && <p className="text-[11px] text-gray-500 italic truncate">{inc.notes}</p>}
                        </div>
                      </div>

                      {/* Derecha: Monto (Tamaño Grande) + Acciones (Columna en Móvil, Fila en PC) */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right shrink-0">
                          <span className="text-base sm:text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400 block whitespace-nowrap">
                            +{formatMoney(inc.amount)}
                          </span>
                        </div>

                        {/* Acciones: Columna en Móvil (Editar arriba, Eliminar abajo), Fila horizontal en PC */}
                        <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 shrink-0">
                          <button
                            onClick={() => handleEdit(inc)}
                            className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-[#2A2335] rounded-xl transition-colors"
                            title="Editar ingreso"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(inc.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-[#2A2335] rounded-xl transition-colors"
                            title="Eliminar ingreso"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Fila Secundaria: Badges de Estado y Cíclico en la parte de abajo */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-gray-200/50 dark:border-gray-800/50">
                      <button
                        type="button"
                        onClick={() => toggleStatus(inc.id, inc.status)}
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#4A3E3D] cursor-pointer transition-transform hover:scale-105 whitespace-nowrap ${
                          inc.status === 'pagado' ? 'bg-[#D1F2E2] text-emerald-950' : 'bg-[#FFB7B2] text-rose-950'
                        }`}
                      >
                        {inc.status === 'pagado' ? 'Recibido ✨' : 'Por Recibir ⏳'}
                      </button>

                      {inc.is_recurring === 1 && (
                        <span className="text-[10px] font-bold bg-[#D1F2E2] text-emerald-950 px-2 py-0.5 rounded-full border border-[#4A3E3D] flex items-center gap-1 whitespace-nowrap">
                          <Repeat size={10} />
                          <span>Cíclico ({inc.recurrence_period === 'weekly' ? 'Semanal' : inc.recurrence_period === 'biweekly' ? 'Quincenal' : 'Mensual'})</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Crear Nueva Categoría de Ingreso */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A3E3D]/50 backdrop-blur-sm">
          <div className="kawaii-card max-w-sm w-[92vw] sm:w-full max-h-[90vh] overflow-y-auto relative bg-[#FFFDF0] dark:bg-[#2A2335] animate-in zoom-in duration-200">
            <button
              onClick={() => setIsCatModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#FFB7B2] border-2 border-[#4A3E3D] shadow-kawaii-sm hover:scale-110"
            >
              <X size={16} />
            </button>

            <div className="text-center mb-4">
              <div className="inline-block p-3 rounded-2xl bg-[#D1F2E2] border-3 border-[#4A3E3D] shadow-kawaii mb-2 text-2xl">
                🏷️✨
              </div>
              <h3 className="text-lg font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                Nueva Categoría de Ingreso
              </h3>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ej. Freelance, Inversiones, Ventas"
                  className="kawaii-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Color Pastel</label>
                <div className="flex items-center gap-2">
                  {['#D1F2E2', '#FFD6E8', '#E3D5FF', '#FFF1C5', '#FFE6C7', '#D0F4DE'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setNewCatColor(hex)}
                      className={`w-6 h-6 rounded-full border-2 border-[#4A3E3D] transition-transform ${newCatColor === hex ? 'scale-125' : 'hover:scale-110'}`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Ícono</label>
                <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-white dark:bg-[#1C1724] rounded-xl border-2 border-[#4A3E3D]">
                  {availableIcons.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewCatIcon(ic)}
                      className={`p-1 rounded-xl border flex items-center justify-center transition-all ${
                        newCatIcon === ic ? 'bg-[#D1F2E2] border-[#4A3E3D] shadow-kawaii-sm' : 'border-transparent hover:bg-gray-100 dark:hover:bg-[#2A2335]'
                      }`}
                    >
                      <KawaiiIcon name={ic} color={newCatColor} size="sm" />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="kawaii-btn w-full bg-[#D1F2E2] hover:bg-emerald-200 text-[#4A3E3D] py-2 text-xs flex items-center justify-center gap-2 mt-4"
              >
                <Sparkles size={14} />
                <span>Crear y Seleccionar ✨</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

