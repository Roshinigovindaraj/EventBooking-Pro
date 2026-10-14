import React from 'react';
import { apiRequest, setAccessToken } from '../services/apiClient.js';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiRequest('/auth/refresh', { method: 'POST' })
      .then(result => { setAccessToken(result.accessToken); setUser(result.user); })
      .catch(() => { setAccessToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (mode, values) => {
    const result = await apiRequest(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(values) });
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  };

  const logout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => null);
    setAccessToken(null);
    setUser(null);
  };

  const forgotPassword = email => apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  const resetPassword = values => apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(values) });

  return <AuthContext.Provider value={{ user, loading, login: values => authenticate('login', values), register: values => authenticate('register', values), forgotPassword, resetPassword, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

