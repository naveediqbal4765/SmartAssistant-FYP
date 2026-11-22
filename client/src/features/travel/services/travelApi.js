import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/travel';

const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`
  }
});

export const createJourney = async ({ pickup, destination, route, caregiverLocationConsent }) => {
  const response = await axios.post(
    API_BASE,
    { pickup, destination, route, caregiverLocationConsent },
    getAuthHeaders()
  );
  return response.data;
};

export const listJourneys = async ({ status, limit = 20, page = 1 } = {}) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit);
  params.append('page', page);

  const response = await axios.get(`${API_BASE}?${params}`, getAuthHeaders());
  return response.data;
};

export const getJourney = async (journeyId) => {
  const response = await axios.get(`${API_BASE}/${journeyId}`, getAuthHeaders());
  return response.data;
};

export const startJourney = async (journeyId, currentLocation = null) => {
  const response = await axios.post(
    `${API_BASE}/${journeyId}/start`,
    { currentLocation },
    getAuthHeaders()
  );
  return response.data;
};

export const updateJourneyLocation = async (journeyId, coordinates) => {
  const response = await axios.patch(
    `${API_BASE}/${journeyId}/location`,
    { coordinates },
    getAuthHeaders()
  );
  return response.data;
};

export const completeJourney = async (journeyId) => {
  const response = await axios.post(
    `${API_BASE}/${journeyId}/complete`,
    {},
    getAuthHeaders()
  );
  return response.data;
};

export const cancelJourney = async (journeyId) => {
  const response = await axios.post(
    `${API_BASE}/${journeyId}/cancel`,
    {},
    getAuthHeaders()
  );
  return response.data;
};

// ── Caregiver API ────────────────────────────────────────────────────────────

export const getCaregiverActiveJourney = async () => {
  const response = await axios.get(
    `${API_BASE}/caregiver/active`,
    getAuthHeaders()
  );
  return response.data;
};

export const getCaregiverJourneys = async ({ status, limit = 20, page = 1 } = {}) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit);
  params.append('page', page);

  const response = await axios.get(
    `${API_BASE}/caregiver/journeys?${params}`,
    getAuthHeaders()
  );
  return response.data;
};

// ── History Management API ───────────────────────────────────────────────────

export const hideJourneyFromHistory = async (journeyId) => {
  const response = await axios.post(
    `${API_BASE}/${journeyId}/hide`,
    {},
    getAuthHeaders()
  );
  return response.data;
};

export const clearHistory = async () => {
  const response = await axios.post(
    `${API_BASE}/history/clear`,
    {},
    getAuthHeaders()
  );
  return response.data;
};
