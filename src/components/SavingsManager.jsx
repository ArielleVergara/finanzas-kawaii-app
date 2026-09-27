import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import KawaiiIcon, { availableIcons } from './KawaiiIcon';
import { PiggyBank, Plus, Trash2, Edit2, Sparkles, Landmark, Coins } from 'lucide-react';

export default function SavingsManager() {
  const { savingsData, authHeaders, refreshAllData } = useData();

  const [institutionName, setInstitutionName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [color, setColor] = useState('#D1F2E2');
  const [icon, setIcon] = useState('piggy-bank');
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const colorsList = [
    { name: 'Menta', hex: '#D1F2E2' },
    { name: 'Lavanda', hex: '#E3D5FF' },
    { name: 'Rosa', hex: '#FFD6E8' },
    { name: 'Amarillo', hex: '#FFF1C5' },
    { name: 'Durazno', hex: '#FFE6C7' },
    { name: 'Cielo', hex: '#D0F4DE' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!institutionName || !accountName) return;

    setLoading(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/savings/${editingId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            institution_name: institutionName,
            account_name: accountName,
            amount: Number(amount) || 0,
            color,
            icon,
            notes
          })
        });

        if (res.ok) {
          resetForm();
          refreshAllData();
        }
      } else {
        const res = await fetch('/api/savings', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            institution_name: institutionName,
            account_name: accountName,
            amount: Number(amount) || 0,
            color,
            icon,
            notes
          })
        });

        if (res.ok) {
          resetForm();
          refreshAllData();
        }
      }
    } catch (err) {
      console.error('Error al guardar fuente de ahorro:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInstitutionName('');
    setAccountName('');
    setAmount('');
    setNotes('');
    setEditingId(null);
  };

  const handleEdit = (src) => {
    setEditingId(src.id);
    setInstitutionName(src.institution_name);
    setAccountName(src.account_name);
    setAmount(src.amount);
    setColor(src.color || '#D1F2E2');
    setIcon(src.icon || 'piggy-bank');
    setNotes(src.notes || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Deseas eliminar esta fuente de ahorro?')) return;
    try {
      await fetch(`/api/savings/${id}`, {
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

  const totalSavings = savingsData?.total || 0;
  const sources = savingsData?.sources || [];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-[#4A3E3D] flex items-center gap-2">
          <PiggyBank className="text-purple-600" size={28} />
          <span>Fuentes de Ahorro y Cuentas</span>
        </h2>
        <p className="text-xs text-[#4A3E3D]/80">Registra tus fondos en bancos, inversiones, fondos mutuos o efectivo</p>
      </div>

      {/* Banner de Suma Total Acumulada */}
      <div className="kawaii-card bg-[#E3D5FF]/60 border-3 border-[#4A3E3D] p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <KawaiiIcon name="piggy-bank" color="#E3D5FF" size="xl" />
            <div>
              <span className="text-xs font-bold text-[#4A3E3D]/80 uppercase tracking-widest block">
                Suma Total de Ahorros Acumulados
              </span>
              <div className="text-3xl font-bold text-[#4A3E3D] mt-0.5">
                {formatMoney(totalSavings)}
              </div>
              <p className="text-xs text-[#4A3E3D]/80 font-medium">Consolidado global de tus {sources.length} fuentes activas</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/80 p-3 rounded-2xl border-2 border-[#4A3E3D] text-xs font-bold text-[#4A3E3D]">
            <Landmark size={18} className="text-purple-700" />
            <span>{sources.length} Bancos / Instituciones</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de registro / edición */}
        <div className="kawaii-card bg-[#D1F2E2]/30 lg:col-span-1 h-fit">
          <h3 className="text-base font-bold text-[#4A3E3D] mb-4 flex items-center gap-2">
            <Plus size={18} />
            <span>{editingId ? 'Editar Fuente de Ahorro' : 'Nueva Fuente de Ahorro'}</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Banco / Institución Financiera</label>
              <input
                type="text"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Ej. Banco Estado, Fintual, Banco Chile, Efectivo"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Nombre / Tipo de Cuenta</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ej. Cuenta Ahorro Vivienda, Fondo Mutuo"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Monto Acumulado ($)</label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej. 1500000"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Color Pastel</label>
              <div className="flex items-center gap-2">
                {colorsList.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={`w-7 h-7 rounded-full border-2 border-[#4A3E3D] transition-transform ${
                      color === c.hex ? 'scale-125 shadow-kawaii-sm' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Ícono Representativo</label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="kawaii-input w-full text-sm cursor-pointer"
              >
                <option value="piggy-bank">🐷 Alcancía</option>
                <option value="landmark">🏛️ Banco</option>
                <option value="coins">🪙 Monedas</option>
                <option value="wallet">💼 Billetera</option>
                <option value="sparkles">✨ Fondo Mutuo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Notas / Propósito</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Fondo para pie de casa, viaje..."
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="kawaii-btn flex-1 bg-[#D1F2E2] hover:bg-emerald-200 text-[#4A3E3D] py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>{editingId ? 'Actualizar' : 'Guardar Ahorro'}</span>
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="kawaii-btn bg-gray-200 text-[#4A3E3D] px-3 py-2.5 text-sm"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Listado de Fuentes de Ahorro */}
        <div className="kawaii-card bg-white lg:col-span-2">
          <h3 className="text-base font-bold text-[#4A3E3D] mb-4">Detalle de Fuentes de Ahorro</h3>

          {sources.length === 0 ? (
            <div className="text-center py-10 bg-[#FFFDF0] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30">
              <span className="text-4xl">🏦</span>
              <p className="text-sm font-bold text-[#4A3E3D] mt-2">No has agregado ninguna fuente de ahorro aún</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {sources.map((src) => (
                <div
                  key={src.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl border-2 border-[#4A3E3D] shadow-kawaii-sm transition-all"
                  style={{ backgroundColor: src.color || '#D1F2E2' }}
                >
                  <div className="flex items-center gap-3">
                    <KawaiiIcon name={src.icon || 'piggy-bank'} color="#FFFFFF" size="md" />
                    <div>
                      <h4 className="text-sm font-bold text-[#4A3E3D]">{src.account_name}</h4>
                      <p className="text-xs text-[#4A3E3D]/80 font-medium">
                        🏛️ {src.institution_name}
                      </p>
                      {src.notes && <p className="text-[11px] text-[#4A3E3D]/70 italic mt-0.5">{src.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-base font-bold text-[#4A3E3D] block">
                        {formatMoney(src.amount)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleEdit(src)}
                      className="p-1.5 bg-white/80 text-[#4A3E3D] hover:bg-white rounded-xl border border-[#4A3E3D] transition-colors"
                      title="Editar ahorro"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={() => handleDelete(src.id)}
                      className="p-1.5 bg-white/80 text-rose-600 hover:bg-rose-100 rounded-xl border border-[#4A3E3D] transition-colors"
                      title="Eliminar ahorro"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
