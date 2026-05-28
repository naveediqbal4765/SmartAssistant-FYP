const { registerChatSocketHandlers } = require('../chat/chat.socket');
const { registerCallSocketHandlers } = require('../calls/call.socket');
const { registerGroupSocketHandlers } = require('../groups/group.socket');
const { registerUploadSocketHandlers } = require('../uploads/upload.socket');
const { authenticateSocket } = require('./socket.auth');
const User = require('../../../shared/models/User');
const { setUserOffline, setUserOnline, userRoom } = require('./socket.manager');

const registerCommunicationSocketHandlers = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    if (socket.userId) {
      socket.join(userRoom(socket.userId));
      setUserOnline(socket.userId, socket.id);
      User.findByIdAndUpdate(socket.userId, { isOnline: true }).catch(() => {});
      socket.broadcast.emit('user:online', { userId: socket.userId });
    }

    registerChatSocketHandlers(io, socket);
    registerCallSocketHandlers(io, socket);
    registerGroupSocketHandlers(io, socket);
    registerUploadSocketHandlers(io, socket);

    socket.on('user:presence:inactive', () => {
      if (!socket.userId) return;
      const lastSeenAt = new Date();
      User.findByIdAndUpdate(socket.userId, { lastSeenAt }).catch(() => {});
      socket.broadcast.emit('user:offline', { userId: socket.userId, lastSeenAt });
    });

    socket.on('user:presence:active', () => {
      if (!socket.userId) return;
      User.findByIdAndUpdate(socket.userId, { isOnline: true }).catch(() => {});
      socket.broadcast.emit('user:online', { userId: socket.userId });
    });

    socket.on('disconnect', () => {
      if (!socket.userId) return;
      const fullyOffline = setUserOffline(socket.userId, socket.id);
      if (!fullyOffline) return;
      const lastSeenAt = new Date();
      User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeenAt }).catch(() => {});
      socket.broadcast.emit('user:offline', { userId: socket.userId, lastSeenAt });
    });
  });
};

module.exports = { registerCommunicationSocketHandlers };
