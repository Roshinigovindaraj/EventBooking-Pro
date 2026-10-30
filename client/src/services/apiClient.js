// Use the Vite proxy locally and a configured public API host in production.
// Keeping the local URL out of the production fallback prevents a deployed site
// from trying to call port 5000 on each visitor's own computer.
const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const normalizeApiBaseUrl = value => {
  const normalized = value.replace(/\/$/, '');
  // Accept either a backend origin or the complete API base URL. This avoids
  // silently deploying requests to /auth/* when Vercel is given only a host.
  return /^https?:\/\/[^/]+$/i.test(normalized) ? `${normalized}/api/v1` : normalized;
};
const API_BASE_URL = normalizeApiBaseUrl(configuredApiUrl || (import.meta.env.DEV ? '/api/v1' : ''));

export function getApiBaseUrl() {
  return API_BASE_URL;
}
const ACCESS_TOKEN_KEY = 'eventoria_access_token';
const REFRESH_TOKEN_KEY = 'eventoria_refresh_token';

let accessToken = (() => {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
  } catch {
    return null;
  }
})();
let refreshPromise = null;

export function getStoredRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setAccessToken(token) {
  accessToken = token || null;
  try {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {}
}

export function setRefreshToken(token) {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {}
}

export function setTokens({ accessToken: newAccess, refreshToken: newRefresh } = {}) {
  setAccessToken(newAccess);
  if (newRefresh !== undefined) {
    setRefreshToken(newRefresh);
  }
}

export function clearTokens() {
  accessToken = null;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {}
}

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error('API is not configured. Set VITE_API_BASE_URL in the deployment environment.');
  }
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  } catch (cause) {
    throw new Error(`Cannot reach the API at ${API_BASE_URL}. Check VITE_API_BASE_URL and the API CORS settings.`, { cause });
  }
  if (response.status === 401 && path !== '/auth/refresh' && options.retryAuth !== false) {
    // Only attempt a silent token refresh for routes that require authentication
    // (i.e. NOT the login/register endpoints). Auth endpoints that return 401
    // mean "wrong credentials" — we must surface that error to the user.
    const isAuthEndpoint = path.startsWith('/auth/');
    if (!isAuthEndpoint) {
      const storedRefresh = getStoredRefreshToken();
      refreshPromise ||= fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(storedRefresh ? { 'x-refresh-token': storedRefresh } : {}),
        },
        body: JSON.stringify({ refreshToken: storedRefresh }),
        credentials: 'include',
      })
        .then(async refreshResponse => {
          if (!refreshResponse.ok) {
            const fallback = await fetch(`${API_BASE_URL}/auth/quick-session`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({}),
            }).catch(() => null);
            if (fallback && fallback.ok) {
              const fallbackResult = await fallback.json();
              setTokens({ accessToken: fallbackResult.accessToken, refreshToken: fallbackResult.refreshToken });
              try {
                if (fallbackResult.user) {
                  localStorage.setItem('eventoria_user_profile', JSON.stringify(fallbackResult.user));
                }
              } catch {}
              return fallbackResult;
            }
            throw new Error('Authentication is required');
          }
          const result = await refreshResponse.json();
          setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
          return result;
        })
        .finally(() => { refreshPromise = null; });
      try {
        await refreshPromise;
        return apiRequest(path, { ...options, retryAuth: false });
      } catch {
        clearTokens();
      }
    }
  }
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Request failed');
    error.code = payload.error?.code;
    error.status = response.status;
    error.details = payload.error?.details;
    throw error;
  }
  return payload;
}

