/**
 * api.js
 * Camada de acesso ao backend NOC.
 * Troque API_BASE pelo IP real do servidor quando em produção.
 */

const API_BASE = window.NOC_API_BASE || 'http://localhost:8000';

async function apiFetch(path, options = {}) {
  // Injeta o token JWT no header Authorization se estiver logado
  const token = auth.obterToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  // Token expirado ou inválido — redireciona para login
  if (res.status === 401) {
    auth.fazerLogout();
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.status === 204 ? null : res.json();
}

const api = {
  devices: {
    list:   ()           => apiFetch('/devices/'),
    get:    (id)         => apiFetch(`/devices/${id}`),
    create: (data)       => apiFetch('/devices/',       { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data)   => apiFetch(`/devices/${id}`,  { method: 'PUT',  body: JSON.stringify(data) }),
    delete: (id)         => apiFetch(`/devices/${id}`,  { method: 'DELETE' }),
  },

  alerts: {
    list:    (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch(`/alerts/?${qs}`);
    },
    resolve: (id) => apiFetch(`/alerts/${id}/resolve`, { method: 'POST' }),
  },

  pingLogs: {
    get: (deviceId, limit = 60) => apiFetch(`/ping-logs/${deviceId}?limit=${limit}`),
  },

  status: {
    summary: () => apiFetch('/status/summary'),
  },

  links: {
    list:   ()     => apiFetch('/links/'),
    create: (data) => apiFetch('/links/', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id)   => apiFetch(`/links/${id}`, { method: 'DELETE' }),
  },
};