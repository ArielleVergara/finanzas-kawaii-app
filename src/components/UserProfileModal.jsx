import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Sparkles, CheckCircle2, X, Database, ShieldCheck, Heart } from 'lucide-react';
import { sanitizeInput } from '../utils/security';

export default function UserProfileModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('bunny');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const avatars = [
    { id: 'bunny', emoji: '🐰', label: 'Conejito' },
    { id: 'frog', emoji: '🐸', label: 'Ranita' },
    { id: 'kitty', emoji: '🐱', label: 'Gatito' },
    { id: 'ghost', emoji: '👻', label: 'Fantasmita' },
    { id: 'bear', emoji: '🐻', label: 'Osito' },
    { id: 'star', emoji: '⭐', label: 'Estrellita' },
  ];

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || 'bunny');
      setMessage('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const cleanName = sanitizeInput(name, 60).trim();
      const cleanEmail = sanitizeInput(email, 100).toLowerCase().trim();

      if (!cleanEmail) {
        setMessage('El correo electrónico no puede estar vacío.');
        setIsSuccess(false);
        setLoading(false);
        return;
      }

      await updateProfile({
        name: cleanName || 'Usuario Kawaii',
        email: cleanEmail,
        avatar
      });

      setIsSuccess(true);
      setMessage('¡Información de usuario actualizada con éxito en la base de datos! ✨🌸');
      setTimeout(() => {
        setMessage('');
      }, 4000);
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.message || 'Error al actualizar el perfil de usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#4A3E3D]/50 backdrop-blur-sm flex items-center justify-center p-4 font-kawaii selection:bg-[#FFD6E8] overflow-y-auto">
      <div className="max-w-md w-full bg-white dark:bg-[#2A2335] rounded-3xl border-3 border-[#4A3E3D] shadow-kawaii-lg p-6 relative animate-fade-in my-8">
        
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-[#FFB7B2] hover:bg-[#FFA5A0] border-2 border-[#4A3E3D] flex items-center justify-center text-[#4A3E3D] font-bold shadow-kawaii-sm transition-transform active:scale-95"
          title="Cerrar modal"
        >
          <X size={18} />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFD6E8] border-2 border-[#4A3E3D] shadow-kawaii flex items-center justify-center text-2xl shrink-0">
            {avatars.find(a => a.id === avatar)?.emoji || '🌸'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">Editar Usuario</h2>
            <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">Información de cuenta en la Base de Datos 🌸</p>
          </div>
        </div>

        {/* Ficha de datos en Base de Datos */}
        <div className="mb-5 p-3.5 rounded-2xl bg-[#FFFDF0] dark:bg-[#1C1724] border-2 border-[#4A3E3D] dark:border-[#8A7398] space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 font-semibold text-[11px]">
            <span className="flex items-center gap-1">
              <Database size={13} className="text-purple-600 dark:text-purple-400" />
              ID en Base de Datos Local:
            </span>
            <span className="font-mono text-[#4A3E3D] dark:text-[#F5E8FB] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-[#2A2335] border border-[#4A3E3D]/30">
              {user?.id || 'local-user'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 font-semibold text-[11px]">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
              Estado de Sesión:
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              Autenticado (Local / Offline)
            </span>
          </div>
        </div>

        {/* Mensaje de feedback */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-2xl border-2 border-[#4A3E3D] text-xs font-bold text-center flex items-center justify-center gap-2 ${
              isSuccess ? 'bg-[#C1E7E3] text-teal-900' : 'bg-[#FFB7B2] text-rose-900'
            }`}
          >
            {isSuccess && <CheckCircle2 size={16} />}
            <span>{message}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
              Nombre de Usuario o Apodo
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 z-10 pointer-events-none text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70" size={18} />
              <input
                type="text"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(sanitizeInput(e.target.value, 60))}
                placeholder="Ej. Bruno o Mimi"
                className="kawaii-input w-full text-sm"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
              Correo Electrónico
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 z-10 pointer-events-none text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70" size={18} />
              <input
                type="email"
                required
                maxLength={100}
                value={email}
                onChange={(e) => setEmail(sanitizeInput(e.target.value, 100))}
                placeholder="hola@ejemplo.com"
                className="kawaii-input w-full text-sm"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1.5">
              Avatar Kawaii
            </label>
            <div className="grid grid-cols-6 gap-2">
              {avatars.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAvatar(item.id)}
                  className={`p-2 text-xl rounded-2xl border-2 border-[#4A3E3D] transition-transform ${
                    avatar === item.id ? 'bg-[#FFD6E8] shadow-kawaii scale-110' : 'bg-white dark:bg-[#1C1724] hover:bg-[#FFF1C5]'
                  }`}
                  title={item.label}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="kawaii-btn w-full bg-[#FFD6E8] hover:bg-[#FFB7B2] text-[#4A3E3D] py-2.5 text-sm font-extrabold flex items-center justify-center gap-2 shadow-kawaii active:scale-95"
            >
              <Sparkles size={16} />
              {loading ? 'Guardando...' : 'Guardar Cambios en Base de Datos 🌸'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-center text-xs font-bold text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 hover:underline py-1"
            >
              Cancelar
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
