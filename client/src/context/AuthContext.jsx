import React from 'react';
import { apiRequest, setTokens, clearTokens, getStoredRefreshToken } from '../services/apiClient.js';

const AuthContext = React.createContext(null);
const USER_KEY = 'eventoria_user_profile';

const getInitialUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(getInitialUser);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const storedRefresh = getStoredRefreshToken();
    const cachedUser = getInitialUser();

    if (!cachedUser && !storedRefresh) {
      setLoading(false);
      return;
    }

    apiRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: storedRefresh }),
    })
      .then(result => {
        setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
        const normalizedUser = result.user ? { ...result.user, email: result.user.email?.toLowerCase() } : result.user;
        setUser(normalizedUser);
        try {
          if (normalizedUser) {
            localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
          } else {
            localStorage.removeItem(USER_KEY);
          }
        } catch {}
      })
      .catch((err) => {
        if (err.status === 401 || err.code === 'INVALID_SESSION' || err.code === 'REFRESH_TOKEN_REQUIRED') {
          clearTokens();
          setUser(null);
          try { localStorage.removeItem(USER_KEY); } catch {}
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (mode, values) => {
    const normalizedValues = { ...values, email: values.email?.trim().toLowerCase() };
    const result = await apiRequest(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(normalizedValues) });
    setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    const normalizedUser = result.user ? { ...result.user, email: result.user.email?.toLowerCase() } : result.user;
    setUser(normalizedUser);
    try {
      if (normalizedUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
      }
    } catch {}
    return normalizedUser;
  };

  const logout = async () => {
    const storedRefresh = getStoredRefreshToken();
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: storedRefresh }),
    }).catch(() => null);
    clearTokens();
    setUser(null);
    try { localStorage.removeItem(USER_KEY); } catch {}
  };

  const refreshUser = async () => {
    try {
      const storedRefresh = getStoredRefreshToken();
      const result = await apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });
      setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      const normalizedUser = result.user ? { ...result.user, email: result.user.email?.toLowerCase() } : result.user;
      setUser(normalizedUser);
      try {
        if (normalizedUser) {
          localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
        }
      } catch {}
      return normalizedUser;
    } catch {
      return null;
    }
  };

  const forgotPassword = email => apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }) });
  const resetPassword = values => apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(values) });

  return <AuthContext.Provider value={{ user, loading, login: values => authenticate('login', values), register: values => authenticate('register', values), forgotPassword, resetPassword, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

