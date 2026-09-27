import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Configuración de URL base para peticiones API (útil para build móvil / Capacitor)
const API_BASE = import.meta.env.VITE_API_URL || '';
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

