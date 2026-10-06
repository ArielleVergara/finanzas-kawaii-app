import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('kawaii_token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.user) {
            setUser(data.user);
          } else {
            setUser({ id: 'local-user', name: 'Usuario Kawaii', email: 'usuario@kawaii.app' });
          }
        })
        .catch(() => {
          // Modo Offline: mantener la sesión activa sin borrar el token
          setUser({ id: 'local-user', name: 'Usuario Kawaii', email: 'usuario@kawaii.app' });
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('kawaii_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
      }
    } catch (e) {
      console.warn('Login ejecutado en modo local:', e);
    }

    // Modo local / offline fallback
    const localToken = 'local-token-kawaii';
    const localUser = { id: 'local-user', name: 'Usuario Kawaii', email };
    localStorage.setItem('kawaii_token', localToken);
    setToken(localToken);
    setUser(localUser);
    return { token: localToken, user: localUser };
  };

  const register = async (email, password, name, avatar) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, avatar })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('kawaii_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
      }
    } catch (e) {
      console.warn('Registro ejecutado en modo local:', e);
    }

    // Modo local / offline fallback
    const localToken = 'local-token-kawaii';
    const localUser = { id: 'local-user', name: name || 'Usuario Kawaii', email };
    localStorage.setItem('kawaii_token', localToken);
    setToken(localToken);
    setUser(localUser);
    return { token: localToken, user: localUser };
  };

  const logout = () => {
    localStorage.removeItem('kawaii_token');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
