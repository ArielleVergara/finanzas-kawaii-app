import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Configuración de URL base para peticiones API
// En producción / APK siempre apunta por defecto al backend en la IP de red local
const DEFAULT_API_URL = 'http://192.168.100.16:5000';
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : DEFAULT_API_URL);

if (API_BASE) {
  const originalFetch = window.fetch;
  window.fetch = (url, options) => {
    if (typeof url === 'string' && url.startsWith('/api')) {
      url = API_BASE + url;
    }
    return originalFetch(url, options);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

