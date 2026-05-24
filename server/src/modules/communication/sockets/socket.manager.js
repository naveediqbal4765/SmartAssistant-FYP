let ioInstance = null;

const userRoom = (userId) => `user:${userId}`;

const setSocketServer = (io) => {
  ioInstance = io;
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(userRoom(userId)).emit(event, payload);
};

const emitNewMessage = (message) => {
  emitToUser(String(message.receiverId), 'newMessage', message);
};

const emitNotification = (userId, notification) => {
  emitToUser(String(userId), 'newNotification', {
    _id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt
  });
};

module.exports = {
  userRoom,
  setSocketServer,
  emitToUser,
  emitNewMessage,
  emitNotification
};
