const BASE_URL = '/api';

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
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data;
  }

  return {
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
    createIssue: (formData) => request('/issues', { method: 'POST', body: formData, isFormData: true }),
    getMyIssues: () => request('/issues/mine'),
    getAllIssues: () => request('/issues'),
    updateIssueStatus: (id, status) => request(`/issues/${id}/status`, { method: 'PUT', body: { status } }),
    getLeaderboard: () => request('/leaderboard'),
    suggestCategory: (formData) => request('/vision/local-analyze', { method: 'POST', body: formData, isFormData: true }),
  };
}

export const citizenApi = createApiClient('smarteye_citizen_token');
export const staffApi = createApiClient('smarteye_staff_token');