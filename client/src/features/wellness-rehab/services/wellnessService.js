// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/wellness';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

const getErrorMessage = (err, fallback) => (
  err?.response?.data?.msg || err?.response?.data?.message || err?.message || fallback
);

export const getSessions = async (seniorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/sessions/${seniorId}`, {
      headers: authHeaders()
    });
    return response.data.sessions || [];
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load wellness sessions'));
  }
};

export const startSession = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/sessions/start`, data, {
      headers: authHeaders()
    });
    return response.data.session;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to start wellness session'));
  }
};

export const completeSession = async (id, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/sessions/${id}/complete`, data, {
      headers: authHeaders()
    });
    return response.data.session;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to complete wellness session'));
  }
};

export const getExerciseLibrary = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/exercises/library`);
    return response.data.exercises || [];
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load exercise library'));
  }
};

export const logNutrition = async (payload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/nutrition/log`, payload, {
      headers: authHeaders()
    });
    return response.data.nutritionLog;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to log nutrition'));
  }
};

export const fetchNutritionLogs = async (seniorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/nutrition/${seniorId}`, {
      headers: authHeaders()
    });
    return response.data.nutritionLogs || [];
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load nutrition logs'));
  }
};

export const fetchWellnessRecommendations = async (seniorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/recommendations/${seniorId}`, {
      headers: authHeaders()
    });
    return response.data.recommendations || [];
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load wellness recommendations'));
  }
};

export const fetchWellnessSessions = getSessions;
export const startWellnessSession = startSession;
export const completeWellnessSession = completeSession;
export const fetchExerciseLibrary = getExerciseLibrary;
