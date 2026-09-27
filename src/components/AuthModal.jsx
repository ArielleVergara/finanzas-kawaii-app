import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('bunny');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const avatars = [
    { id: 'bunny', emoji: '🐰', label: 'Conejito' },
    { id: 'frog', emoji: '🐸', label: 'Ranita' },
    { id: 'kitty', emoji: '🐱', label: 'Gatito' },
    { id: 'ghost', emoji: '👻', label: 'Fantasmita' },
    { id: 'bear', emoji: '🐻', label: 'Osito' },
    { id: 'star', emoji: '⭐', label: 'Estrellita' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, name, avatar);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A3E3D]/50 backdrop-blur-sm">
      <div className="kawaii-card max-w-md w-[92vw] sm:w-full max-h-[90vh] overflow-y-auto relative bg-[#FFFDF0] dark:bg-[#2A2335] animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-[#FFB7B2] border-2 border-[#4A3E3D] shadow-kawaii-sm hover:scale-110 transition-transform"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Title Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-3 rounded-2xl bg-[#FFD6E8] border-3 border-[#4A3E3D] shadow-kawaii mb-2 text-3xl">
            {isRegister ? <><span className="animate-spin-slow">🌸</span>✨</> : '💖🔑'}
          </div>
          <h2 className="text-2xl font-bold text-[#4A3E3D]">
            {isRegister ? 'Crear Cuenta Kawaii' : 'Iniciar Sesión'}
          </h2>
          <p className="text-xs text-[#4A3E3D]/80">
            {isRegister ? '¡Únete y administra tus finanzas con ternura!' : '¡Hola de nuevo! Ingresa tus datos para continuar.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-[#FFB7B2] border-2 border-[#4A3E3D] text-xs font-bold text-[#4A3E3D] text-center">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Tu Nombre o Apodo</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 z-10 pointer-events-none text-[#4A3E3D]/70" size={18} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Bruno o Mimi"
                  className="kawaii-input w-full text-sm"
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Correo Electrónico</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 z-10 pointer-events-none text-[#4A3E3D]/70" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hola@ejemplo.com"
                className="kawaii-input w-full text-sm"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Contraseña</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 z-10 pointer-events-none text-[#4A3E3D]/70" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="kawaii-input w-full text-sm"
                style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 z-10 text-[#4A3E3D]/70 hover:text-[#4A3E3D] focus:outline-none p-1 rounded-lg transition-colors"
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1.5">Elige tu Avatar Kawaii</label>
              <div className="grid grid-cols-6 gap-2">
                {avatars.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAvatar(item.id)}
                    className={`p-2 text-xl rounded-2xl border-2 border-[#4A3E3D] transition-transform ${
                      avatar === item.id ? 'bg-[#FFD6E8] shadow-kawaii scale-110' : 'bg-white hover:bg-[#FFF1C5]'
                    }`}
                    title={item.label}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="kawaii-btn w-full bg-[#FFD6E8] hover:bg-[#FFB7B2] text-[#4A3E3D] py-2.5 text-base flex items-center justify-center gap-2 mt-4"
          >
            <Sparkles size={18} />
            <span>{loading ? 'Cargando...' : isRegister ? '¡Crear mi cuenta!' : 'Entrar a mi cuenta'}</span>
          </button>
        </form>

        {/* Toggle Register/Login */}
        <div className="mt-5 text-center border-t-2 border-dashed border-[#4A3E3D]/20 pt-3">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs font-bold text-[#4A3E3D] hover:underline"
          >
            {isRegister
              ? '¿Ya tienes una cuenta? Inicia sesión aquí'
              : '¿No tienes cuenta? Regístrate gratis aquí 🌸'}
          </button>
        </div>
      </div>
    </div>
  );
}
