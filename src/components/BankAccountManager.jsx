import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import KawaiiIcon from './KawaiiIcon';
import { Landmark, Plus, Trash2, Edit2, Sparkles, CreditCard, ArrowRightLeft, PiggyBank, X, TrendingUp, Calendar, Info } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BankAccountManager() {
  const { bankAccountsData, authHeaders, refreshAllData } = useData();

  const [institutionName, setInstitutionName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('corriente');
  const [isSavings, setIsSavings] = useState(false);
  const [annualReturnRate, setAnnualReturnRate] = useState('');
  const [returnFrequency, setReturnFrequency] = useState('diario'); // 'diario', 'mensual', 'variable'
  const [balance, setBalance] = useState('');
  const [hasDebitCard, setHasDebitCard] = useState(true);
  const [hasCreditCard, setHasCreditCard] = useState(false);
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('25');
  const [dueDay, setDueDay] = useState('5');
  const [lastFour, setLastFour] = useState('');
  const [color, setColor] = useState('#E3D5FF');
  const [icon, setIcon] = useState('landmark');
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Estados para Modal de Historial de Rendimientos (Inversiones Variables como Fintual)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryAccount, setSelectedHistoryAccount] = useState(null);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyEndingBalance, setHistoryEndingBalance] = useState('');
  const [accountHistoryList, setAccountHistoryList] = useState([]);

  // Estados para Modal de Transferencia a Ahorro
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNotes, setTransferNotes] = useState('');

  const [loading, setLoading] = useState(false);

  const colorsList = [
    { name: 'Lavanda', hex: '#E3D5FF' },
    { name: 'Menta', hex: '#D1F2E2' },
    { name: 'Rosa', hex: '#FFD6E8' },
    { name: 'Amarillo', hex: '#FFF1C5' },
    { name: 'Durazno', hex: '#FFE6C7' },
    { name: 'Cielo', hex: '#D0F4DE' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!institutionName.trim() || !accountName.trim()) {
      alert('Por favor completa la institución financiera (banco) y el nombre de la cuenta.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        institution_name: institutionName.trim(),
        account_name: accountName.trim(),
        account_type: accountType,
        is_savings: isSavings ? 1 : 0,
        annual_return_rate: isSavings ? (Number(annualReturnRate) || 0) : 0,
        return_frequency: isSavings ? returnFrequency : 'diario',
        balance: Number(balance) || 0,
        has_debit_card: hasDebitCard ? 1 : 0,
        has_credit_card: hasCreditCard ? 1 : 0,
        credit_limit: Number(creditLimit) || 0,
        closing_day: Number(closingDay) || 25,
        due_day: Number(dueDay) || 5,
        last_four: lastFour,
        color,
        icon,
        notes
      };

      if (editingId) {
        const res = await fetch(`/api/bank-accounts/${editingId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          resetForm();
          refreshAllData();
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#FFD6E8', '#D1F2E2', '#FFF1C5', '#E3D5FF']
          });
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'Error al actualizar la cuenta bancaria');
        }
      } else {
        const res = await fetch('/api/bank-accounts', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          resetForm();
          refreshAllData();
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#FFD6E8', '#D1F2E2', '#FFF1C5', '#E3D5FF']
          });
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'Error al guardar la cuenta bancaria');
        }
      }
    } catch (err) {
      console.error('Error al guardar cuenta bancaria:', err);
      alert('Error de conexión con el servidor al guardar la cuenta bancaria');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!sourceAccountId || !destinationAccountId || !transferAmount || !transferDate) return;

    setLoading(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          source_account_id: sourceAccountId,
          destination_account_id: destinationAccountId,
          amount: Number(transferAmount),
          date: transferDate,
          notes: transferNotes
        })
      });

      if (res.ok) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD6E8', '#D1F2E2', '#FFF1C5', '#E3D5FF']
        });
        setIsTransferModalOpen(false);
        setTransferAmount('');
        setTransferNotes('');
        refreshAllData();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al procesar la transferencia');
      }
    } catch (err) {
      console.error('Error en transferencia:', err);
    } finally {
      setLoading(false);
    }
  };

  const openHistoryModal = async (acc) => {
    setSelectedHistoryAccount(acc);
    setIsHistoryModalOpen(true);
    setHistoryEndingBalance(acc.balance || '');
    try {
      const res = await fetch(`/api/bank-accounts/${acc.id}/balance-history`, {
        headers: authHeaders()
      });
      if (res.ok) {
        setAccountHistoryList(await res.json());
      }
    } catch (e) {
      console.error('Error al cargar historial:', e);
    }
  };

  const handleHistorySubmit = async (e) => {
    e.preventDefault();
    if (!selectedHistoryAccount || !historyEndingBalance) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/bank-accounts/${selectedHistoryAccount.id}/balance-history`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          year: Number(historyYear),
          month: Number(historyMonth),
          ending_balance: Number(historyEndingBalance)
        })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`¡Rendimiento calculado! 📈 Ganancia del mes: ${formatMoney(result.calculated_yield)} (${result.yield_percentage}%)`);
        setHistoryEndingBalance('');
        // Recargar historial y datos
        const historyRes = await fetch(`/api/bank-accounts/${selectedHistoryAccount.id}/balance-history`, {
          headers: authHeaders()
        });
        if (historyRes.ok) setAccountHistoryList(await historyRes.json());
        refreshAllData();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al guardar el cierre de mes');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInstitutionName('');
    setAccountName('');
    setAccountType('corriente');
    setIsSavings(false);
    setAnnualReturnRate('');
    setReturnFrequency('diario');
    setBalance('');
    setHasDebitCard(true);
    setHasCreditCard(false);
    setCreditLimit('');
    setLastFour('');
    setNotes('');
    setEditingId(null);
  };

  const handleEdit = (acc) => {
    setEditingId(acc.id);
    setInstitutionName(acc.institution_name);
    setAccountName(acc.account_name);
    setAccountType(acc.account_type || 'corriente');
    setIsSavings(acc.is_savings === 1);
    setAnnualReturnRate(acc.annual_return_rate || '');
    setReturnFrequency(acc.return_frequency || 'diario');
    setBalance(acc.balance);
    setHasDebitCard(acc.has_debit_card === 1);
    setHasCreditCard(acc.has_credit_card === 1);
    setCreditLimit(acc.credit_limit || '');
    setClosingDay(acc.closing_day || 25);
    setDueDay(acc.due_day || 5);
    setLastFour(acc.last_four || '');
    setColor(acc.color || '#E3D5FF');
    setIcon(acc.icon || 'landmark');
    setNotes(acc.notes || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Deseas eliminar esta cuenta bancaria?')) return;
    try {
      await fetch(`/api/bank-accounts/${id}`, {
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

  const accounts = bankAccountsData?.accounts || [];
  const totalBalance = bankAccountsData?.total_balance || 0;
  const totalCreditLimit = bankAccountsData?.total_credit_limit || 0;
  const projectedReturns = bankAccountsData?.projected_returns || { daily: 0, monthly: 0, annual: 0 };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
            <Landmark className="text-purple-600 dark:text-purple-400" size={28} />
            <span>Cuentas Bancarias, Ahorros e Inversiones</span>
          </h2>
          <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">Gestiona saldos, retornos de ahorro (Copec Pay, Mach, Tenpo) e inversiones (Fintual)</p>
        </div>

        <button
          onClick={() => setIsTransferModalOpen(true)}
          className="kawaii-btn bg-[#D1F2E2] text-[#4A3E3D] px-4 py-2 text-xs flex items-center gap-2"
        >
          <ArrowRightLeft size={16} />
          <span>Mover Dinero a Ahorro ✨</span>
        </button>
      </div>

      {/* Banner Consolidado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Liquidez */}
        <div className="kawaii-card bg-[#D1F2E2]/60 dark:bg-[#1E3A2E] p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 uppercase tracking-wider block">
                Saldo Total Consolidado
              </span>
              <div className="text-2xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-0.5">
                {formatMoney(totalBalance)}
              </div>
              <p className="text-[11px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 mt-1">Líquido disponible + Cuentas de Ahorro</p>
            </div>
            <KawaiiIcon name="wallet" color="#D1F2E2" size="md" />
          </div>
        </div>

        {/* Retorno de Ahorros Proyectado */}
        <div className="kawaii-card bg-[#FFF1C5]/60 dark:bg-[#3A331E] p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 uppercase tracking-wider block flex items-center gap-1">
                <TrendingUp size={14} className="text-amber-600 dark:text-amber-400" /> Retornos Proyectados de Ahorro
              </span>
              <div className="text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-1">
                +{formatMoney(projectedReturns.daily)} <span className="text-xs font-semibold">/ día</span>
              </div>
              <p className="text-[11px] text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 mt-0.5">
                +{formatMoney(projectedReturns.monthly)} / mes • +{formatMoney(projectedReturns.annual)} / año
              </p>
            </div>
            <KawaiiIcon name="piggy-bank" color="#FFF1C5" size="md" />
          </div>
        </div>

        {/* Total Cupo de Crédito */}
        <div className="kawaii-card bg-[#E3D5FF]/60 dark:bg-[#2F213E] p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 uppercase tracking-wider block">
                Cupo Crédito Disponible
              </span>
              <div className="text-2xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-0.5">
                {formatMoney(totalCreditLimit)}
              </div>
              <p className="text-[11px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 mt-1">Límite de crédito asignado a tus tarjetas</p>
            </div>
            <KawaiiIcon name="credit-card" color="#E3D5FF" size="md" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="kawaii-card bg-[#E3D5FF]/30 dark:bg-[#2A2335] lg:col-span-1 h-fit">
          <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-4 flex items-center gap-2">
            <Plus size={18} />
            <span>{editingId ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria'}</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Banco / Institución Financiera</label>
              <input
                type="text"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Ej. Banco Estado, Fintual, BCI, Santander, Mach, Copec Pay"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Nombre de la Cuenta</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ej. Cuenta Corriente, Fondo Ahorro, Billetera"
                className="kawaii-input w-full text-sm"
              />
            </div>

            {/* Clasificación Ahorro vs Líquida y Tasa de Retorno */}
            <div className="p-3 bg-white dark:bg-[#1C1724] rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-1.5">
                  <PiggyBank size={16} className="text-purple-600 dark:text-purple-400" />
                  <span>¿Cuenta de AHORRO / Inversión?</span>
                </span>
                <input
                  type="checkbox"
                  checked={isSavings}
                  onChange={(e) => setIsSavings(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                />
              </div>

              {isSavings && (
                <div className="pt-2.5 space-y-2.5 border-t border-gray-200 dark:border-gray-700 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
                        Tasa Anual (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={annualReturnRate}
                        onChange={(e) => setAnnualReturnRate(e.target.value)}
                        placeholder="Ej. 5.5"
                        className="kawaii-input w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
                        Frecuencia Retorno
                      </label>
                      <select
                        value={returnFrequency}
                        onChange={(e) => setReturnFrequency(e.target.value)}
                        className="kawaii-input w-full text-xs cursor-pointer"
                      >
                        <option value="diario">⚡ Diario (Copec Pay, Mach)</option>
                        <option value="mensual">📅 Mensual (Plazo Fijo)</option>
                        <option value="variable">📊 Inversión Variable (Fintual)</option>
                      </select>
                    </div>
                  </div>

                  {annualReturnRate > 0 && returnFrequency !== 'variable' && Number(balance) > 0 && (
                    <div className="p-2 bg-purple-50 dark:bg-[#2A2135] rounded-xl border border-purple-300 dark:border-purple-700 text-[11px] font-bold text-purple-900 dark:text-purple-200">
                      ⚡ Rendimiento Est: ~{formatMoney(((Number(balance) * Number(annualReturnRate)) / 100) / 365)}/día | ~{formatMoney(((Number(balance) * Number(annualReturnRate)) / 100) / 12)}/mes
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Tipo de Cuenta</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="kawaii-input w-full text-xs cursor-pointer"
                >
                  <option value="corriente">Cuenta Corriente</option>
                  <option value="vista">Cuenta Vista / RUT</option>
                  <option value="ahorro">Cuenta de Ahorro</option>
                  <option value="inversion">Fondo / Inversión</option>
                  <option value="efectivo">Efectivo / Caja</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Saldo Actual ($)</label>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="Ej. 650000"
                  className="kawaii-input w-full text-sm"
                />
              </div>
            </div>

            {/* Opciones de Tarjetas (Débito y/o Crédito) */}
            <div className="p-3 bg-white dark:bg-[#1C1724] rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] space-y-2">
              <span className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Tarjetas Asociadas</span>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 font-bold cursor-pointer text-[#4A3E3D] dark:text-[#F5E8FB]">
                  <input
                    type="checkbox"
                    checked={hasDebitCard}
                    onChange={(e) => setHasDebitCard(e.target.checked)}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <span>💳 Tarjeta de Débito</span>
                </label>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 font-bold cursor-pointer text-[#4A3E3D] dark:text-[#F5E8FB]">
                  <input
                    type="checkbox"
                    checked={hasCreditCard}
                    onChange={(e) => setHasCreditCard(e.target.checked)}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <span>💳 Tarjeta de Crédito</span>
                </label>
              </div>

              {hasCreditCard && (
                <div className="pt-2 space-y-2 border-t border-gray-200 dark:border-gray-700 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Cupo Límite de Crédito ($)</label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="Ej. 1500000"
                      className="kawaii-input w-full text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-0.5">Dígitos</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={lastFour}
                        onChange={(e) => setLastFour(e.target.value)}
                        placeholder="1234"
                        className="kawaii-input w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-0.5">Corte</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={closingDay}
                        onChange={(e) => setClosingDay(e.target.value)}
                        className="kawaii-input w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-0.5">Pago</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                        className="kawaii-input w-full text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Color Pastel</label>
              <div className="flex items-center gap-2">
                {colorsList.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={`w-7 h-7 rounded-full border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-transform ${
                      color === c.hex ? 'scale-125 shadow-kawaii-sm' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="kawaii-btn w-full bg-[#E3D5FF] hover:bg-purple-200 text-[#4A3E3D] py-2.5 text-sm flex items-center justify-center gap-2 mt-4"
            >
              <Sparkles size={16} />
              <span>{editingId ? 'Actualizar' : 'Guardar Cuenta'}</span>
            </button>
          </form>
        </div>

        {/* Listado de Cuentas y Tarjetas */}
        <div className="kawaii-card bg-white dark:bg-[#2A2335] lg:col-span-2">
          <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-4">Cuentas Registradas</h3>

          {accounts.length === 0 ? (
            <div className="text-center py-10 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30 dark:border-[#8A7398]">
              <span className="text-4xl">🏛️</span>
              <p className="text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-2">No has registrado ninguna cuenta bancaria aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-3xl border-3 border-[#4A3E3D] p-4 shadow-kawaii relative overflow-hidden transition-transform hover:scale-[1.01]"
                  style={{ backgroundColor: acc.color || '#E3D5FF' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#4A3E3D]/80 uppercase tracking-widest block">
                        🏛️ {acc.institution_name} {acc.is_savings === 1 ? '• 🏦 Ahorro' : ''}
                      </span>
                      <h4 className="text-lg font-bold text-[#4A3E3D] mt-0.5">{acc.account_name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(acc)}
                        className="p-1 rounded-xl bg-white/80 hover:bg-white text-[#4A3E3D] border border-[#4A3E3D]"
                        title="Editar cuenta"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-1 rounded-xl bg-white/80 hover:bg-rose-100 text-[#4A3E3D] border border-[#4A3E3D]"
                        title="Eliminar cuenta"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="my-3 flex items-center justify-between font-bold text-sm text-[#4A3E3D]">
                    <span className="text-xs opacity-75 uppercase">Saldo en Cuenta:</span>
                    <span className="text-base font-extrabold">{formatMoney(acc.balance)}</span>
                  </div>

                  {/* Detalle de Rentabilidad para Cuentas de Ahorro */}
                  {acc.is_savings === 1 && (
                    <div className="p-2.5 bg-white/70 rounded-2xl border border-[#4A3E3D] my-2 text-xs font-bold text-[#4A3E3D] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] text-purple-900">
                          <TrendingUp size={14} />
                          {acc.return_frequency === 'variable'
                            ? '📊 Rentabilidad Variable (Fintual)'
                            : `📈 Tasa: ${acc.annual_return_rate}% EA (${acc.return_frequency === 'diario' ? 'Diario' : 'Mensual'})`}
                        </span>
                        {acc.return_frequency === 'variable' && (
                          <button
                            onClick={() => openHistoryModal(acc)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold"
                          >
                            Comparar Rendimiento
                          </button>
                        )}
                      </div>

                      {acc.return_frequency !== 'variable' && acc.projected_daily_yield > 0 && (
                        <div className="text-[10px] text-purple-950 font-bold flex items-center justify-between pt-1 border-t border-purple-200">
                          <span>⚡ +{formatMoney(acc.projected_daily_yield)} / día</span>
                          <span>📅 +{formatMoney(acc.projected_monthly_yield)} / mes</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-dashed border-[#4A3E3D]/30 space-y-1.5 text-xs font-bold text-[#4A3E3D]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {acc.has_debit_card === 1 && (
                        <span className="bg-white/80 px-2 py-0.5 rounded-full border border-[#4A3E3D] text-[10px] flex items-center gap-1">
                          <CreditCard size={12} /> Débito Activo
                        </span>
                      )}

                      {acc.has_credit_card === 1 && (
                        <span className="bg-[#FFD6E8] px-2 py-0.5 rounded-full border border-[#4A3E3D] text-[10px] flex items-center gap-1">
                          <CreditCard size={12} /> Crédito ({formatMoney(acc.credit_limit)})
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

      {/* Modal para Comparar Rendimiento Mensual de Inversiones (ej. Fintual) */}
      {isHistoryModalOpen && selectedHistoryAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A3E3D]/50 backdrop-blur-sm">
          <div className="kawaii-card max-w-lg w-[92vw] sm:w-full max-h-[90vh] overflow-y-auto relative bg-[#FFFDF0] dark:bg-[#2A2335] animate-in zoom-in duration-200">
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#FFB7B2] border-2 border-[#4A3E3D] shadow-kawaii-sm hover:scale-110"
            >
              <X size={16} />
            </button>

            <div className="text-center mb-4">
              <div className="inline-block p-3 rounded-2xl bg-[#E3D5FF] border-3 border-[#4A3E3D] shadow-kawaii mb-2 text-2xl">
                📊📈
              </div>
              <h3 className="text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                Rendimiento Real Mensual - {selectedHistoryAccount.institution_name} ({selectedHistoryAccount.account_name})
              </h3>
              <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">
                Registra el saldo al cierre de cada mes para calcular exactamente cuánto ha rentado tu inversión (Fintual / Fondos).
              </p>
            </div>

            <form onSubmit={handleHistorySubmit} className="space-y-3 p-3 bg-white dark:bg-[#1C1724] rounded-2xl border-2 border-[#4A3E3D] mb-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Año</label>
                  <input
                    type="number"
                    required
                    value={historyYear}
                    onChange={(e) => setHistoryYear(e.target.value)}
                    className="kawaii-input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Mes</label>
                  <select
                    value={historyMonth}
                    onChange={(e) => setHistoryMonth(e.target.value)}
                    className="kawaii-input w-full text-xs cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>{new Date(2024, m - 1, 1).toLocaleString('es-CL', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Saldo Cierre ($)</label>
                  <input
                    type="number"
                    required
                    value={historyEndingBalance}
                    onChange={(e) => setHistoryEndingBalance(e.target.value)}
                    placeholder="Ej. 1250000"
                    className="kawaii-input w-full text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="kawaii-btn w-full bg-[#E3D5FF] hover:bg-purple-200 text-[#4A3E3D] py-2 text-xs flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                <span>Calcular Rendimiento del Mes</span>
              </button>
            </form>

            {/* Historial Registrado */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <h4 className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">Historial de Retornos Comparados</h4>
              {accountHistoryList.length === 0 ? (
                <p className="text-xs text-gray-500 italic text-center py-4">No has registrado cierres de mes aún para esta cuenta</p>
              ) : (
                accountHistoryList.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl border border-[#4A3E3D] bg-white dark:bg-[#1C1724] flex items-center justify-between text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                    <div>
                      <span>{item.year} - Mes {item.month}</span>
                      <p className="text-[10px] text-gray-500 font-normal">Cierre: {formatMoney(item.ending_balance)} • Aportes: {formatMoney(item.net_transfers)}</p>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs block ${item.calculated_yield >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.calculated_yield >= 0 ? '+' : ''}{formatMoney(item.calculated_yield)}
                      </span>
                      <span className="text-[10px] opacity-75">({item.yield_percentage > 0 ? '+' : ''}{item.yield_percentage}%)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para Transferencia / Aporte a Ahorro */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A3E3D]/50 backdrop-blur-sm">
          <div className="kawaii-card max-w-md w-[92vw] sm:w-full max-h-[90vh] overflow-y-auto relative bg-[#FFFDF0] dark:bg-[#2A2335] animate-in zoom-in duration-200">
            <button
              onClick={() => setIsTransferModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#FFB7B2] border-2 border-[#4A3E3D] shadow-kawaii-sm hover:scale-110"
            >
              <X size={16} />
            </button>

            <div className="text-center mb-4">
              <div className="inline-block p-3 rounded-2xl bg-[#D1F2E2] border-3 border-[#4A3E3D] shadow-kawaii mb-2 text-2xl">
                🏦✨
              </div>
              <h3 className="text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                Aporte / Transferencia a Ahorro
              </h3>
              <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">
                Mueve dinero desde tu cuenta corriente hacia una cuenta de ahorro. Descuenta de tu disponible sin perder patrimonio.
              </p>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Cuenta de Origen (Descuenta disponible)</label>
                <select
                  required
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="kawaii-input w-full text-xs cursor-pointer"
                >
                  <option value="">Selecciona cuenta de origen</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      🏛️ {acc.institution_name} - {acc.account_name} ({formatMoney(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Cuenta de Ahorro / Destino (Suma al ahorro)</label>
                <select
                  required
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="kawaii-input w-full text-xs cursor-pointer"
                >
                  <option value="">Selecciona cuenta de destino</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      🏦 {acc.institution_name} - {acc.account_name} ({formatMoney(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Monto a Ahorrar ($)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Ej. 150000"
                  className="kawaii-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Fecha de la Transferencia</label>
                <input
                  type="date"
                  required
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="kawaii-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Notas / Motivo</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Ej. Ahorro para vacaciones, 10% del sueldo"
                  className="kawaii-input w-full text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="kawaii-btn w-full bg-[#D1F2E2] hover:bg-emerald-200 text-[#4A3E3D] py-2.5 text-sm flex items-center justify-center gap-2 mt-4"
              >
                <Sparkles size={16} />
                <span>{loading ? 'Procesando...' : 'Registrar Aporte a Ahorro ✨'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
