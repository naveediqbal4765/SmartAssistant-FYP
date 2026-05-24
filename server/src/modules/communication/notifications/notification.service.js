const Notification = require('./notification.model');
const { emitNotification } = require('../sockets/socket.manager');

const createNotification = async ({ userId, type, title, message }) => {
  if (!userId || !type || !title || !message) {
    return null;
  }

  const notification = await Notification.create({
    userId,
    type,
    title,
    message
  });

  emitNotification(userId, notification);
  return notification;
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

module.exports = {
  createNotification,
  getNotifications,
  markAsRead
};
