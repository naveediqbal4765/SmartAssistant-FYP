const chatService = require('./chat.service');
const { emitNewMessage } = require('../sockets/socket.manager');

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
};

module.exports = { registerChatSocketHandlers };
