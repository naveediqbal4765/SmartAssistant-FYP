import axios from 'axios';

const API_URL = 'http://localhost:5000/api/health/interactions/check';

export const getInteractionErrorMessage = (err, fallback = 'Failed to check interactions') => (
  err?.response?.data?.msg || err?.response?.data?.message || err?.message || fallback
);

export const checkInteractions = async (medications) => {
  const response = await axios.post(API_URL, { medications });
  return response.data;
};
