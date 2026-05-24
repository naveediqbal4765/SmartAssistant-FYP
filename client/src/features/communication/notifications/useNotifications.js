import { useCallback, useEffect, useMemo, useState } from 'react';
import { getChatSocket } from '../chat/services/socket';
import { fetchNotifications, markNotificationAsRead } from './notificationApi';

const mergeNotifications = (current, incoming) => {
  const byId = new Map();

  [...incoming, ...current].forEach((notification) => {
    if (!notification?._id) return;
    byId.set(String(notification._id), {
      ...byId.get(String(notification._id)),
      ...notification
    });
  });

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const socket = getChatSocket();

    const handleNewNotification = (notification) => {
      setNotifications((current) => mergeNotifications(current, [notification]));
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, []);

  const markRead = async (notificationId) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification._id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );

    try {
      const updated = await markNotificationAsRead(notificationId);
      setNotifications((current) => mergeNotifications(current, [updated]));
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update notification');
      loadNotifications();
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    reload: loadNotifications
  };
}
