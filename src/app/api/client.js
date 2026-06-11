'use client';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request(endpoint, options = {}) {
  const { method = 'GET', body = null, headers: extraHeaders = {}, ...restOptions } = options;
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const fetchOptions = { method, headers, ...restOptions };
  if (body !== null) fetchOptions.body = JSON.stringify(body);
  const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);
  if (!response.ok) {
    let errorMessage = `API Error: ${response.statusText}`;
    try { const err = await response.json(); errorMessage = err.message || errorMessage; } catch {}
    throw new ApiError(errorMessage, response.status);
  }
  try { return await response.json(); } catch { return null; }
}

const list = (path, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`${path}${qs ? '?' + qs : ''}`).then(r => Array.isArray(r) ? r : (r?.data ?? []));
};

export const api = {
  login:  (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe:  () => request('/auth/me'),

  getUsers:     () => request('/users').then(r => r?.data ?? []),
  getUser:      (id) => request(`/users/${id}`),
  createUser:   (data) => request('/users', { method: 'POST', body: data }),
  updateUser:   (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
  deleteUser:   (id) => request(`/users/${id}`, { method: 'DELETE' }),

  lessonSlots: {
    list:        (params = {}) => list('/lesson-slots', params),
    get:         (id) => request(`/lesson-slots/${id}`),
    create:      (data) => request('/lesson-slots', { method: 'POST', body: data }),
    createBatch: (data) => request('/lesson-slots/batch', { method: 'POST', body: data }),
    checkin:     (id, plateAtCheckin) => request(`/lesson-slots/${id}/checkin`, { method: 'PUT', body: { plate_at_checkin: plateAtCheckin } }),
    noShow:      (id) => request(`/lesson-slots/${id}/no-show`, { method: 'PUT' }),
    cancel:      (id) => request(`/lesson-slots/${id}/cancel`, { method: 'PUT' }),
    reschedule:  (id, data) => request(`/lesson-slots/${id}/reschedule`, { method: 'PUT', body: data }),
    absence:     (id) => request(`/lesson-slots/${id}/absence`, { method: 'POST' }),
  },

  slots: {
    available: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/slots/available${qs ? '?' + qs : ''}`).then(r => Array.isArray(r) ? r : []);
    },
  },

  examResults: {
    list:   (params = {}) => list('/exam-results', params),
    create: (data) => request('/exam-results', { method: 'POST', body: data }),
    update: (id, data) => request(`/exam-results/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/exam-results/${id}`, { method: 'DELETE' }),
  },

  vehicles: {
    list:   () => list('/vehicles'),
    create: (data) => request('/vehicles', { method: 'POST', body: data }),
    update: (id, data) => request(`/vehicles/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),
  },

  instructors: {
    vehicles: {
      list:   (instructorId) => request(`/instructors/${instructorId}/vehicles`).then(r => Array.isArray(r) ? r : []),
      add:    (instructorId, vehicleId) => request(`/instructors/${instructorId}/vehicles`, { method: 'POST', body: { vehicle_id: vehicleId } }),
      remove: (instructorId, vehicleId) => request(`/instructors/${instructorId}/vehicles/${vehicleId}`, { method: 'DELETE' }),
    },
    availability: {
      list:   (instructorId) => request(`/instructors/${instructorId}/availability`).then(r => Array.isArray(r) ? r : []),
      add:    (instructorId, data) => request(`/instructors/${instructorId}/availability`, { method: 'POST', body: data }),
      delete: (instructorId, windowId) => request(`/instructors/${instructorId}/availability/${windowId}`, { method: 'DELETE' }),
    },
  },

  notifications: {
    getPreferences:    () => request('/notifications/preferences'),
    updatePreferences: (data) => request('/notifications/preferences', { method: 'PUT', body: data }),
    list:              (params = {}) => list('/notifications', params),
    unreadCount:       () => request('/notifications/unread-count'),
    markRead:          (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead:       () => request('/notifications/read-all', { method: 'PUT' }),
  },
};
