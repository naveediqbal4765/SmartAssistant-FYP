import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/communication/groups';
const LEGACY_API_BASE_URL = 'http://localhost:5000/api/communication/group';
const UPLOAD_BASE_URL = 'http://localhost:5000/api/communication/uploads';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

export const getGroupApiErrorMessage = (err, fallback = 'Group request failed') => {
  return err?.response?.data?.msg
    || err?.response?.data?.message
    || err?.message
    || fallback;
};

const logGroupApiError = (label, err) => {
  console.error(label, {
    status: err?.response?.status,
    data: err?.response?.data,
    headers: err?.response?.headers,
    message: err?.message
  });
};

export const fetchMyGroups = async () => {
  const response = await axios.get(API_BASE_URL, { headers: authHeaders() });
  return response.data.groups || [];
};

export const discoverGroups = async () => {
  const response = await axios.get(`${API_BASE_URL}/discover`, { headers: authHeaders() });
  return response.data.groups || [];
};

export const createGroup = async ({ name, description, initialMemberIds = [] }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Unauthorized request: missing JWT token');
  }

  try {
    const response = await axios.post(
      API_BASE_URL,
      { name, description, initialMemberIds },
      { headers: authHeaders() }
    );
    return response.data.group;
  } catch (err) {
    logGroupApiError('Create group API failed', err);
    if (err?.response?.status === 404) {
      console.warn('Retrying create group with compatibility endpoint:', LEGACY_API_BASE_URL);
      const retryResponse = await axios.post(
        LEGACY_API_BASE_URL,
        { name, description, initialMemberIds },
        { headers: authHeaders() }
      );
      return retryResponse.data.group;
    }
    throw err;
  }
};

export const searchInitialGroupMembers = async (query) => {
  const response = await axios.get(`${API_BASE_URL}/create/search-users`, {
    params: { query },
    headers: authHeaders()
  });
  return response.data.users || [];
};

export const fetchGroupMessages = async (groupId) => {
  const response = await axios.get(`${API_BASE_URL}/${groupId}/messages`, { headers: authHeaders() });
  return response.data.messages || [];
};

export const sendGroupMessage = async ({
  groupId,
  message,
  messageType = 'text',
  mediaUrl = '',
  fileName = '',
  mimeType = '',
  size = null,
  repliedToMessageId = '',
  forwardedFrom = null
}) => {
  const response = await axios.post(
    `${API_BASE_URL}/${groupId}/messages`,
    { message, messageType, mediaUrl, fileName, mimeType, size, repliedToMessageId, forwardedFrom },
    { headers: authHeaders() }
  );
  return response.data.message;
};

export const updateGroup = async (groupId, payload) => {
  const response = await axios.patch(`${API_BASE_URL}/${groupId}`, payload, {
    headers: authHeaders()
  });
  return response.data.group;
};

export const deleteGroupMessage = async (messageId, deleteType = 'forEveryone') => {
  const response = await axios.delete(`${API_BASE_URL}/message/${messageId}`, {
    headers: authHeaders(),
    data: { deleteType }
  });
  return response.data;
};

export const reactToGroupMessage = async (messageId, reactionType) => {
  const response = await axios.post(
    `${API_BASE_URL}/message/${messageId}/reaction`,
    { reactionType },
    { headers: authHeaders() }
  );
  return response.data.message;
};

export const exitGroup = async (groupId) => {
  const response = await axios.post(`${API_BASE_URL}/${groupId}/exit`, null, {
    headers: authHeaders()
  });
  return response.data;
};

export const muteGroup = async (groupId, muted = true) => {
  const response = await axios.patch(`${API_BASE_URL}/${groupId}/mute`, { muted }, {
    headers: authHeaders()
  });
  return response.data.group;
};

export const uploadGroupAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, `group-voice-${Date.now()}.webm`);

  const response = await axios.post(`${UPLOAD_BASE_URL}/audio`, formData, {
    headers: {
      ...authHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data.audio;
};

export const uploadGroupMedia = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${UPLOAD_BASE_URL}/media`, formData, {
    headers: {
      ...authHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data.media;
};

export const requestToJoinGroup = async (groupId) => {
  const response = await axios.post(`${API_BASE_URL}/${groupId}/join-request`, null, {
    headers: authHeaders()
  });
  return response.data.request;
};

export const cancelJoinRequest = async (groupId) => {
  const response = await axios.delete(`${API_BASE_URL}/${groupId}/join-request`, {
    headers: authHeaders()
  });
  return response.data;
};

export const fetchGroupRequests = async (groupId) => {
  const response = await axios.get(`${API_BASE_URL}/${groupId}/requests`, {
    headers: authHeaders()
  });
  return response.data.requests || [];
};

export const approveGroupRequest = async (requestId) => {
  const response = await axios.patch(`${API_BASE_URL}/requests/${requestId}/approve`, null, {
    headers: authHeaders()
  });
  return response.data.request;
};

export const rejectGroupRequest = async (requestId) => {
  const response = await axios.patch(`${API_BASE_URL}/requests/${requestId}/reject`, null, {
    headers: authHeaders()
  });
  return response.data.request;
};

export const removeGroupMember = async (groupId, userId) => {
  const response = await axios.delete(`${API_BASE_URL}/${groupId}/members/${userId}`, {
    headers: authHeaders()
  });
  return response.data.group;
};

export const searchAddableUsers = async (groupId, query) => {
  const response = await axios.get(`${API_BASE_URL}/${groupId}/search-users`, {
    params: { query },
    headers: authHeaders()
  });
  return response.data.users || [];
};

export const addMemberToGroup = async ({ groupId, userId }) => {
  const response = await axios.post(`${API_BASE_URL}/add-member`, { groupId, userId }, {
    headers: authHeaders()
  });
  return response.data.group;
};
