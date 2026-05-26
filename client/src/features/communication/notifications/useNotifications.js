import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getChatSocket } from '../chat/services/socket';
import {
  clearAllNotifications,
  deleteNotificationById,
  fetchNotifications,
  markNotificationAsRead
} from './notificationApi';

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
  const deletedNotificationIdsRef = useRef(new Set());

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchNotifications();
      setNotifications(data.filter(
        (notification) => !deletedNotificationIdsRef.current.has(String(notification._id))
      ));
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
      if (deletedNotificationIdsRef.current.has(String(notification?._id))) {
        return;
      }

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

  const deleteNotification = useCallback(async (notificationId) => {
    const id = String(notificationId);
    let previousNotifications = [];

    deletedNotificationIdsRef.current.add(id);
    setError('');
    setNotifications((current) => {
      previousNotifications = current;
      return current.filter((notification) => String(notification._id) !== id);
    });

    try {
      await deleteNotificationById(notificationId);
    } catch (err) {
      deletedNotificationIdsRef.current.delete(id);
      setNotifications(previousNotifications);
      setError(err.response?.data?.msg || 'Failed to delete notification');
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    let previousNotifications = [];

    setError('');
    setNotifications((current) => {
      previousNotifications = current;
      current.forEach((notification) => {
        deletedNotificationIdsRef.current.add(String(notification._id));
      });
      return [];
    });

    try {
      await clearAllNotifications();
    } catch (err) {
      previousNotifications.forEach((notification) => {
        deletedNotificationIdsRef.current.delete(String(notification._id));
      });
      setNotifications(previousNotifications);
      setError(err.response?.data?.msg || 'Failed to clear notifications');
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    deleteNotification,
    clearNotifications,
    reload: loadNotifications
  };
}
