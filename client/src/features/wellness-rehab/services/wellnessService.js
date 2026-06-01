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
    throw new Error(getErrorMessage(err, 'Failed to load wellness sessions'), { cause: err });
  }
};

export const startSession = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/sessions/start`, data, {
      headers: authHeaders()
    });
    return response.data.session;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to start wellness session'), { cause: err });
  }
};

export const completeSession = async (id, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/sessions/${id}/complete`, data, {
      headers: authHeaders()
    });
    return response.data.session;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to complete wellness session'), { cause: err });
  }
};

export const getExerciseLibrary = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/exercises/library`);
    return response.data.exercises || [];
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load exercise library'), { cause: err });
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
    throw new Error(getErrorMessage(err, 'Failed to search food'), { cause: err });
  }
};

export const logNutrition = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/nutrition/log`, data, {
      headers: authHeaders()
    });
    return response.data.nutritionLog;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to log nutrition'), { cause: err });
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
    throw new Error(getErrorMessage(err, 'Failed to load nutrition logs'), { cause: err });
  }
};

export const deleteNutritionLog = async (logId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/nutrition/log/${logId}`, {
      headers: authHeaders()
    });
    return response.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to delete food log'), { cause: err });
  }
};

export const clearNutritionLogs = async (seniorId, date, mealType) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/nutrition/clear/${seniorId}`, {
      headers: authHeaders(),
      params: {
        date,
        meal_type: mealType || undefined
      }
    });
    return response.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to clear meal logs'), { cause: err });
  }
};

export const getNutritionSuggestions = async (seniorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/recommendations/${seniorId}`, {
      headers: authHeaders()
    });
    return response.data.suggestions || [];
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load nutrition suggestions'), { cause: err });
  }
};

export const getStreak = async (seniorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/streak/${seniorId}`, {
      headers: authHeaders()
    });
    return response.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load streak'));
  }
};

export const fetchWellnessSessions = getSessions;
export const startWellnessSession = startSession;
export const completeWellnessSession = completeSession;
export const fetchExerciseLibrary = getExerciseLibrary;
export const fetchNutritionLogs = getNutritionLogs;
export const fetchWellnessRecommendations = getNutritionSuggestions;
