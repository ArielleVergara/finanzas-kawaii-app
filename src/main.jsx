import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Configuración de URL base para peticiones API
// Apunta al backend oficial 24/7 seguro en Render (Gratuito y permanente)
const DEFAULT_API_URL = 'https://finanzas-kawaii-backend.onrender.com';
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

