const TOKEN_KEY = 'calliphony_auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function apiBase() {
  const configured = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return configured || '';
}

export async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  login: (email, password) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiRequest('/api/auth/me'),
  getEvents: () => apiRequest('/api/events'),
  createEvent: (payload) =>
    apiRequest('/api/events', { method: 'POST', body: JSON.stringify(payload) }),
  updateEvent: (id, payload) =>
    apiRequest(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEvent: (id) => apiRequest(`/api/events/${id}`, { method: 'DELETE' }),
  getSecretaries: () => apiRequest('/api/secretaries'),
  createSecretary: (payload) =>
    apiRequest('/api/secretaries', { method: 'POST', body: JSON.stringify(payload) }),
  updateSecretary: (id, payload) =>
    apiRequest(`/api/secretaries/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSecretary: (id) => apiRequest(`/api/secretaries/${id}`, { method: 'DELETE' }),
  submitIntake: (payload) =>
    apiRequest('/api/intake', { method: 'POST', body: JSON.stringify(payload) }),
  getIntakeRegistrations: () => apiRequest('/api/intake'),
  deleteIntakeRegistration: (id) => apiRequest(`/api/intake/${id}`, { method: 'DELETE' }),
};
