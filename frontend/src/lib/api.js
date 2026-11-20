const API_BASE = import.meta.env.VITE_API_URL || '';
const BASE_URL = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api` : '/api';

export function getPhotoUrl(photoUrl) {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  return `${API_BASE.replace(/\/$/, '')}${photoUrl}`;
}

export function createApiClient(tokenKey) {
  async function request(path, { method = 'GET', body, isFormData = false } = {}) {
    const headers = {};
    const token = localStorage.getItem(tokenKey);
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.message || `Request failed with status ${response.status}`);
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    verifyOtp: (payload) => request('/auth/verify-otp', { method: 'POST', body: payload }),
    resendOtp: (payload) => request('/auth/resend-otp', { method: 'POST', body: payload }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
    createIssue: (formData) => request('/issues', { method: 'POST', body: formData, isFormData: true }),
    getMyIssues: () => request('/issues/mine'),
    getAllIssues: () => request('/issues'),
    updateIssueStatus: (id, status, resolutionPhotoUrl, resolutionNote, rejectionReason) =>
      request(`/issues/${id}/status`, {
        method: 'PUT',
        body: { status, resolutionPhotoUrl, resolutionNote, rejectionReason },
      }),
    checkDuplicates: (lat, lng, category) =>
      request(`/issues/check-duplicates?lat=${lat}&lng=${lng}&category=${encodeURIComponent(category || '')}`),
    upvoteIssue: (id) => request(`/issues/${id}/upvote`, { method: 'POST' }),
    getNotifications: () => request('/notifications'),
    markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
    getLeaderboard: () => request('/leaderboard'),
    suggestCategory: (formData) =>
      request('/vision/local-analyze', { method: 'POST', body: formData, isFormData: true }),
  };
}

export const citizenApi = createApiClient('smarteye_citizen_token');
export const staffApi = createApiClient('smarteye_staff_token');