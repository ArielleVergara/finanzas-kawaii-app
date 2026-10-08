import React, { useState, useRef } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, KeyRound, Check, X, Smartphone, Download, Upload, Database, Copy, FileText, User, Edit3 } from 'lucide-react';
import { exportBackupJSON, importBackupJSON, getLocalDB } from '../utils/localDB';

export default function SecuritySettingsModal({ isOpen, onClose, onOpenProfile }) {
  const { hasPin, pin, setPin, lockNow } = useSecurity();
  const { user } = useAuth();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const fileInputRef = useRef(null);

  // Estados para modal de exportar/importar texto directo (compatible con Kindle/Android WebViews)
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [backupText, setBackupText] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    const res = exportBackupJSON();
    const dataStr = JSON.stringify(getLocalDB(), null, 2);
    setBackupText(dataStr);
    
    if (res.success) {
      setIsError(false);
      setMessage(`¡Copia de seguridad generada! Si tu dispositivo no descargó el archivo, puedes usar la opción "Copiar Backup en Texto" 🌸`);
    } else {
      setIsError(true);
      setMessage('Error al generar la copia de seguridad: ' + res.error);
    }
  };

  const handleOpenCopyModal = () => {
    const dataStr = JSON.stringify(getLocalDB(), null, 2);
    setBackupText(dataStr);
    setCopied(false);
    setShowCopyModal(true);
  };

  const handleCopyTextToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(backupText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = backupText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      alert('Por favor selecciona el texto del recuadro y mantén presionado para copiarlo.');
    }
  };

  const handleImportBackupFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = importBackupJSON(event.target.result);
      if (res.success) {
        setIsError(false);
        setMessage('¡Copia de seguridad restaurada exitosamente! Recargando datos... 🌸✨');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setIsError(true);
        setMessage('Error al restaurar respaldo: ' + res.error);
      }
    };
    reader.readAsText(file);
  };

  const handleImportBackupFromText = () => {
    if (!pasteText.trim()) {
      alert('Por favor pega el código o texto de tu copia de seguridad.');
      return;
    }

    const res = importBackupJSON(pasteText.trim());
    if (res.success) {
      setShowPasteModal(false);
      setIsError(false);
      setMessage('¡Copia de seguridad restaurada exitosamente! Recargando datos... 🌸✨');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      alert('Error al restaurar respaldo: ' + res.error);
    }
  };

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
    <div className="fixed inset-0 z-50 bg-[#4A3E3D]/50 backdrop-blur-sm flex items-center justify-center p-4 font-kawaii selection:bg-[#FFD6E8] overflow-y-auto">
      <div className="max-w-md w-full bg-white dark:bg-[#2A2335] rounded-3xl border-3 border-[#4A3E3D] shadow-kawaii-lg p-6 relative animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-[#FFB7B2] hover:bg-[#FFA5A0] border-2 border-[#4A3E3D] flex items-center justify-center text-[#4A3E3D] font-bold shadow-kawaii-sm"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFD6E8] border-2 border-[#4A3E3D] shadow-kawaii flex items-center justify-center text-2xl">
            <ShieldCheck className="text-[#4A3E3D]" size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">Seguridad y Ajustes</h2>
            <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">Perfil, PIN y Copias de Seguridad 🔒</p>
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

        {/* Ficha de Información de Usuario Guardada */}
        {user && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#FFD6E8]/60 dark:bg-[#5E476B]/60 border-2 border-[#4A3E3D] dark:border-[#8A7398] flex items-center justify-between gap-2 shadow-kawaii-sm">
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 tracking-wider">Usuario en Base de Datos</p>
              <p className="text-xs font-extrabold text-[#4A3E3D] dark:text-[#F5E8FB] truncate">{user.name}</p>
              <p className="text-[11px] text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 truncate">{user.email}</p>
            </div>
            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#2A2335] hover:bg-[#FFF1C5] border-2 border-[#4A3E3D] dark:border-[#8A7398] text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-1.5 shrink-0 shadow-kawaii-sm transition-transform active:scale-95"
              >
                <Edit3 size={13} /> Editar
              </button>
            )}
          </div>
        )}

        {/* Estado Actual de Seguridad */}
        <div className="space-y-3 mb-6">
          <div className="p-3.5 rounded-2xl bg-[#FFFDF0] dark:bg-[#1C1724] border-2 border-[#4A3E3D] dark:border-[#8A7398] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock size={18} className="text-[#4A3E3D] dark:text-[#F5E8FB]" />
              <div>
                <p className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">Bloqueo con PIN de Aplicación</p>
                <p className="text-[11px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70">
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
        </div>

        {/* Sección Copias de Seguridad (Backup & Restore) */}
        <div className="mb-5 bg-[#FFFDF0] dark:bg-[#1C1724] p-4 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] space-y-3">
          <h3 className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-1.5">
            <Database size={16} className="text-purple-600 dark:text-purple-400" />
            Copia de Seguridad y Respaldos (Offline)
          </h3>
          <p className="text-[11px] text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">
            Guarda tus finanzas descargando un archivo o copiando el código de texto directamente.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleOpenCopyModal}
              className="kawaii-btn bg-[#FFD6E8] hover:bg-[#FFB7B2] text-[#4A3E3D] py-2 px-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Copy size={14} /> Copiar Texto Backup
            </button>

            <button
              type="button"
              onClick={handleExportBackup}
              className="kawaii-btn bg-[#FFF1C5] hover:bg-[#FFE6C7] text-[#4A3E3D] py-2 px-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Download size={14} /> Descargar Archivo
            </button>

            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="kawaii-btn bg-[#E3D5FF] hover:bg-[#D4C3FF] text-[#4A3E3D] py-2 px-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <FileText size={14} /> Pegar Texto Backup
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="kawaii-btn bg-[#D0F4DE] hover:bg-[#B5EAD7] text-[#4A3E3D] py-2 px-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Upload size={14} /> Cargar Archivo .JSON
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportBackupFile}
              className="hidden"
            />
          </div>
        </div>

        {/* Formulario para Crear / Cambiar PIN */}
        <form onSubmit={handleSavePin} className="space-y-3 bg-[#FFF1C5]/50 dark:bg-[#1C1724] p-4 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398]">
          <h3 className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-1.5">
            <KeyRound size={16} />
            {hasPin ? 'Cambiar PIN de Acceso' : 'Configurar PIN de Acceso'}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Nuevo PIN (4 dígitos)</label>
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
              <label className="block text-[11px] font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">Confirmar PIN</label>
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

      {/* MODAL PARA COPIAR TEXTO BACKUP DIRECTAMENTE */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A3E3D]/60 backdrop-blur-sm animate-fade-in">
          <div className="kawaii-card max-w-lg w-full bg-[#FFFDF0] dark:bg-[#2A2335] p-5 space-y-3 relative border-3 border-[#4A3E3D] shadow-kawaii-lg">
            <button
              onClick={() => setShowCopyModal(false)}
              className="absolute top-3 right-3 p-1 rounded-full bg-[#FFB7B2] border-2 border-[#4A3E3D]"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2">
              <Copy className="text-purple-600" size={20} />
              <h3 className="text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                Texto de la Copia de Seguridad (Backup)
              </h3>
            </div>

            <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">
              Toca el botón <strong>"Copiar Todo"</strong> para guardar el código en tus notas, mensaje o correo.
            </p>

            <textarea
              readOnly
              value={backupText}
              rows={8}
              className="w-full p-2.5 rounded-xl border-2 border-[#4A3E3D] bg-white dark:bg-[#1C1724] text-[11px] font-mono select-all text-[#4A3E3D] dark:text-[#F5E8FB]"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyTextToClipboard}
                className="kawaii-btn flex-1 bg-[#D1F2E2] hover:bg-[#B5EAD7] text-[#4A3E3D] py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Copy size={16} />
                <span>{copied ? '¡Copiado al Portapapeles! ✨' : 'Copiar Todo al Portapapeles 📋'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-[#4A3E3D] rounded-xl font-bold text-xs border-2 border-[#4A3E3D]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA PEGAR TEXTO BACKUP DIRECTAMENTE */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A3E3D]/60 backdrop-blur-sm animate-fade-in">
          <div className="kawaii-card max-w-lg w-full bg-[#FFFDF0] dark:bg-[#2A2335] p-5 space-y-3 relative border-3 border-[#4A3E3D] shadow-kawaii-lg">
            <button
              onClick={() => setShowPasteModal(false)}
              className="absolute top-3 right-3 p-1 rounded-full bg-[#FFB7B2] border-2 border-[#4A3E3D]"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2">
              <FileText className="text-purple-600" size={20} />
              <h3 className="text-sm font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                Restaurar Backup desde Texto
              </h3>
            </div>

            <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">
              Pega aquí el código o texto de tu copia de seguridad previamente guardado:
            </p>

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Pega aquí el texto JSON de tu respaldo..."
              rows={8}
              className="w-full p-2.5 rounded-xl border-2 border-[#4A3E3D] bg-white dark:bg-[#1C1724] text-[11px] font-mono text-[#4A3E3D] dark:text-[#F5E8FB]"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleImportBackupFromText}
                className="kawaii-btn flex-1 bg-[#D0F4DE] hover:bg-[#B5EAD7] text-[#4A3E3D] py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Check size={16} />
                <span>Restaurar Datos Ahora ✨</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-[#4A3E3D] rounded-xl font-bold text-xs border-2 border-[#4A3E3D]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
