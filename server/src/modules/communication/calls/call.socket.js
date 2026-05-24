const callService = require('./call.service');
const { emitToUser } = require('../sockets/socket.manager');

const emitCallError = (socket, message) => {
  socket.emit('call-error', { message });
};

const registerCallSocketHandlers = (io, socket) => {
  socket.on('call-user', async (payload = {}) => {
    try {
      const { toUserId, offer, callType = 'audio' } = payload;
      if (!toUserId || !offer) {
        return emitCallError(socket, 'Call target and offer are required');
      }

      const { caller } = await callService.assertCanCall(socket.userId, toUserId);

      emitToUser(toUserId, 'call-user', {
        fromUserId: socket.userId,
        fromName: caller.name,
        callType,
        offer
      });
    } catch (err) {
      emitCallError(socket, err.status ? err.message : 'Failed to start call');
    }
  });

  socket.on('call-accepted', async (payload = {}) => {
    try {
      const { toUserId, answer } = payload;
      if (!toUserId || !answer) {
        return emitCallError(socket, 'Call answer and target are required');
      }

      await callService.assertCanCall(socket.userId, toUserId);

      emitToUser(toUserId, 'call-accepted', {
        fromUserId: socket.userId,
        answer
      });
    } catch (err) {
      emitCallError(socket, err.status ? err.message : 'Failed to accept call');
    }
  });

  socket.on('ice-candidate', async (payload = {}) => {
    try {
      const { toUserId, candidate } = payload;
      if (!toUserId || !candidate) return;

      await callService.assertCanCall(socket.userId, toUserId);

      emitToUser(toUserId, 'ice-candidate', {
        fromUserId: socket.userId,
        candidate
      });
    } catch (err) {
      emitCallError(socket, err.status ? err.message : 'Failed to send ICE candidate');
    }
  });

  socket.on('end-call', (payload = {}) => {
    const { toUserId } = payload;
    if (!toUserId) return;

    emitToUser(toUserId, 'end-call', {
      fromUserId: socket.userId
    });
  });
};

module.exports = { registerCallSocketHandlers };
