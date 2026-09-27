import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import KawaiiIcon, { availableIcons } from './KawaiiIcon';
import {
  ShoppingCart, Plus, CreditCard, Calendar, Trash2, Edit2, X,
  CheckCircle2, Clock, ChevronDown, ChevronUp, Sparkles, Layers, Repeat, Landmark
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ExpenseManager() {
  const { expenses, categories, bankAccountsData, authHeaders, refreshAllData } = useData();

  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('contado'); // 'contado', 'tarjeta'
  const [isRecurring, setIsRecurring] = useState(false);
  const [bankAccountId, setBankAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialStatus, setInitialStatus] = useState('por_pagar');
  const [recurrencePeriod, setRecurrencePeriod] = useState('monthly');
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [loading, setLoading] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const bankAccounts = bankAccountsData?.accounts || [];

  const selectedAccount = bankAccounts.find((a) => a.id === bankAccountId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !totalAmount || !startDate) {
      alert('Por favor completa el concepto, monto y fecha del gasto.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const finalInitialStatus = startDate < todayStr ? 'pagado' : initialStatus;

    setLoading(true);
    try {
      const numCuotas = paymentMethod === 'tarjeta' ? Math.max(1, Number(totalInstallments)) : 1;

      const payload = {
        title: title.trim(),
        total_amount: Number(totalAmount),
        payment_method: paymentMethod,
        bank_account_id: bankAccountId || null,
        category_id: categoryId || null,
        total_installments: numCuotas,
        start_date: startDate,
        initial_status: finalInitialStatus,
        is_recurring: isRecurring ? 1 : 0,
        recurrence_period: recurrencePeriod,
        notes
      };

      if (editingId) {
        const res = await fetch(`/api/expenses/${editingId}`, {
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
          alert(errData.error || 'Error al actualizar el gasto');
        }
      } else {
        const res = await fetch('/api/expenses', {
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
          alert(errData.error || 'Error al guardar el gasto');
        }
      }
    } catch (err) {
      console.error('Error al guardar gasto:', err);
      alert('Error de conexión al guardar el gasto');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (exp) => {
    setEditingId(exp.id);
    setTitle(exp.title || '');
    setTotalAmount(exp.total_amount || '');
    setPaymentMethod(exp.payment_method || 'contado');
    setBankAccountId(exp.bank_account_id || '');
    setCategoryId(exp.category_id || '');
    setTotalInstallments(exp.total_installments || 1);
    setStartDate(exp.start_date || new Date().toISOString().split('T')[0]);
    setNotes(exp.notes || '');
    setIsRecurring(exp.is_recurring === 1);
    setRecurrencePeriod(exp.recurrence_period || 'monthly');
  };

  const resetForm = () => {
    setTitle('');
    setTotalAmount('');
    setPaymentMethod('contado');
    setBankAccountId('');
    setCategoryId('');
    setTotalInstallments(1);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEditingId(null);
  };

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#FFD6E8');
  const [newCatIcon, setNewCatIcon] = useState('shopping-bag');

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: newCatName.trim(),
          type: 'expense',
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

  const toggleInstallmentStatus = async (installmentId, currentStatus) => {
    const nextStatus = currentStatus === 'pagado' ? 'por_pagar' : 'pagado';
    try {
      const res = await fetch(`/api/expenses/installments/${installmentId}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok && nextStatus === 'pagado') {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#FFD6E8', '#D1F2E2', '#FFF1C5', '#E3D5FF']
        });
      }

      refreshAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este gasto y todas sus cuotas?')) return;
    try {
      await fetch(`/api/expenses/${id}`, {
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

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
          <ShoppingCart className="text-rose-600 dark:text-rose-400" size={28} />
          <span>Gestión de Gastos y Cuotas</span>
        </h2>
        <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">Registra compras al contado, en cuotas o gastos cíclicos asociados a tu banco</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de registro */}
        <div className="kawaii-card bg-[#FFD6E8]/30 dark:bg-[#2A2335] lg:col-span-1 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
              <Plus size={18} />
              <span>{editingId ? 'Editar Gasto' : 'Nuevo Gasto'}</span>
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
                placeholder="Ej. Supermercado, Gastos Comunes, Luz"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Monto ($)</label>
              <input
                type="number"
                required
                min="1"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="Ej. 120000"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Cuenta Bancaria / Entidad</label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="kawaii-input w-full text-sm cursor-pointer"
              >
                <option value="">Selecciona cuenta (opcional / Efectivo)</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    🏛️ {acc.institution_name} - {acc.account_name} ({acc.has_credit_card ? 'Con Crédito' : 'Débito/Saldo'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Modalidad de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setPaymentMethod('contado'); setTotalInstallments(1); }}
                  className={`py-2 px-2 rounded-xl font-bold text-xs border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all flex items-center justify-center gap-1 font-bold ${
                    paymentMethod === 'contado' ? 'bg-[#FFF1C5] text-[#4A3E3D] shadow-kawaii' : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
                  }`}
                >
                  <span>💵 Saldo / Débito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('tarjeta')}
                  className={`py-2 px-2 rounded-xl font-bold text-xs border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all flex items-center justify-center gap-1 font-bold ${
                    paymentMethod === 'tarjeta' ? 'bg-[#E3D5FF] text-[#4A3E3D] shadow-kawaii' : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
                  }`}
                >
                  <span>💳 Crédito / Cuotas</span>
                </button>
              </div>
            </div>

            {paymentMethod === 'tarjeta' && (
              <div className="space-y-2 p-3 bg-white dark:bg-[#1C1724] rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398]">
                <div>
                  <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Número de Cuotas</label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    className="kawaii-input w-full text-sm"
                  />
                  {totalAmount && totalInstallments > 1 && (
                    <p className="text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-1">
                      ➔ {totalInstallments} cuotas de {formatMoney(Number(totalAmount) / totalInstallments)} cada una
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Opción Cíclico / Recurrente */}
            <div className="p-3 bg-white dark:bg-[#1C1724] rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-1.5">
                  <Repeat size={16} className="text-rose-600 dark:text-rose-400" />
                  <span>¿Gasto Cíclico / Recurrente?</span>
                </span>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 cursor-pointer"
                />
              </div>

              {isRecurring && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Frecuencia del Gasto Cíclico</label>
                  <select
                    value={recurrencePeriod}
                    onChange={(e) => setRecurrencePeriod(e.target.value)}
                    className="kawaii-input w-full text-xs cursor-pointer"
                  >
                    <option value="monthly">📅 Mensual (Agua, Luz, Internet, Gas, Arriendo)</option>
                    <option value="biweekly">🗓️ Quincenal (Mercado quincenal)</option>
                    <option value="weekly">📆 Semanal (Gastos semanales)</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">Clasificación / Categoría</label>
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(true)}
                  className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus size={12} /> Nueva Categoría
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="kawaii-input w-full text-sm cursor-pointer"
              >
                <option value="">Selecciona categoría</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Fecha de Registro / Primera Cuota</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  const todayStr = new Date().toISOString().split('T')[0];
                  if (val < todayStr) {
                    setInitialStatus('pagado');
                  } else {
                    setInitialStatus('por_pagar');
                  }
                }}
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Notas / Observaciones</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
                className="kawaii-input w-full text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="kawaii-btn w-full bg-[#FFD6E8] hover:bg-[#FFB7B2] text-[#4A3E3D] py-2.5 text-sm flex items-center justify-center gap-2 mt-4"
            >
              <Sparkles size={16} />
              <span>{loading ? 'Guardando...' : editingId ? 'Actualizar Gasto' : 'Guardar Gasto'}</span>
            </button>
          </form>
        </div>

        {/* Listado de Gastos */}
        <div className="kawaii-card bg-white dark:bg-[#2A2335] lg:col-span-2">
          <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-4">Historial de Gastos</h3>

          {expenses.length === 0 ? (
            <div className="text-center py-10 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30 dark:border-[#8A7398]">
              <span className="text-4xl">🛍️</span>
              <p className="text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-2">No has registrado ningún gasto aún</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {expenses.map((exp) => {
                const isExpanded = expandedExpenseId === exp.id;
                const paidCount = exp.installments?.filter((i) => i.status === 'pagado').length || 0;

                return (
                  <div
                    key={exp.id}
                    className="rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] bg-[#FFFDF0] dark:bg-[#1C1724] overflow-hidden transition-all"
                  >
                    {/* Ficha resumen del gasto */}
                    <div className="p-3 sm:p-3.5 space-y-2">
                      {/* Fila Principal: Ícono + Título + Categoría/Banco + Badges a la izquierda, Monto y Columna de Botones a la derecha */}
                      <div className="flex items-center justify-between gap-3">
                        {/* Izquierda: Ícono + Detalle del gasto */}
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <KawaiiIcon
                            name={exp.category_icon || 'shopping-bag'}
                            color={exp.category_color || '#FFD6E8'}
                            size="md"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-xs sm:text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB] truncate">
                              {exp.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 font-medium">
                              {exp.category_name && <span>{exp.category_name}</span>}
                              {exp.institution_name && (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                  🏛️ {exp.institution_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Derecha: Monto (Tamaño Original Grande) + Columna de Acciones (Editar ARRIBA, Eliminar ABAJO) */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right shrink-0">
                            <span className="text-base sm:text-lg md:text-xl font-bold text-rose-700 dark:text-rose-400 block whitespace-nowrap">
                              {formatMoney(exp.total_amount)}
                            </span>
                          </div>

                          {/* Acciones: Columna en Móvil (Editar arriba, Eliminar abajo), Fila horizontal en PC */}
                          <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 shrink-0">
                            <button
                              onClick={() => handleEdit(exp)}
                              className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-[#2A2335] rounded-xl transition-colors"
                              title="Editar gasto"
                            >
                              <Edit2 size={16} />
                            </button>

                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-[#2A2335] rounded-xl transition-colors"
                              title="Eliminar gasto"
                            >
                              <Trash2 size={16} />
                            </button>

                            {!exp.is_recurring && (
                              <button
                                onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                                className="p-1 bg-white dark:bg-[#2A2335] rounded-lg border border-[#4A3E3D] dark:border-[#8A7398] hover:bg-gray-100 dark:hover:bg-[#1C1724] transition-colors mt-0.5 md:mt-0"
                                title="Ver cuotas desglosadas"
                              >
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Fila Secundaria: Badges de Modalidad, Cíclico y Estado */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-gray-200/50 dark:border-gray-800/50">
                        {exp.payment_method === 'tarjeta' ? (
                          <span className="text-[10px] font-bold bg-[#E3D5FF] text-[#4A3E3D] px-2 py-0.5 rounded-full border border-[#4A3E3D] whitespace-nowrap">
                            💳 Crédito ({exp.total_installments} cuotas)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-[#FFF1C5] text-[#4A3E3D] px-2 py-0.5 rounded-full border border-[#4A3E3D] whitespace-nowrap">
                            💵 Débito/Saldo
                          </span>
                        )}

                        {exp.is_recurring === 1 && (
                          <span className="text-[10px] font-bold bg-[#D1F2E2] text-emerald-950 px-2 py-0.5 rounded-full border border-[#4A3E3D] flex items-center gap-1 whitespace-nowrap">
                            <Repeat size={10} />
                            <span>Cíclico ({exp.recurrence_period === 'weekly' ? 'Semanal' : exp.recurrence_period === 'biweekly' ? 'Quincenal' : 'Mensual'})</span>
                          </span>
                        )}

                        {!exp.is_recurring && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#4A3E3D] whitespace-nowrap ${
                            exp.total_installments > 1
                              ? 'bg-[#E3D5FF] text-[#4A3E3D]'
                              : exp.installments[0]?.status === 'pagado'
                              ? 'bg-[#D1F2E2] text-emerald-950'
                              : 'bg-[#FFB7B2] text-rose-950'
                          }`}>
                            {exp.total_installments > 1
                              ? `${paidCount}/${exp.total_installments} cuotas`
                              : exp.installments[0]?.status === 'pagado' ? 'Pagado' : 'Por Pagar'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Desglose de cuotas cuando está desplegado */}
                    {isExpanded && !exp.is_recurring && (
                      <div className="bg-white dark:bg-[#2A2335] p-3 border-t-2 border-[#4A3E3D] dark:border-[#8A7398] space-y-2">
                        <h5 className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-1.5 mb-2">
                          <Layers size={14} />
                          <span>Desglose de Cuotas Mensuales</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {exp.installments?.map((inst) => (
                            <div
                              key={inst.id}
                              className={`p-2.5 rounded-xl border border-[#4A3E3D] dark:border-[#8A7398] flex items-center justify-between text-xs font-medium ${
                                inst.status === 'pagado' ? 'bg-[#D1F2E2]/50 text-[#4A3E3D]' : 'bg-[#FFB7B2]/40 text-[#4A3E3D]'
                              }`}
                            >
                              <div>
                                <span className="font-bold text-[#4A3E3D]">
                                  Cuota {inst.installment_number}/{inst.total_installments}
                                </span>
                                <p className="text-[10px] text-[#4A3E3D]/80">Vence: {inst.due_date}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-bold">{formatMoney(inst.amount)}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleInstallmentStatus(inst.id, inst.status)}
                                  className={`px-2 py-0.5 rounded-lg border border-[#4A3E3D] text-[10px] font-bold cursor-pointer transition-transform hover:scale-105 ${
                                    inst.status === 'pagado'
                                      ? 'bg-emerald-200 text-emerald-900'
                                      : 'bg-rose-200 text-rose-900'
                                  }`}
                                >
                                  {inst.status === 'pagado' ? 'Pagado' : 'Marcar Pagado'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Crear Nueva Categoría de Gasto */}
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
              <div className="inline-block p-3 rounded-2xl bg-[#FFD6E8] border-3 border-[#4A3E3D] shadow-kawaii mb-2 text-2xl">
                🛍️✨
              </div>
              <h3 className="text-lg font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                Nueva Categoría de Gasto
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
                  placeholder="Ej. Mascotas, Gimnasio, Restaurantes"
                  className="kawaii-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Color Pastel</label>
                <div className="flex items-center gap-2">
                  {['#FFD6E8', '#E3D5FF', '#D1F2E2', '#FFF1C5', '#FFE6C7', '#D0F4DE'].map((hex) => (
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
                        newCatIcon === ic ? 'bg-[#FFD6E8] border-[#4A3E3D] shadow-kawaii-sm' : 'border-transparent hover:bg-gray-100 dark:hover:bg-[#2A2335]'
                      }`}
                    >
                      <KawaiiIcon name={ic} color={newCatColor} size="sm" />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="kawaii-btn w-full bg-[#FFD6E8] hover:bg-[#FFB7B2] text-[#4A3E3D] py-2 text-xs flex items-center justify-center gap-2 mt-4"
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
