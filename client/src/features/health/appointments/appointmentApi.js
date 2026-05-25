import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/health/appointments';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

export const getAppointmentErrorMessage = (err, fallback = 'Appointment request failed') => (
  err?.response?.data?.msg || err?.response?.data?.message || err?.message || fallback
);

export const fetchAppointments = async () => {
  const response = await axios.get(API_BASE_URL, { headers: authHeaders() });
  return response.data.appointments || [];
};

export const createAppointment = async (payload) => {
  const response = await axios.post(API_BASE_URL, payload, { headers: authHeaders() });
  return response.data.appointment;
};

export const updateAppointment = async (appointmentId, payload) => {
  const response = await axios.put(`${API_BASE_URL}/${appointmentId}`, payload, {
    headers: authHeaders()
  });
  return response.data.appointment;
};

export const deleteAppointment = async (appointmentId) => {
  const response = await axios.delete(`${API_BASE_URL}/${appointmentId}`, {
    headers: authHeaders()
  });
  return response.data;
};
