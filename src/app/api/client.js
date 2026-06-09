'use client';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Base URL for API requests
 * Uses environment variable or defaults to localhost
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Helper function to make API requests
 * Handles authentication, headers, error handling
 */
async function request(endpoint, options = {}) {
  const { method = 'GET', body = null, ...restOptions } = options;

  // Get auth token from localStorage
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...restOptions.headers,
  };

  // Add Authorization header if token exists
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Make the request
  const url = `${API_URL}${endpoint}`;
  const fetchOptions = {
    method,
    headers,
    ...restOptions,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  // Handle error responses
  if (!response.ok) {
    let errorMessage = `API Error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Response is not JSON, use status text
    }
    throw new ApiError(errorMessage, response.status);
  }

  // Parse and return response
  try {
    return await response.json();
  } catch (e) {
    // If response is not JSON (e.g., 204 No Content), return null
    return null;
  }
}

/**
 * API client object with all available endpoints
 */
export const api = {
  // Authentication
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    request('/auth/me', {
      method: 'GET',
    }),

  // Users
  getUsers: () => request('/users').then((r) => r.data),

  getUser: (id) =>
    request(`/users/${id}`, {
      method: 'GET',
    }),

  createUser: (data) =>
    request('/users', {
      method: 'POST',
      body: data,
    }),

  updateUser: (id, data) =>
    request(`/users/${id}`, {
      method: 'PUT',
      body: data,
    }),

  deleteUser: (id) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),

  // Classes
  getClasses: () => request('/classes').then((r) => r.data),

  getClass: (id) =>
    request(`/classes/${id}`, {
      method: 'GET',
    }),

  createClass: (data) =>
    request('/classes', {
      method: 'POST',
      body: data,
    }),

  updateClass: (id, data) =>
    request(`/classes/${id}`, {
      method: 'PUT',
      body: data,
    }),

  deleteClass: (id) =>
    request(`/classes/${id}`, {
      method: 'DELETE',
    }),

  // Schedules
  getSchedules: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/schedules?${queryString}` : '/schedules';
    return request(endpoint).then((r) => r.data);
  },

  getSchedule: (id) =>
    request(`/schedules/${id}`, {
      method: 'GET',
    }),

  createSchedule: (data) =>
    request('/schedules', {
      method: 'POST',
      body: data,
    }),

  updateSchedule: (id, data) =>
    request(`/schedules/${id}`, {
      method: 'PUT',
      body: data,
    }),

  deleteSchedule: (id) =>
    request(`/schedules/${id}`, {
      method: 'DELETE',
    }),

  // Enrollments
  getEnrollments: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/enrollments?${queryString}` : '/enrollments';
    return request(endpoint).then((r) => r.data);
  },

  createEnrollment: (data) =>
    request('/enrollments', {
      method: 'POST',
      body: data,
    }),

  deleteEnrollment: (id) =>
    request(`/enrollments/${id}`, {
      method: 'DELETE',
    }),

  assignments: {
    list: (params) => request(`/assignments?${new URLSearchParams(params)}`).then(r => r.data),
    create: (data) => request('/assignments', { method: 'POST', body: data }),
    update: (id, data) => request(`/assignments/${id}`, { method: 'PUT', body: data }),
  },

  grades: {
    list: (params) => request(`/grades?${new URLSearchParams(params)}`).then(r => r.data),
    create: (data) => request('/grades', { method: 'POST', body: data }),
    update: (id, data) => request(`/grades/${id}`, { method: 'PUT', body: data }),
  },

  attendance: {
    list: (params) => request(`/attendance?${new URLSearchParams(params)}`).then(r => r.data),
    mark: (data) => request('/attendance', { method: 'POST', body: data }),
    validate: (id) => request(`/attendance/${id}/validate`, { method: 'PUT' }),
  },

  notifications: {
    getPreferences: () => request('/notifications/preferences'),
    updatePreferences: (data) => request('/notifications/preferences', { method: 'PUT', body: data }),
    list: (params) => request(`/notifications?${new URLSearchParams(params)}`).then(r => r.data),
    unreadCount: () => request('/notifications/unread-count'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),
  },

  cancellations: {
    create: (scheduleId, data) => request(`/schedules/${scheduleId}/cancel`, { method: 'POST', body: data }),
    delete: (scheduleId, date) => request(`/schedules/${scheduleId}/cancel/${date}`, { method: 'DELETE' }),
    list: (scheduleId) => request(`/schedules/${scheduleId}/cancellations`).then(r => r.data),
  },

  absences: {
    declare: (scheduleId, data) => request(`/schedules/${scheduleId}/absence`, { method: 'POST', body: data }),
    list: (scheduleId) => request(`/schedules/${scheduleId}/absences`).then(r => r.data),
  },
};
