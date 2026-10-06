import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { handleLocalApiRequest } from './utils/localDB.js';

// Configuración de URL base e interceptor de peticiones API
// Si el servidor de Render está offline o el dispositivo no tiene red (Kindle/Offline),
// ejecuta la petición de forma 100% autónoma en LocalDB (localStorage).
const DEFAULT_API_URL = 'https://finanzas-kawaii-backend.onrender.com';
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : DEFAULT_API_URL);

const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  const urlStr = typeof url === 'string' ? url : (url?.url || '');

  if (urlStr.startsWith('/api') || urlStr.includes('/api/')) {
    // Si hay una URL de backend configurada, intentar la petición remota primero
    if (API_BASE) {
      const fullUrl = urlStr.startsWith('/api') ? API_BASE + urlStr : urlStr;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout max

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
    }

    // Ejecución en Motor de Base de Datos Local (localStorage)
    return handleLocalApiRequest(urlStr, options);
  }

  return originalFetch(url, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
