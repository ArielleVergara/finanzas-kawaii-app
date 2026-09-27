import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { CreditCard, Plus, Trash2, Calendar, Sparkles, ShieldCheck } from 'lucide-react';

export default function CreditCardManager() {
  const { creditCards, authHeaders, refreshAllData } = useData();

  const [cardName, setCardName] = useState('');
  const [bankName, setBankName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('25');
  const [dueDay, setDueDay] = useState('5');
  const [color, setColor] = useState('#E3D5FF');
  const [loading, setLoading] = useState(false);

  const cardColors = [
    { name: 'Lavanda Pastel', hex: '#E3D5FF' },
    { name: 'Rosa Pastel', hex: '#FFD6E8' },
    { name: 'Menta Pastel', hex: '#D1F2E2' },
    { name: 'Cielo Pastel', hex: '#D0F4DE' },
    { name: 'Durazno Pastel', hex: '#FFE6C7' },
    { name: 'Mantequilla Pastel', hex: '#FFF1C5' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cardName) return;

    setLoading(true);
    try {
      const res = await fetch('/api/credit-cards', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          card_name: cardName,
          bank_name: bankName,
          last_four: lastFour,
          credit_limit: Number(creditLimit) || 0,
          closing_day: Number(closingDay) || 1,
          due_day: Number(dueDay) || 10,
          color
        })
      });

      if (res.ok) {
        setCardName('');
        setBankName('');
        setLastFour('');
        setCreditLimit('');
        refreshAllData();
      }
    } catch (err) {
      console.error('Error al agregar tarjeta:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Deseas eliminar esta tarjeta de crédito?')) return;
    try {
      await fetch(`/api/credit-cards/${id}`, {
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
        <h2 className="text-2xl font-bold text-[#4A3E3D] flex items-center gap-2">
          <CreditCard className="text-purple-600" size={28} />
          <span>Tarjetas de Crédito</span>
        </h2>
        <p className="text-xs text-[#4A3E3D]/80">Administra tus tarjetas de crédito, cupos y fechas de corte y vencimiento</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="kawaii-card bg-[#E3D5FF]/30 lg:col-span-1 h-fit">
          <h3 className="text-base font-bold text-[#4A3E3D] mb-4 flex items-center gap-2">
            <Plus size={18} />
            <span>Nueva Tarjeta</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Nombre de la Tarjeta</label>
              <input
                type="text"
                required
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Ej. Visa Gold, Mastercard Viajes"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Banco / Emisor</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ej. Banco Estado, Santander, Falabella"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Últimos 4 Dígitos</label>
                <input
                  type="text"
                  maxLength={4}
                  value={lastFour}
                  onChange={(e) => setLastFour(e.target.value)}
                  placeholder="1234"
                  className="kawaii-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Cupo / Límite ($)</label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="1500000"
                  className="kawaii-input w-full text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Día de Corte</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value)}
                  className="kawaii-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Día de Pago</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="kawaii-input w-full text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1.5">Color Temático</label>
              <div className="flex items-center gap-2">
                {cardColors.map((c) => (
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

            <button
              type="submit"
              disabled={loading}
              className="kawaii-btn w-full bg-[#E3D5FF] hover:bg-purple-200 text-[#4A3E3D] py-2.5 text-sm flex items-center justify-center gap-2 mt-4"
            >
              <Sparkles size={16} />
              <span>{loading ? 'Guardando...' : 'Guardar Tarjeta'}</span>
            </button>
          </form>
        </div>

        {/* Listado de Tarjetas Estilo Kawaii */}
        <div className="kawaii-card bg-white lg:col-span-2">
          <h3 className="text-base font-bold text-[#4A3E3D] mb-4">Mis Tarjetas Registradas</h3>

          {creditCards.length === 0 ? (
            <div className="text-center py-10 bg-[#FFFDF0] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30">
              <span className="text-4xl">💳</span>
              <p className="text-sm font-bold text-[#4A3E3D] mt-2">No has agregado ninguna tarjeta de crédito aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creditCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-3xl border-3 border-[#4A3E3D] p-4 shadow-kawaii relative overflow-hidden transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: card.color || '#E3D5FF' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#4A3E3D]/80 uppercase tracking-widest block">
                        {card.bank_name || 'Tarjeta de Crédito'}
                      </span>
                      <h4 className="text-lg font-bold text-[#4A3E3D] mt-0.5">{card.card_name}</h4>
                    </div>

                    <button
                      onClick={() => handleDelete(card.id)}
                      className="p-1 rounded-xl bg-white/70 border border-[#4A3E3D] hover:bg-rose-100 text-[#4A3E3D] transition-colors"
                      title="Eliminar tarjeta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="my-4 flex items-center justify-between font-mono font-bold text-sm text-[#4A3E3D]">
                    <span>•••• •••• ••••</span>
                    <span className="text-base">{card.last_four || '1234'}</span>
                  </div>

                  <div className="pt-2 border-t-2 border-dashed border-[#4A3E3D]/30 flex items-center justify-between text-xs font-bold text-[#4A3E3D]">
                    <div>
                      <span className="block text-[10px] opacity-75">Corte: Día {card.closing_day}</span>
                      <span className="block text-[10px] opacity-75">Pago: Día {card.due_day}</span>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] opacity-75">Cupo Total</span>
                      <span>{formatMoney(card.credit_limit)}</span>
                    </div>
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
