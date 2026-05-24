import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/communication/notifications';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

export const fetchNotifications = async () => {
  const response = await axios.get(API_BASE_URL, {
    headers: authHeaders()
  });
  return response.data.notifications || [];
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await axios.patch(`${API_BASE_URL}/${notificationId}/read`, null, {
    headers: authHeaders()
  });
  return response.data.notification;
};
