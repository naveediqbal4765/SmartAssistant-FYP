import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/health/medications';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

export const getMedicationErrorMessage = (err, fallback = 'Medication request failed') => (
  err?.response?.data?.msg || err?.response?.data?.message || err?.message || fallback
);

export const fetchMedications = async () => {
  const response = await axios.get(API_BASE_URL, { headers: authHeaders() });
  return response.data.medications || [];
};

export const createMedication = async (payload) => {
  const response = await axios.post(API_BASE_URL, payload, { headers: authHeaders() });
  return response.data.medication;
};

export const updateMedication = async (medicationId, payload) => {
  const response = await axios.put(`${API_BASE_URL}/${medicationId}`, payload, {
    headers: authHeaders()
  });
  return response.data.medication;
};

export const deleteMedication = async (medicationId) => {
  const response = await axios.delete(`${API_BASE_URL}/${medicationId}`, {
    headers: authHeaders()
  });
  return response.data;
};
