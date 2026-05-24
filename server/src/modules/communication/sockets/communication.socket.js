const { registerChatSocketHandlers } = require('../chat/chat.socket');
const { registerCallSocketHandlers } = require('../calls/call.socket');
const { registerGroupSocketHandlers } = require('../groups/group.socket');
const { registerUploadSocketHandlers } = require('../uploads/upload.socket');
const { authenticateSocket } = require('./socket.auth');
const { userRoom } = require('./socket.manager');

const registerCommunicationSocketHandlers = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    if (socket.userId) {
      socket.join(userRoom(socket.userId));
    }

    registerChatSocketHandlers(io, socket);
    registerCallSocketHandlers(io, socket);
    registerGroupSocketHandlers(io, socket);
    registerUploadSocketHandlers(io, socket);
  });
};

module.exports = { registerCommunicationSocketHandlers };
