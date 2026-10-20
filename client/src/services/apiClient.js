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
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
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

