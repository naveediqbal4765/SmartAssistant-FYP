const Notification = require('./notification.model');
const { emitNotification } = require('../sockets/socket.manager');

const CONTEXT_FIELDS = [
  'conversationId',
  'groupId',
  'messageId',
  'taskId',
  'callSessionId',
  'emergencyId',
  'entityId'
];

const createNotification = async (payload = {}) => {
  const { userId, type, title, message } = payload;

  if (!userId || !type || !title || !message) {
    return null;
  }

  if (type === 'chat_message' && !payload.conversationId) {
    return null;
  }

  if (type === 'group_message' && !payload.groupId) {
    return null;
  }

  const notification = await Notification.create(payload);
  const notificationPayload = {
    ...notification.toObject(),
    ...payload
  };

  emitNotification(userId, notificationPayload);
  return notificationPayload;
};

const getNotifications = async (userId) => {
  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50);
};

const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true }
  );
};

const buildConsumeQuery = (userId, context = {}) => {
  const orConditions = [];

  CONTEXT_FIELDS.forEach((field) => {
    if (context[field]) {
      orConditions.push({ [field]: context[field] });
    }
  });

  if (context.entityType && context.entityId) {
    orConditions.push({
      entityType: context.entityType,
      entityId: context.entityId
    });
  }

  if (context.type && context.entityId) {
    orConditions.push({
      type: context.type,
      entityId: context.entityId
    });
  }

  if (!orConditions.length) {
    return null;
  }

  return {
    userId,
    isRead: false,
    $or: orConditions
  };
};

const markAsConsumed = async (userId, context = {}) => {
  const query = buildConsumeQuery(userId, context);
  if (!query) {
    return [];
  }

  const notifications = await Notification.find(query).select('_id');
  if (!notifications.length) {
    return [];
  }

  const notificationIds = notifications.map((notification) => notification._id);
  await Notification.updateMany(
    { _id: { $in: notificationIds }, userId },
    { $set: { isRead: true } }
  );

  return notificationIds;
};

const deleteNotification = async (notificationId, userId) => {
  return Notification.findOneAndDelete({ _id: notificationId, userId });
};

const deleteNotificationsForUser = async (userId) => {
  return Notification.deleteMany({ userId });
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAsConsumed,
  deleteNotification,
  deleteNotificationsForUser
};
