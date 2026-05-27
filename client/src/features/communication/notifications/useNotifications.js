import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getChatSocket } from '../chat/services/socket';
import { playNotificationSound } from '../audio/audioFeedback';
import {
  clearAllNotifications,
  deleteNotificationById,
  fetchNotifications,
  markNotificationAsRead
} from './notificationApi';
import { NOTIFICATION_CONSUMED_EVENT } from './notificationConsumption';

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

const contextMatchesNotification = (notification, context = {}) => {
  const fields = ['conversationId', 'groupId', 'messageId', 'taskId', 'callSessionId', 'emergencyId', 'entityId'];
  return fields.some((field) => (
    context[field] && String(notification?.[field] || '') === String(context[field])
  )) || (
    context.entityType &&
    context.entityId &&
    notification?.entityType === context.entityType &&
    String(notification?.entityId || '') === String(context.entityId)
  );
};

const isReminderNotification = (notification) => (
  notification?.type === 'system' && notification?.entityType === 'call_reminder'
);

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [reminderPopups, setReminderPopups] = useState([]);
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
      const visibleNotifications = data.filter(
        (notification) => !deletedNotificationIdsRef.current.has(String(notification._id))
      );
      setNotifications(visibleNotifications);
      setReminderPopups(visibleNotifications.filter((notification) => (
        isReminderNotification(notification) && !notification.isRead
      )));
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
      if (isReminderNotification(notification)) {
        setReminderPopups((current) => mergeNotifications(current, [notification]));
        return;
      }
      playNotificationSound();
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, []);

  useEffect(() => {
    const handleConsumed = (event) => {
      const notificationIds = new Set((event.detail?.notificationIds || []).map(String));
      const context = event.detail?.context || {};

      setNotifications((current) => current.map((notification) => (
        notificationIds.has(String(notification._id)) || contextMatchesNotification(notification, context)
          ? { ...notification, isRead: true }
          : notification
      )));
    };

    window.addEventListener(NOTIFICATION_CONSUMED_EVENT, handleConsumed);
    return () => {
      window.removeEventListener(NOTIFICATION_CONSUMED_EVENT, handleConsumed);
    };
  }, []);

  const markRead = async (notificationId) => {
    setReminderPopups((current) => current.filter((notification) => notification._id !== notificationId));
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
    reminderPopups,
    unreadCount,
    loading,
    error,
    markRead,
    deleteNotification,
    clearNotifications,
    reload: loadNotifications
  };
}
