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

export const fetchEligibleMedicationReminders = async () => {
  const response = await axios.get(`${API_BASE_URL}/reminders/eligible`, { headers: authHeaders() });
  return response.data.reminders || [];
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

const updateMedicationReminderStatus = async (medicationId, occurrenceKey, action) => {
  const response = await axios.patch(
    `${API_BASE_URL}/${medicationId}/reminder/${action}`,
    { occurrenceKey },
    { headers: authHeaders() }
  );
  return response.data.reminder;
};

export const dismissMedicationReminder = (medicationId, occurrenceKey) => (
  updateMedicationReminderStatus(medicationId, occurrenceKey, 'dismiss')
);

export const markMedicationReminderTaken = (medicationId, occurrenceKey) => (
  updateMedicationReminderStatus(medicationId, occurrenceKey, 'taken')
);

export const skipMedicationReminder = (medicationId, occurrenceKey) => (
  updateMedicationReminderStatus(medicationId, occurrenceKey, 'skip')
);
