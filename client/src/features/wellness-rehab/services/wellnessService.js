// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
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

export const searchFood = async (name) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/food/search`, {
      params: { name }
    });
    return {
      results: response.data.results || [],
      message: response.data.message || ''
    };
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to search food'));
  }
};

export const logNutrition = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/nutrition/log`, data, {
      headers: authHeaders()
    });
    return response.data.nutritionLog;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to log nutrition'));
  }
};

export const getNutritionLogs = async (seniorId, date) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/nutrition/${seniorId}`, {
      headers: authHeaders(),
      params: date ? { date } : {}
    });
    return {
      breakfast: response.data.breakfast || [],
      lunch: response.data.lunch || [],
      dinner: response.data.dinner || [],
      snack: response.data.snack || [],
      totals: response.data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    };
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load nutrition logs'));
  }
};

export const getNutritionSuggestions = async (seniorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/recommendations/${seniorId}`, {
      headers: authHeaders()
    });
    return response.data.suggestions || [];
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load nutrition suggestions'));
  }
};

export const fetchWellnessSessions = getSessions;
export const startWellnessSession = startSession;
export const completeWellnessSession = completeSession;
export const fetchExerciseLibrary = getExerciseLibrary;
export const fetchNutritionLogs = getNutritionLogs;
export const fetchWellnessRecommendations = getNutritionSuggestions;
