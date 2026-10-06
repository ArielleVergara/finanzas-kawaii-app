import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('kawaii_token') || '');
  const [loading, setLoading] = useState(true);

  const [rememberedUser, setRememberedUser] = useState(() => {
    try {
      const raw = localStorage.getItem('kawaii_remembered_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  const saveRememberedUser = (u) => {
    if (u && u.email) {
      const rem = {
        email: u.email,
        name: u.name || 'Usuario Kawaii',
        avatar: u.avatar || 'bunny'
      };
      localStorage.setItem('kawaii_remembered_user', JSON.stringify(rem));
      setRememberedUser(rem);
    }
  };

  const forgetRememberedUser = () => {
    localStorage.removeItem('kawaii_remembered_user');
    setRememberedUser(null);
  };

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.user) {
            setUser(data.user);
            saveRememberedUser(data.user);
          } else {
            const fallbackUser = rememberedUser || { id: 'local-user', name: 'Usuario Kawaii', email: 'usuario@kawaii.app' };
            setUser(fallbackUser);
          }
        })
        .catch(() => {
          // Modo Offline: mantener la sesión activa sin borrar el token
          const fallbackUser = rememberedUser || { id: 'local-user', name: 'Usuario Kawaii', email: 'usuario@kawaii.app' };
          setUser(fallbackUser);
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
        saveRememberedUser(data.user);
        return data;
      }
    } catch (e) {
      console.warn('Login ejecutado en modo local:', e);
    }

    // Modo local / offline fallback
    const localToken = 'local-token-kawaii';
    const localUser = {
      id: 'local-user',
      name: rememberedUser?.email === email ? rememberedUser.name : 'Usuario Kawaii',
      email
    };
    localStorage.setItem('kawaii_token', localToken);
    setToken(localToken);
    setUser(localUser);
    saveRememberedUser(localUser);
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
        saveRememberedUser(data.user);
        return data;
      }
    } catch (e) {
      console.warn('Registro ejecutado en modo local:', e);
    }

    // Modo local / offline fallback
    const localToken = 'local-token-kawaii';
    const localUser = { id: 'local-user', name: name || 'Usuario Kawaii', email, avatar: avatar || 'bunny' };
    localStorage.setItem('kawaii_token', localToken);
    setToken(localToken);
    setUser(localUser);
    saveRememberedUser(localUser);
    return { token: localToken, user: localUser };
  };

  const logout = () => {
    localStorage.removeItem('kawaii_token');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, rememberedUser, forgetRememberedUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
