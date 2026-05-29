import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { markNotificationAsConsumed } from './notificationConsumption';

const textIncludes = (notification, value) => {
  const haystack = `${notification.title || ''} ${notification.message || ''} ${notification.entityType || ''}`.toLowerCase();
  return haystack.includes(value);
};

const getRouteContext = (pathname = '') => {
  if (pathname.startsWith('/chat/')) {
    return { kind: 'chat', conversationId: pathname.split('/')[2] };
  }

  if (pathname.startsWith('/groups/')) {
    return { kind: 'group', groupId: pathname.split('/')[2] };
  }

  if (pathname.startsWith('/task-requests')) return { kind: 'tasks' };
  if (pathname.startsWith('/health/medications')) return { kind: 'medications' };
  if (pathname.startsWith('/health/appointments')) return { kind: 'appointments' };
  if (pathname.startsWith('/health/vault')) return { kind: 'vault' };
  if (pathname.startsWith('/calls')) return { kind: 'calls' };
  if (pathname.startsWith('/profile')) return { kind: 'profile' };
  return { kind: 'other' };
};

const matchesRoute = (notification, routeContext) => {
  if (!notification || notification.isRead) return false;

  if (routeContext.kind === 'chat') {
    return notification.type === 'chat_message'
      && String(notification.conversationId || '') === String(routeContext.conversationId || '');
  }

  if (routeContext.kind === 'group') {
    return notification.type === 'group_message'
      && String(notification.groupId || '') === String(routeContext.groupId || '');
  }

  if (routeContext.kind === 'tasks') {
    return notification.type === 'task'
      || notification.taskId
      || notification.entityType === 'task'
      || notification.alertType === 'TASK';
  }

  if (routeContext.kind === 'medications') {
    return textIncludes(notification, 'medication') || textIncludes(notification, 'medicine');
  }

  if (routeContext.kind === 'appointments') {
    return textIncludes(notification, 'appointment');
  }

  if (routeContext.kind === 'vault') {
    return textIncludes(notification, 'vault') || textIncludes(notification, 'document');
  }

  if (routeContext.kind === 'calls') {
    return Boolean(notification.callSessionId) || textIncludes(notification, 'call');
  }

  if (routeContext.kind === 'profile') {
    return textIncludes(notification, 'caregiver')
      || textIncludes(notification, 'profile')
      || textIncludes(notification, 'contact')
      || textIncludes(notification, 'link');
  }

  return false;
};

const buildConsumeContext = (notification) => ({
  conversationId: notification.conversationId,
  groupId: notification.groupId,
  messageId: notification.messageId,
  taskId: notification.taskId,
  callSessionId: notification.callSessionId,
  emergencyId: notification.emergencyId,
  entityType: notification.entityType,
  entityId: notification.entityId || notification.messageId || notification.taskId
});

export default function AutoNotificationConsumer({ notificationState }) {
  const location = useLocation();
  const consumedIdsRef = useRef(new Set());
  const routeContext = getRouteContext(location.pathname);

  useEffect(() => {
    const visibleNotifications = (notificationState.notifications || [])
      .filter((notification) => matchesRoute(notification, routeContext))
      .filter((notification) => !consumedIdsRef.current.has(String(notification._id)));

    visibleNotifications.forEach((notification) => {
      consumedIdsRef.current.add(String(notification._id));
      notificationState.markRead(notification._id);
      markNotificationAsConsumed(buildConsumeContext(notification)).catch(() => {});
    });
  }, [location.pathname, notificationState.notifications, routeContext.kind]);

  return null;
}
