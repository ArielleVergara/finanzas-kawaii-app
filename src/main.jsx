import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { handleLocalApiRequest } from './utils/localDB.js';

// Configuración de URL base e interceptor de peticiones API
const DEFAULT_API_URL = 'https://finanzas-kawaii-backend.onrender.com';
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : DEFAULT_API_URL);

const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  const urlStr = typeof url === 'string' ? url : (url?.url || '');

  if (urlStr.startsWith('/api') || urlStr.includes('/api/')) {
    const token = localStorage.getItem('kawaii_token');
    const isCapacitorApp = Boolean(window.Capacitor) || window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
    const isLocalUser = !token || token === 'local-token-kawaii' || token.startsWith('local-');

    // Para la app APK/Capacitor o usuarios en Modo Local, usar SIEMPRE el motor local (localStorage)
    if (isCapacitorApp || isLocalUser || !API_BASE) {
      return handleLocalApiRequest(urlStr, options);
    }

    // Si hay un usuario con token remoto real y servidor configurado, intentar remoto
    try {
      const fullUrl = urlStr.startsWith('/api') ? API_BASE + urlStr : urlStr;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await originalFetch(fullUrl, {
        ...options,
        signal: options.signal || controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok || (res.status >= 200 && res.status < 500)) {
        return res;
      }
    } catch (err) {
      console.warn('Servidor backend remoto no disponible. Ejecutando en Modo Local (Offline):', err);
    }

    return handleLocalApiRequest(urlStr, options);
  }

  return originalFetch(url, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
