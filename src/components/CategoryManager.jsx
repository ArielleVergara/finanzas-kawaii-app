import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import KawaiiIcon, { availableIcons } from './KawaiiIcon';
import { Tags, Plus, Trash2, Sparkles, Check } from 'lucide-react';
import { sanitizeInput } from '../utils/security';

export default function CategoryManager() {
  const { categories, authHeaders, refreshAllData } = useData();

  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [color, setColor] = useState('#FFD6E8');
  const [icon, setIcon] = useState('tag');
  const [loading, setLoading] = useState(false);

  const colorsList = [
    { name: 'Rosa', hex: '#FFD6E8' },
    { name: 'Menta', hex: '#D1F2E2' },
    { name: 'Amarillo', hex: '#FFF1C5' },
    { name: 'Lavanda', hex: '#E3D5FF' },
    { name: 'Durazno', hex: '#FFE6C7' },
    { name: 'Cielo', hex: '#D0F4DE' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = sanitizeInput(name, 50).trim();
    if (!cleanName) return;

    setLoading(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: cleanName, type, icon, color })
      });

      if (res.ok) {
        setName('');
        refreshAllData();
      }
    } catch (err) {
      console.error('Error al crear categoría:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar esta clasificación?')) return;
    try {
      await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      refreshAllData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
          <Tags className="text-pink-600 dark:text-pink-400" size={28} />
          <span>Clasificaciones de Gastos e Ingresos</span>
        </h2>
        <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">Personaliza tus categorías predeterminadas y crea tus propias clasificaciones con colores Kawaii</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="kawaii-card bg-[#FFE6C7]/40 dark:bg-[#2A2335] lg:col-span-1 h-fit">
          <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-4 flex items-center gap-2">
            <Plus size={18} />
            <span>Nueva Clasificación</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Nombre de la Categoría</label>
              <input
                type="text"
                required
                maxLength={50}
                value={name}
                onChange={(e) => setName(sanitizeInput(e.target.value, 50))}
                placeholder="Ej. Mascotas, Coleccionables, Cursos"
                className="kawaii-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-1.5 px-3 rounded-xl font-bold text-xs border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all ${
                    type === 'expense' ? 'bg-[#FFD6E8] text-[#4A3E3D] shadow-kawaii-sm' : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
                  }`}
                >
                  Gasto 💸
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-1.5 px-3 rounded-xl font-bold text-xs border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all ${
                    type === 'income' ? 'bg-[#D1F2E2] text-[#4A3E3D] shadow-kawaii-sm' : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]'
                  }`}
                >
                  Ingreso 💰
                </button>
              </div>
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

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Ícono</label>
              <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 bg-white dark:bg-[#1C1724] rounded-xl border-2 border-[#4A3E3D] dark:border-[#8A7398]">
                {availableIcons.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`p-1.5 rounded-xl border flex items-center justify-center transition-all ${
                      icon === ic ? 'bg-[#FFD6E8] border-[#4A3E3D] shadow-kawaii-sm' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <KawaiiIcon name={ic} color={color} size="sm" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="kawaii-btn w-full bg-[#FFE6C7] hover:bg-amber-200 text-[#4A3E3D] py-2.5 text-sm flex items-center justify-center gap-2 mt-4"
            >
              <Sparkles size={16} />
              <span>{loading ? 'Guardando...' : 'Crear Categoría'}</span>
            </button>
          </form>
        </div>

        {/* Listado de Categorías */}
        <div className="kawaii-card bg-white dark:bg-[#2A2335] lg:col-span-2 space-y-6">
          {/* Categorías de Gastos */}
          <div>
            <h3 className="text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-3 flex items-center gap-2">
              <span>Clasificaciones de Gastos</span>
              <span className="text-xs bg-[#FFD6E8] text-[#4A3E3D] px-2 py-0.5 rounded-full border border-[#4A3E3D]">
                {categories.filter(c => c.type === 'expense').length}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.filter(c => c.type === 'expense').map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm"
                  style={{ backgroundColor: cat.color || '#FFD6E8' }}
                >
                  <div className="flex items-center gap-3">
                    <KawaiiIcon name={cat.icon || 'tag'} color="#FFFFFF" size="sm" />
                    <div>
                      <h4 className="text-sm font-bold text-[#4A3E3D]">{cat.name}</h4>
                      {cat.is_default === 1 && (
                        <span className="text-[10px] font-bold text-[#4A3E3D]/70 bg-white/70 px-1.5 py-0.5 rounded-md border border-[#4A3E3D]">
                          Predeterminada
                        </span>
                      )}
                    </div>
                  </div>

                  {cat.is_default === 0 && (
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1 rounded-xl bg-white/80 hover:bg-rose-100 text-[#4A3E3D] border border-[#4A3E3D] transition-colors"
                      title="Eliminar categoría personalizada"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Categorías de Ingresos */}
          <div>
            <h3 className="text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-3 flex items-center gap-2">
              <span>Clasificaciones de Ingresos</span>
              <span className="text-xs bg-[#D1F2E2] text-[#4A3E3D] px-2 py-0.5 rounded-full border border-[#4A3E3D]">
                {categories.filter(c => c.type === 'income').length}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.filter(c => c.type === 'income').map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm"
                  style={{ backgroundColor: cat.color || '#D1F2E2' }}
                >
                  <div className="flex items-center gap-3">
                    <KawaiiIcon name={cat.icon || 'wallet'} color="#FFFFFF" size="sm" />
                    <div>
                      <h4 className="text-sm font-bold text-[#4A3E3D]">{cat.name}</h4>
                      {cat.is_default === 1 && (
                        <span className="text-[10px] font-bold text-[#4A3E3D]/70 bg-white/70 px-1.5 py-0.5 rounded-md border border-[#4A3E3D]">
                          Predeterminada
                        </span>
                      )}
                    </div>
                  </div>

                  {cat.is_default === 0 && (
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1 rounded-xl bg-white/80 hover:bg-rose-100 text-[#4A3E3D] border border-[#4A3E3D] transition-colors"
                      title="Eliminar categoría personalizada"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
