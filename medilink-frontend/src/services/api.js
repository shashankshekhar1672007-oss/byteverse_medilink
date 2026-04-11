const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5001/api';

const getToken = () => localStorage.getItem('ml_token');
const setToken = (t) => localStorage.setItem('ml_token', t);
const setRefreshToken = (t) => localStorage.setItem('ml_refresh', t);
const getRefreshToken = () => localStorage.getItem('ml_refresh');

export const clearTokens = () => {
  localStorage.removeItem('ml_token');
  localStorage.removeItem('ml_refresh');
  localStorage.removeItem('ml_user');
};

async function req(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !path.includes('/auth/') && getRefreshToken()) {
    try {
      const rr = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      });
      if (rr.ok) {
        const rd = await rr.json();
        setToken(rd.data.token);
        setRefreshToken(rd.data.refreshToken);
        headers['Authorization'] = `Bearer ${rd.data.token}`;
        res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      } else { clearTokens(); window.location.reload(); return; }
    } catch { clearTokens(); window.location.reload(); return; }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

export const auth = {
  login: async (email, password) => {
    const d = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(d.data.token); setRefreshToken(d.data.refreshToken);
    localStorage.setItem('ml_user', JSON.stringify(d.data.user));
    return d.data;
  },
  register: async (payload) => {
    const d = await req('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    setToken(d.data.token); setRefreshToken(d.data.refreshToken);
    localStorage.setItem('ml_user', JSON.stringify(d.data.user));
    return d.data;
  },
  logout: async () => { try { await req('/auth/logout', { method: 'POST' }); } catch {} clearTokens(); },
  getMe: () => req('/auth/me'),
  changePassword: (cur, nw) => req('/auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword: cur, newPassword: nw }) }),
  getSavedUser: () => { try { return JSON.parse(localStorage.getItem('ml_user')); } catch { return null; } },
  isLoggedIn: () => !!getToken(),
};

export const doctors = {
  getAll: (p = {}) => req(`/doctors?${new URLSearchParams(p)}`),
  getById: (id) => req(`/doctors/${id}`),
  getBySpecialty: (s) => req(`/doctors/specialty/${encodeURIComponent(s)}`),
  getOwnProfile: () => req('/doctors/profile'),
  updateProfile: (d) => req('/doctors/profile', { method: 'PUT', body: JSON.stringify(d) }),
  updateStatus: (online) => req('/doctors/status', { method: 'PUT', body: JSON.stringify({ online }) }),
  getDashboard: () => req('/doctors/dashboard'),
  getConsultations: (p = {}) => req(`/doctors/consultations?${new URLSearchParams(p)}`),
};

export const patients = {
  getProfile: () => req('/patients/profile'),
  updateProfile: (d) => req('/patients/profile', { method: 'PUT', body: JSON.stringify(d) }),
  getDashboard: () => req('/patients/dashboard'),
  getPrescriptions: (p = {}) => req(`/patients/prescriptions?${new URLSearchParams(p)}`),
  getActivePrescriptions: () => req('/patients/prescriptions/active'),
  getPrescriptionById: (id) => req(`/patients/prescriptions/${id}`),
  getConsultations: (p = {}) => req(`/patients/consultations?${new URLSearchParams(p)}`),
};

export const prescriptions = {
  create: (d) => req('/prescriptions', { method: 'POST', body: JSON.stringify(d) }),
  getById: (id) => req(`/prescriptions/${id}`),
  updateStatus: (id, status) => req(`/prescriptions/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  cancel: (id) => req(`/prescriptions/${id}`, { method: 'DELETE' }),
  getDoctorList: (p = {}) => req(`/prescriptions?${new URLSearchParams(p)}`),
};

export const consultations = {
  start: (doctorId, reason) => req('/consultations', { method: 'POST', body: JSON.stringify({ doctorId, reason }) }),
  getById: (id) => req(`/consultations/${id}`),
  accept: (id) => req(`/consultations/${id}/accept`, { method: 'PUT' }),
  end: (id, notes) => req(`/consultations/${id}/end`, { method: 'PUT', body: JSON.stringify({ notes }) }),
  cancel: (id) => req(`/consultations/${id}/cancel`, { method: 'PUT' }),
  getMessages: (id) => req(`/consultations/${id}/messages?limit=100`),
  sendMessage: (id, text) => req(`/consultations/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
};
