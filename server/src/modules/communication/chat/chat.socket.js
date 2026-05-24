const chatService = require('./chat.service');

const registerChatSocketHandlers = (io, socket) => {
  socket.on('chat:send', async (data = {}, callback) => {
    try {
      const chatMessage = await chatService.sendMessage(data);

      io.to(String(chatMessage.receiverId)).emit('chat:receive', chatMessage);
      socket.emit('chat:receive', chatMessage);

      if (typeof callback === 'function') {
        callback({ success: true, message: chatMessage });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, msg: 'Failed to send message' });
      }
    }
  });
};

module.exports = { registerChatSocketHandlers };
