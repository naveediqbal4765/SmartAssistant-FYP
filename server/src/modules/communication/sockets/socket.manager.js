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

const emitMessageDeleted = ({ userId, messageId, chatType }) => {
  emitToUser(String(userId), 'message-deleted', {
    messageId: String(messageId),
    userId: String(userId),
    chatType
  });
};

const emitConversationDeleted = ({ userId, conversationId, chatType }) => {
  emitToUser(String(userId), 'conversation-deleted', {
    conversationId: String(conversationId),
    userId: String(userId),
    chatType
  });
};

module.exports = {
  userRoom,
  setSocketServer,
  emitToUser,
  emitNewMessage,
  emitNotification,
  emitMessageDeleted,
  emitConversationDeleted
};
