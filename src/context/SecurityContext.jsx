import React, { createContext, useState, useEffect, useContext } from 'react';

const SecurityContext = createContext();

export const SecurityProvider = ({ children }) => {
  // PIN guardado localmente (o nulo si está desactivado)
  const [pin, setPinState] = useState(() => localStorage.getItem('kawaii_app_pin') || null);
  // Estado de bloqueo actual
  const [isLocked, setIsLocked] = useState(() => {
    const savedPin = localStorage.getItem('kawaii_app_pin');
    return Boolean(savedPin);
  });
  // Auto-bloqueo tras inactividad (en milisegundos - 3 minutos por defecto)
  const [autoLockTimeout, setAutoLockTimeout] = useState(3 * 60 * 1000);

  useEffect(() => {
    if (!pin) {
      setIsLocked(false);
      return;
    }

    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsLocked(true);
      }, autoLockTimeout);
    };

    // Eventos de actividad del usuario
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer();

    // Bloquear cuando se cambia de pestaña o se minimiza en Android
    const handleVisibilityChange = () => {
      if (document.hidden && pin) {
        setIsLocked(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pin, autoLockTimeout]);

  // Establecer o cambiar PIN
  const setPin = (newPin) => {
    if (newPin && newPin.length === 4) {
      localStorage.setItem('kawaii_app_pin', newPin);
      setPinState(newPin);
      setIsLocked(false);
    } else if (newPin === null) {
      localStorage.removeItem('kawaii_app_pin');
      setPinState(null);
      setIsLocked(false);
    }
  };

  // Desbloquear aplicación validando el PIN ingresado
  const unlockWithPin = (enteredPin) => {
    if (enteredPin === pin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  // Forzar bloqueo manual
  const lockNow = () => {
    if (pin) {
      setIsLocked(true);
    }
  };

  return (
    <SecurityContext.Provider
      value={{
        pin,
        isLocked,
        hasPin: Boolean(pin),
        setPin,
        unlockWithPin,
        lockNow
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => useContext(SecurityContext);
