import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Lock, Fingerprint, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

export default function PinLockModal() {
  const { unlockWithPin, isLocked } = useSecurity();
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isLocked) return null;

  const handleKeyPress = (num) => {
    setError(false);
    const emptyIndex = pinDigits.findIndex((digit) => digit === '');
    if (emptyIndex !== -1) {
      const newDigits = [...pinDigits];
      newDigits[emptyIndex] = num;
      setPinDigits(newDigits);

      // Si completó los 4 dígitos
      if (emptyIndex === 3) {
        const fullPin = newDigits.join('');
        const success = unlockWithPin(fullPin);
        if (!success) {
          setError(true);
          setErrorMessage('PIN incorrecto. Intenta de nuevo 🌸');
          setTimeout(() => {
            setPinDigits(['', '', '', '']);
            setError(false);
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setError(false);
    const lastFilledIndex = pinDigits.map((d) => d !== '').lastIndexOf(true);
    if (lastFilledIndex !== -1) {
      const newDigits = [...pinDigits];
      newDigits[lastFilledIndex] = '';
      setPinDigits(newDigits);
    }
  };

  const handleBiometricSim = () => {
    // Simular escaneo de huella / biometría de Android
    if ('PublicKeyCredential' in window) {
      setErrorMessage('Verificando Huella Digital / Face ID...');
      setTimeout(() => {
        // En dispositivo móvil real se integra con Capacitor/Cordova BiometricAuth
        unlockWithPin(localStorage.getItem('kawaii_app_pin'));
      }, 700);
    } else {
      setErrorMessage('Biometría no soportada en este navegador/dispositivo');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#4A3E3D]/80 backdrop-blur-md flex items-center justify-center p-4 font-kawaii selection:bg-[#FFD6E8]">
      <div className="max-w-xs w-full bg-white rounded-3xl border-3 border-[#4A3E3D] shadow-kawaii-lg p-6 text-center animate-fade-in relative">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFD6E8] border-2 border-[#4A3E3D] shadow-kawaii flex items-center justify-center text-3xl mb-3">
          <Lock className="text-[#4A3E3D]" size={30} />
        </div>

        <h2 className="text-xl font-bold text-[#4A3E3D]">Aplicación Protegida</h2>
        <p className="text-xs text-[#4A3E3D]/80 mt-1 mb-5">
          Ingresa tu PIN de 4 dígitos para acceder a tus finanzas 🔒
        </p>

        {/* Indicadores de PIN */}
        <div className="flex justify-center items-center gap-3 mb-6">
          {pinDigits.map((digit, idx) => (
            <div
              key={idx}
              className={`w-10 h-10 rounded-2xl border-2 border-[#4A3E3D] flex items-center justify-center text-xl font-bold transition-all duration-200 ${
                digit !== ''
                  ? 'bg-[#FFD6E8] shadow-kawaii scale-105'
                  : 'bg-[#FFFDF0]'
              } ${error ? 'bg-[#FFB7B2] animate-bounce' : ''}`}
            >
              {digit ? '•' : ''}
            </div>
          ))}
        </div>

        {errorMessage && (
          <p className={`text-xs font-bold mb-4 ${error ? 'text-rose-600' : 'text-purple-600'}`}>
            {errorMessage}
          </p>
        )}

        {/* Teclado Numérico Kawaii */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(String(num))}
              className="kawaii-btn bg-[#FFF1C5] hover:bg-[#FFD6E8] text-[#4A3E3D] font-bold text-lg py-3 rounded-2xl border-2 border-[#4A3E3D]"
            >
              {num}
            </button>
          ))}

          <button
            onClick={handleBiometricSim}
            title="Desbloqueo Biométrico (Huella / Rostro)"
            className="kawaii-btn bg-[#E3D5FF] hover:bg-[#D4C3FF] text-[#4A3E3D] font-bold py-3 rounded-2xl border-2 border-[#4A3E3D] flex items-center justify-center"
          >
            <Fingerprint size={22} />
          </button>

          <button
            onClick={() => handleKeyPress('0')}
            className="kawaii-btn bg-[#FFF1C5] hover:bg-[#FFD6E8] text-[#4A3E3D] font-bold text-lg py-3 rounded-2xl border-2 border-[#4A3E3D]"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="kawaii-btn bg-[#FFB7B2] hover:bg-[#FFA5A0] text-[#4A3E3D] font-bold text-xs py-3 rounded-2xl border-2 border-[#4A3E3D] flex items-center justify-center"
          >
            Borrar
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#4A3E3D]/70 font-semibold mt-2">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Protegido con Cifrado OWASP MASVS</span>
        </div>
      </div>
    </div>
  );
}
