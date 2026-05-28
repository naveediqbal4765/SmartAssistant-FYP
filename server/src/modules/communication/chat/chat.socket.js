const chatService = require('./chat.service');
const { emitNewMessage, emitToUser } = require('../sockets/socket.manager');

const registerChatSocketHandlers = (io, socket) => {
  socket.on('chat:send', async (data = {}, callback) => {
    try {
      const chatMessage = await chatService.sendMessage({
        ...data,
        senderId: socket.userId || data.senderId
      });

      emitNewMessage(chatMessage);

      if (typeof callback === 'function') {
        callback({ success: true, message: chatMessage });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, msg: err.status ? err.message : 'Failed to send message' });
      }
    }
  });

  const emitTypingEvent = (event, data = {}) => {
    const toUserId = data.toUserId || data.receiverId;
    if (!toUserId || String(toUserId) === String(socket.userId)) return;

    emitToUser(toUserId, event, {
      fromUserId: socket.userId,
      fromName: socket.user?.name || 'Someone',
      toUserId,
      conversationId: data.conversationId || ''
    });
  };

  socket.on('typing:start', (data = {}) => emitTypingEvent('typing:start', data));
  socket.on('typing:stop', (data = {}) => emitTypingEvent('typing:stop', data));

  socket.on('message:delivered', async (payload = {}, callback) => {
    try {
      const messages = await chatService.markMessagesDelivered({
        userId: socket.userId,
        messageIds: payload.messageIds || (payload.messageId ? [payload.messageId] : [])
      });

      messages.forEach((message) => {
        emitToUser(message.senderId, 'message:delivered', {
          messageId: String(message._id),
          status: message.status,
          deliveredAt: message.deliveredAt
        });
      });
      callback?.({ success: true });
    } catch (err) {
      callback?.({ success: false, msg: 'Failed to mark messages delivered' });
    }
  });

  socket.on('message:seen', async (payload = {}, callback) => {
    try {
      const messages = await chatService.markMessagesSeen({
        userId: socket.userId,
        otherUserId: payload.otherUserId,
        messageIds: payload.messageIds || []
      });

      messages.forEach((message) => {
        emitToUser(message.senderId, 'message:seen', {
          messageId: String(message._id),
          status: message.status,
          deliveredAt: message.deliveredAt,
          seenAt: message.seenAt
        });
      });
      callback?.({ success: true });
    } catch (err) {
      callback?.({ success: false, msg: 'Failed to mark messages seen' });
    }
  });
};

module.exports = { registerChatSocketHandlers };
