const { registerChatSocketHandlers } = require('../chat/chat.socket');
const { registerCallSocketHandlers } = require('../calls/call.socket');
const { registerUploadSocketHandlers } = require('../uploads/upload.socket');

// Placeholder Socket.io module entry point for future communication events.
const registerCommunicationSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    registerChatSocketHandlers(io, socket);
    registerCallSocketHandlers(io, socket);
    registerUploadSocketHandlers(io, socket);
  });
};

module.exports = { registerCommunicationSocketHandlers };
