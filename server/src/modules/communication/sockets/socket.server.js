const { Server } = require('socket.io');
const { registerCommunicationSocketHandlers } = require('./communication.socket');
const { setSocketServer } = require('./socket.manager');

const initializeCommunicationSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true
    }
  });

  setSocketServer(io);
  registerCommunicationSocketHandlers(io);

  return io;
};

module.exports = { initializeCommunicationSockets };
