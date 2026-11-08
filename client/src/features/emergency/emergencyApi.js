import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/emergency';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

export const getEmergencyErrorMessage = (err, fallback = 'Could not send the emergency alert') => (
  err?.response?.data?.msg || err?.response?.data?.message || err?.message || fallback
);

/**
 * Triggers an emergency alert for the logged-in senior.
 * `location` is optional: when omitted, the server falls back to the
 * location last saved on the senior's profile.
 */
export const triggerEmergency = async ({ location, message } = {}) => {
  const payload = {};

  if (location) payload.location = location;
  if (message) payload.message = message;

  const response = await axios.post(`${API_BASE_URL}/trigger`, payload, { headers: authHeaders() });
  return response.data;
};

// Still-ACTIVE emergencies the logged-in user was alerted about.
export const fetchActiveEmergencies = async () => {
  const response = await axios.get(`${API_BASE_URL}/active`, { headers: authHeaders() });
  return response.data.incidents || [];
};

// Recent emergencies (waiting or accepted) a caregiver was alerted about.
export const fetchCaregiverEmergencies = async () => {
  const response = await axios.get(`${API_BASE_URL}/caregiver`, { headers: authHeaders() });
  return response.data.incidents || [];
};

export const acceptEmergency = async (emergencyId) => {
  const response = await axios.post(`${API_BASE_URL}/accept`, { emergencyId }, { headers: authHeaders() });
  return response.data;
};
