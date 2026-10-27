import React from 'react';
import { apiRequest, setAccessToken } from '../services/apiClient.js';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiRequest('/auth/refresh', { method: 'POST' })
      .then(result => { setAccessToken(result.accessToken); setUser(result.user ? { ...result.user, email: result.user.email?.toLowerCase() } : result.user); })
      .catch(() => { setAccessToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (mode, values) => {
    const normalizedValues = { ...values, email: values.email?.trim().toLowerCase() };
    const result = await apiRequest(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(normalizedValues) });
    setAccessToken(result.accessToken);
    const normalizedUser = result.user ? { ...result.user, email: result.user.email?.toLowerCase() } : result.user;
    setUser(normalizedUser);
    return normalizedUser;
  };

  const logout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => null);
    setAccessToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const result = await apiRequest('/auth/refresh', { method: 'POST' });
      setAccessToken(result.accessToken);
      const normalizedUser = result.user ? { ...result.user, email: result.user.email?.toLowerCase() } : result.user;
      setUser(normalizedUser);
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

