import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/community';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

export const getCommunityErrorMessage = (err, fallback = 'Something went wrong') => (
  err?.response?.data?.msg || err?.response?.data?.message || err?.message || fallback
);

const get = async (path, params) => {
  const response = await axios.get(`${API_BASE_URL}${path}`, { headers: authHeaders(), params });
  return response.data.data;
};

const post = async (path, body) => {
  const response = await axios.post(`${API_BASE_URL}${path}`, body, { headers: authHeaders() });
  return response.data.data;
};

const put = async (path, body) => {
  const response = await axios.put(`${API_BASE_URL}${path}`, body, { headers: authHeaders() });
  return response.data.data;
};

const del = async (path) => {
  const response = await axios.delete(`${API_BASE_URL}${path}`, { headers: authHeaders() });
  return response.data.data;
};

// ---- Forums (hobby groups & social forums) ----
export const fetchForumCategories = () => get('/forums/categories');
export const fetchForums = (params) => get('/forums', params);
export const fetchForum = (forumId) => get(`/forums/${forumId}`);
export const createForum = (payload) => post('/forums', payload);
export const updateForum = (forumId, payload) => put(`/forums/${forumId}`, payload);
export const archiveForum = (forumId) => del(`/forums/${forumId}`);
export const joinForum = (forumId) => post(`/forums/${forumId}/join`);
export const leaveForum = (forumId) => post(`/forums/${forumId}/leave`);

export const fetchForumPosts = (forumId, params) => get(`/forums/${forumId}/posts`, params);
export const createForumPost = (forumId, payload) => post(`/forums/${forumId}/posts`, payload);
export const toggleForumPostLike = (postId) => post(`/forums/posts/${postId}/like`);
export const deleteForumPost = (postId) => del(`/forums/posts/${postId}`);

export const fetchPostComments = (postId, params) => get(`/forums/posts/${postId}/comments`, params);
export const addPostComment = (postId, payload) => post(`/forums/posts/${postId}/comments`, payload);
export const deletePostComment = (commentId) => del(`/forums/comments/${commentId}`);

// ---- Events (discovery) ----
export const fetchEventCategories = () => get('/events/categories');
export const fetchEvents = (params) => get('/events', params);
export const fetchEvent = (eventId) => get(`/events/${eventId}`);
export const createEvent = (payload) => post('/events', payload);
export const rsvpToEvent = (eventId, status) => post(`/events/${eventId}/rsvp`, { status });
export const cancelEventRsvp = (eventId) => del(`/events/${eventId}/rsvp`);
export const cancelEvent = (eventId) => del(`/events/${eventId}`);

// ---- Virtual group activities ----
export const fetchActivityTypes = () => get('/activities/types');
export const fetchActivities = (params) => get('/activities', params);
export const createActivity = (payload) => post('/activities', payload);
export const joinActivity = (activityId) => post(`/activities/${activityId}/join`);
export const leaveActivity = (activityId) => post(`/activities/${activityId}/leave`);
export const cancelActivity = (activityId) => del(`/activities/${activityId}`);

// ---- Community announcements ----
export const fetchAnnouncementMeta = () => get('/announcements/meta');
export const fetchAnnouncements = (params) => get('/announcements', params);
export const createAnnouncement = (payload) => post('/announcements', payload);
export const markAnnouncementRead = (announcementId) => post(`/announcements/${announcementId}/read`);
export const deleteAnnouncement = (announcementId) => del(`/announcements/${announcementId}`);

// ---- Auto-replies ----
export const fetchAutoReplySettings = () => get('/autoreply/settings');
export const updateAutoReplySettings = (payload) => put('/autoreply/settings', payload);
export const fetchReplySuggestions = (text) => get('/autoreply/suggestions', { text });
