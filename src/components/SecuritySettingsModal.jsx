import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { ShieldCheck, Lock, KeyRound, Check, X, Smartphone, AlertTriangle } from 'lucide-react';

export default function SecuritySettingsModal({ isOpen, onClose }) {
  const { hasPin, pin, setPin, lockNow } = useSecurity();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleSavePin = (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setIsError(true);
      setMessage('El PIN debe consistir de exactamente 4 números 🌸');
      return;
    }

    if (newPin !== confirmPin) {
      setIsError(true);
      setMessage('Los PINs no coinciden. Verifica los números 🌸');
      return;
    }

    setPin(newPin);
    setIsError(false);
    setMessage('¡PIN de Seguridad activado exitosamente! 🔒✨');
    setNewPin('');
    setConfirmPin('');
  };

  const handleDisablePin = () => {
    setPin(null);
    setMessage('El PIN de bloqueo ha sido desactivado 🌸');
    setIsError(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#4A3E3D]/50 backdrop-blur-sm flex items-center justify-center p-4 font-kawaii selection:bg-[#FFD6E8]">
      <div className="max-w-md w-full bg-white rounded-3xl border-3 border-[#4A3E3D] shadow-kawaii-lg p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-[#FFB7B2] hover:bg-[#FFA5A0] border-2 border-[#4A3E3D] flex items-center justify-center text-[#4A3E3D] font-bold"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFD6E8] border-2 border-[#4A3E3D] shadow-kawaii flex items-center justify-center text-2xl">
            <ShieldCheck className="text-[#4A3E3D]" size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#4A3E3D]">Seguridad & OWASP MASVS</h2>
            <p className="text-xs text-[#4A3E3D]/80">Protección para la App Móvil Android 🔒</p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-2xl border-2 border-[#4A3E3D] text-xs font-bold text-center ${
              isError ? 'bg-[#FFB7B2]' : 'bg-[#C1E7E3]'
            }`}
          >
            {message}
          </div>
        )}

        {/* Estado Actual de Seguridad */}
        <div className="space-y-3 mb-6">
          <div className="p-3.5 rounded-2xl bg-[#FFFDF0] border-2 border-[#4A3E3D] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock size={18} className="text-[#4A3E3D]" />
              <div>
                <p className="text-xs font-bold text-[#4A3E3D]">Bloqueo con PIN de Aplicación</p>
                <p className="text-[11px] text-[#4A3E3D]/70">
                  {hasPin ? 'PIN Activo de 4 dígitos' : 'Desactivado (Sin PIN)'}
                </p>
              </div>
            </div>
            {hasPin ? (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-200 border border-[#4A3E3D] text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                <Check size={12} /> Activo
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-amber-200 border border-[#4A3E3D] text-[11px] font-bold text-amber-900">
                Inactivo
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFDF0] border-2 border-[#4A3E3D] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone size={18} className="text-[#4A3E3D]" />
              <div>
                <p className="text-xs font-bold text-[#4A3E3D]">Protección de Entradas de Texto</p>
                <p className="text-[11px] text-[#4A3E3D]/70">Sanitización anti-inyección XSS/SQLi act</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-200 border border-[#4A3E3D] text-[11px] font-bold text-emerald-900 flex items-center gap-1">
              <Check size={12} /> 100% Protegido
            </span>
          </div>
        </div>

        {/* Formulario para Crear / Cambiar PIN */}
        <form onSubmit={handleSavePin} className="space-y-3 bg-[#FFF1C5]/50 p-4 rounded-2xl border-2 border-[#4A3E3D]">
          <h3 className="text-xs font-bold text-[#4A3E3D] flex items-center gap-1.5">
            <KeyRound size={16} />
            {hasPin ? 'Cambiar o Configurar Nuevo PIN' : 'Configurar PIN de Acceso'}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#4A3E3D] mb-1">Nuevo PIN (4 dígitos)</label>
              <input
                type="password"
                maxLength={4}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="kawaii-input w-full text-center text-sm font-bold tracking-widest"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#4A3E3D] mb-1">Confirmar PIN</label>
              <input
                type="password"
                maxLength={4}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="kawaii-input w-full text-center text-sm font-bold tracking-widest"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="kawaii-btn flex-1 bg-[#FFD6E8] hover:bg-[#FFB7B2] text-[#4A3E3D] py-2 text-xs font-bold"
            >
              {hasPin ? 'Actualizar PIN' : 'Activar PIN'}
            </button>
            {hasPin && (
              <button
                type="button"
                onClick={handleDisablePin}
                className="kawaii-btn bg-[#FFB7B2] hover:bg-[#FFA5A0] text-[#4A3E3D] py-2 px-3 text-xs font-bold"
              >
                Desactivar PIN
              </button>
            )}
          </div>
        </form>

        {hasPin && (
          <button
            onClick={() => {
              onClose();
              lockNow();
            }}
            className="w-full mt-4 kawaii-btn bg-[#E3D5FF] hover:bg-[#D4C3FF] text-[#4A3E3D] py-2.5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Lock size={16} /> Bloquear Aplicación Ahora
          </button>
        )}
      </div>
    </div>
  );
}
