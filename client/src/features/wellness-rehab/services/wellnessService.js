// Module: Wellness & Rehabilitation | Phase 0 — Foundation
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/wellness';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

export const fetchWellnessSessions = async (seniorId) => {
  const response = await axios.get(`${API_BASE_URL}/sessions/${seniorId}`, {
    headers: authHeaders()
  });
  return response.data.sessions || [];
};

export const startWellnessSession = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/sessions/start`, payload, {
    headers: authHeaders()
  });
  return response.data.session;
};

export const completeWellnessSession = async (sessionId, payload) => {
  const response = await axios.put(`${API_BASE_URL}/sessions/${sessionId}/complete`, payload, {
    headers: authHeaders()
  });
  return response.data.session;
};

export const fetchExerciseLibrary = async () => {
  const response = await axios.get(`${API_BASE_URL}/exercises/library`, {
    headers: authHeaders()
  });
  return response.data.exercises || [];
};

export const logNutrition = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/nutrition/log`, payload, {
    headers: authHeaders()
  });
  return response.data.nutritionLog;
};

export const fetchNutritionLogs = async (seniorId) => {
  const response = await axios.get(`${API_BASE_URL}/nutrition/${seniorId}`, {
    headers: authHeaders()
  });
  return response.data.nutritionLogs || [];
};

export const fetchWellnessRecommendations = async (seniorId) => {
  const response = await axios.get(`${API_BASE_URL}/recommendations/${seniorId}`, {
    headers: authHeaders()
  });
  return response.data.recommendations || [];
};
