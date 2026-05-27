import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/tasks';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

const getGoogleMapsUrl = (lat, lng) => (
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    ? `https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`
    : ''
);

const normalizeLocation = (location = {}) => {
  const lat = Number(location.lat ?? location.coordinates?.lat);
  const lng = Number(location.lng ?? location.coordinates?.lng);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  return {
    address: location.address || '',
    lat: hasCoordinates ? lat : null,
    lng: hasCoordinates ? lng : null,
    googleMapsUrl: location.googleMapsUrl || (hasCoordinates ? getGoogleMapsUrl(lat, lng) : ''),
    coordinates: hasCoordinates ? { lat, lng } : null
  };
};

const normalizeTaskStatus = (status) => (
  ['closed', 'verified'].includes(status) ? 'verified_completed' : status
);

export const normalizeTask = (task = {}) => ({
  ...task,
  status: normalizeTaskStatus(task.status),
  location: normalizeLocation(task.location || task.pickupLocation || {}),
  pickupLocation: normalizeLocation(task.pickupLocation || task.location || {}),
  dropLocation: normalizeLocation(task.dropLocation || {})
});

const normalizeTasks = (tasks = []) => tasks.map(normalizeTask);

export const getTaskErrorMessage = (err, fallback = 'Task request failed') => (
  err?.response?.data?.msg || err?.response?.data?.message || err?.message || fallback
);

export const fetchTaskRequests = async () => {
  const response = await axios.get(`${API_BASE_URL}/my-requests`, { headers: authHeaders() });
  return normalizeTasks(response.data.tasks || []);
};

export const fetchCurrentUserProfile = async () => {
  const response = await axios.get('http://localhost:5000/api/user/profile', { headers: authHeaders() });
  return response.data.user;
};

export const fetchAvailableTasks = async () => {
  const response = await axios.get(`${API_BASE_URL}/available`, { headers: authHeaders() });
  return normalizeTasks(response.data.tasks || []);
};

export const fetchVolunteerTaskHistory = async () => {
  const response = await axios.get(`${API_BASE_URL}/history`, { headers: authHeaders() });
  return normalizeTasks(response.data.tasks || []);
};

export const createTaskRequest = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/request`, payload, { headers: authHeaders() });
  return normalizeTask(response.data.task);
};

export const updateTaskRequest = async (taskId, payload) => {
  const response = await axios.put(`${API_BASE_URL}/${taskId}`, payload, { headers: authHeaders() });
  return normalizeTask(response.data.task);
};

export const deleteTaskRequest = async (taskId) => {
  const response = await axios.delete(`${API_BASE_URL}/${taskId}`, { headers: authHeaders() });
  return response.data;
};

export const hideTaskHistoryItem = async (taskId) => {
  const response = await axios.patch(`${API_BASE_URL}/history/${taskId}/hide`, null, { headers: authHeaders() });
  return response.data;
};

export const clearTaskHistory = async () => {
  const response = await axios.patch(`${API_BASE_URL}/history/clear`, null, { headers: authHeaders() });
  return response.data;
};

export const acceptTask = async (taskId) => {
  const response = await axios.patch(`${API_BASE_URL}/${taskId}/accept`, null, { headers: authHeaders() });
  return normalizeTask(response.data.task);
};

export const ignoreTask = async (taskId) => {
  const response = await axios.patch(`${API_BASE_URL}/${taskId}/ignore`, null, { headers: authHeaders() });
  return response.data;
};

export const startTask = async (taskId) => {
  const response = await axios.patch(`${API_BASE_URL}/${taskId}/start`, null, { headers: authHeaders() });
  return normalizeTask(response.data.task);
};

export const completeTask = async (taskId, payload = {}) => {
  const response = await axios.patch(`${API_BASE_URL}/${taskId}/complete`, payload, { headers: authHeaders() });
  return normalizeTask(response.data.task);
};

export const verifyTask = async (taskId, payload) => {
  const response = await axios.patch(`${API_BASE_URL}/${taskId}/verify`, payload, { headers: authHeaders() });
  return normalizeTask(response.data.task);
};
