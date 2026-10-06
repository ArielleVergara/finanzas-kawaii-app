import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, Mail, User as UserIcon, Heart, ShieldAlert, CheckCircle2, Eye, EyeOff, UserCheck, RefreshCw } from 'lucide-react';
import { sanitizeInput, checkPasswordSecurity } from '../utils/security';

export default function AuthScreen() {
  const { login, register, rememberedUser, forgetRememberedUser } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('bunny');
  const [error, setError] = useState('');
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
    if (rememberedUser && rememberedUser.email && !isRegister) {
      setEmail(rememberedUser.email);
    }
  }, [rememberedUser, isRegister]);

  const passwordSecurity = checkPasswordSecurity(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = sanitizeInput(email, 100).toLowerCase().trim();
    const cleanName = sanitizeInput(name, 60).trim();

    if (isRegister) {
      if (!passwordSecurity.isStrong) {
        setError('La contraseña no cumple con los requisitos mínimos de seguridad.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register(cleanEmail, password, cleanName, avatar);
      } else {
        await login(cleanEmail, password);
      }
    } catch (err) {
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const currentAvatarEmoji = avatars.find(a => a.id === rememberedUser?.avatar)?.emoji || '🌸';

  return (
    <div className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-4 font-kawaii selection:bg-[#FFD6E8]">
      <div className="max-w-md w-full">
        {/* Banner Logo */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#FFD6E8] border-3 border-[#4A3E3D] shadow-kawaii flex items-center justify-center text-4xl mb-3">
            <span className="animate-spin-slow">🌸</span>
          </div>
          <h1 className="text-3xl font-bold text-[#4A3E3D] tracking-tight">
            Finanzas Kawaii
          </h1>
          <p className="text-sm text-[#4A3E3D]/80 font-medium mt-1">
            Control de gastos, ingresos, cuotas y ahorros del hogar ✨
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="kawaii-card bg-white shadow-kawaii-lg relative">
          <div className="flex items-center justify-center gap-2 mb-4 bg-[#FFF1C5] py-2 rounded-2xl border-2 border-[#4A3E3D]">
            <Heart size={16} className="text-rose-500 fill-rose-500" />
            <span className="text-xs font-bold text-[#4A3E3D]">
              {isRegister
                ? 'Crear una nueva cuenta segura'
                : rememberedUser
                ? `¡Hola de nuevo, ${rememberedUser.name}! 🌸`
                : 'Ingresa a tu cuenta para continuar'}
            </span>
          </div>

          {/* Ficha de Usuario Recordado (Iniciar sesión como [Nombre]) */}
          {rememberedUser && !isRegister && (
            <div className="mb-4 p-3 bg-[#D1F2E2]/60 rounded-2xl border-2 border-[#4A3E3D] flex items-center justify-between gap-2 shadow-kawaii-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[#4A3E3D] flex items-center justify-center text-xl shrink-0 shadow-kawaii-sm">
                  {currentAvatarEmoji}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#4A3E3D] truncate">
                    Iniciar sesión como <span className="underline decoration-emerald-500 decoration-2">{rememberedUser.name}</span>
                  </p>
                  <p className="text-[11px] text-[#4A3E3D]/75 font-medium truncate">{rememberedUser.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  forgetRememberedUser();
                  setEmail('');
                }}
                className="text-[10px] font-bold text-rose-800 bg-white hover:bg-rose-50 px-2 py-1 rounded-xl border border-[#4A3E3D] shrink-0 transition-transform active:scale-95"
                title="Usar otro correo o cuenta"
              >
                Usar otra cuenta
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-[#FFB7B2] border-2 border-[#4A3E3D] text-xs font-bold text-[#4A3E3D] text-center flex items-center justify-center gap-2">
              <ShieldAlert size={16} className="text-rose-700" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Tu Nombre o Apodo</label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3.5 z-10 pointer-events-none text-[#4A3E3D]/70" size={18} />
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
            )}

            {(!rememberedUser || isRegister) && (
              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] mb-1">Correo Electrónico</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 z-10 pointer-events-none text-[#4A3E3D]/70" size={18} />
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
            )}

            <div>
              <label className="block text-xs font-bold text-[#4A3E3D] mb-1">
                Contraseña {rememberedUser && !isRegister ? `de ${rememberedUser.name}` : ''}
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 z-10 pointer-events-none text-[#4A3E3D]/70" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus={Boolean(rememberedUser && !isRegister)}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu clave..."
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

              {/* Indicador de Fortaleza de Contraseña en Registro */}
              {isRegister && password.length > 0 && (
                <div className="mt-2.5 p-3 rounded-2xl bg-[#FFFDF0] border-2 border-[#4A3E3D] text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#4A3E3D]">Seguridad de clave:</span>
                    <span className="font-bold">{passwordSecurity.label}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden border border-[#4A3E3D]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordSecurity.score <= 2
                          ? 'bg-rose-500'
                          : passwordSecurity.score <= 4
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(passwordSecurity.score / 5) * 100}%` }}
                    />
                  </div>
                  {passwordSecurity.feedback.length > 0 && (
                    <ul className="mt-2 text-[11px] text-[#4A3E3D]/80 list-disc list-inside space-y-0.5">
                      {passwordSecurity.feedback.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
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
              className="kawaii-btn w-full bg-[#FFD6E8] hover:bg-[#FFB7B2] text-[#4A3E3D] py-3 text-base flex items-center justify-center gap-2 mt-4"
            >
              <Sparkles size={18} />
              <span>
                {loading
                  ? 'Cargando...'
                  : isRegister
                  ? '¡Crear mi cuenta!'
                  : rememberedUser
                  ? `Iniciar sesión como ${rememberedUser.name}`
                  : 'Iniciar Sesión'}
              </span>
            </button>
          </form>

          <div className="mt-5 text-center border-t-2 border-dashed border-[#4A3E3D]/20 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-xs font-bold text-[#4A3E3D] hover:underline"
            >
              {isRegister
                ? '¿Ya tienes cuenta? Inicia sesión aquí'
                : '¿No tienes cuenta aún? Regístrate gratis aquí 🌸'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
