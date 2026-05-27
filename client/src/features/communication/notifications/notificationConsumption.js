import { markNotificationsConsumed } from './notificationApi';

export const NOTIFICATION_CONSUMED_EVENT = 'notifications:consumed';

export const markNotificationAsConsumed = async (context = {}) => {
  if (!context || !Object.values(context).some(Boolean)) {
    return { notificationIds: [], consumedCount: 0 };
  }

  const result = await markNotificationsConsumed(context);
  window.dispatchEvent(new CustomEvent(NOTIFICATION_CONSUMED_EVENT, {
    detail: {
      context,
      notificationIds: result.notificationIds || []
    }
  }));
  return result;
};
