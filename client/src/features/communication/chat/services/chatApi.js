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

export const fetchConversation = async (conversationId) => {
  const response = await axios.get(`${API_BASE_URL}/conversations/${conversationId}`, {
    headers: authHeaders()
  });
  return response.data.conversation;
};

export const createConversation = async (participantId) => {
  const response = await axios.post(
    `${API_BASE_URL}/conversations`,
    { participantId },
    { headers: authHeaders() }
  );
  return response.data.conversation;
};

export const resolveConversation = async ({
  conversationId,
  fromUserId,
  toUserId
}) => {
  const response = await axios.post(
    `${API_BASE_URL}/conversations/resolve`,
    { conversationId, fromUserId, toUserId },
    { headers: authHeaders() }
  );
  return response.data.conversation;
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
  duration = null,
  repliedToMessageId = ''
}) => {
  const response = await axios.post(
    `${API_BASE_URL}/message`,
    { receiverId, message, messageType, mediaUrl, duration, repliedToMessageId },
    { headers: authHeaders() }
  );
  return response.data.message;
};

export const deleteMessage = async (messageId, deleteType = 'forEveryone') => {
  const response = await axios.delete(`${API_BASE_URL}/message/${messageId}`, {
    headers: authHeaders(),
    data: { deleteType }
  });
  return response.data;
};

export const reactToMessage = async (messageId, reactionType) => {
  const response = await axios.post(
    `http://localhost:5000/api/messages/${messageId}/reaction`,
    { reactionType },
    { headers: authHeaders() }
  );
  return response.data;
};

export const reactToVoiceNote = async (voiceNoteId, reactionType) => {
  const response = await axios.post(
    `http://localhost:5000/api/voice-notes/${voiceNoteId}/reaction`,
    { reactionType },
    { headers: authHeaders() }
  );
  return response.data;
};

export const deleteConversation = async (conversationId) => {
  const response = await axios.delete(`http://localhost:5000/api/communication/conversation/${conversationId}`, {
    headers: authHeaders()
  });
  return response.data;
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
