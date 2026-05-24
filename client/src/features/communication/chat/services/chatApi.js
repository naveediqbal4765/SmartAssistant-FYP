import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/communication/chat';
const UPLOAD_BASE_URL = 'http://localhost:5000/api/communication/uploads';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

export const fetchConversations = async () => {
  const response = await axios.get(`${API_BASE_URL}/conversations`, {
    headers: authHeaders()
  });
  return response.data.conversations || [];
};

export const fetchMessages = async (userId) => {
  const response = await axios.get(`${API_BASE_URL}/${userId}`, {
    headers: authHeaders()
  });
  return response.data.messages || [];
};

export const sendMessage = async ({
  receiverId,
  message,
  messageType = 'text',
  mediaUrl = '',
  duration = null
}) => {
  const response = await axios.post(
    `${API_BASE_URL}/message`,
    { receiverId, message, messageType, mediaUrl, duration },
    { headers: authHeaders() }
  );
  return response.data.message;
};

export const uploadAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, `voice-${Date.now()}.webm`);

  const response = await axios.post(`${UPLOAD_BASE_URL}/audio`, formData, {
    headers: {
      ...authHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data.audio;
};

export const searchUsers = async (query) => {
  const response = await axios.get(`${API_BASE_URL}/search-users`, {
    params: { query },
    headers: authHeaders()
  });
  return response.data.users || [];
};
