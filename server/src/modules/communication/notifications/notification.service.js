const Notification = require('./notification.model');
const { emitNotification } = require('../sockets/socket.manager');

const createNotification = async (payload = {}) => {
  const { userId, type, title, message } = payload;

  if (!userId || !type || !title || !message) {
    return null;
  }

  if (type === 'chat_message' && !payload.conversationId) {
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
  deleteNotification,
  deleteNotificationsForUser
};
