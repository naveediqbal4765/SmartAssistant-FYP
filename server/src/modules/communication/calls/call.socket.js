const callService = require('./call.service');
const chatService = require('../chat/chat.service');
const { emitToUser } = require('../sockets/socket.manager');

const emitCallError = (socket, message) => {
  socket.emit('call-error', { message });
};

const formatDuration = (seconds = 0) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes && remainingSeconds) return `${minutes}m ${remainingSeconds}s`;
  if (minutes) return `${minutes}m`;
  return `${remainingSeconds}s`;
};

const emitCallLog = async ({ senderId, receiverId, message, callType = 'audio', duration = null }) => {
  const chatMessage = await chatService.sendMessage({
    senderId,
    receiverId,
    message,
    messageType: 'call',
    duration
  });

  emitToUser(senderId, 'newMessage', chatMessage);
  emitToUser(receiverId, 'newMessage', chatMessage);
  return chatMessage;
};

const registerCallSocketHandlers = (io, socket) => {
  socket.on('call-user', async (payload = {}) => {
    try {
      const { toUserId, offer, callType = 'audio' } = payload;
      if (!toUserId || !offer) {
        return emitCallError(socket, 'Call target and offer are required');
      }

      const { caller } = await callService.assertCanCall(socket.userId, toUserId);

      await emitCallLog({
        senderId: socket.userId,
        receiverId: toUserId,
        message: callType === 'video' ? 'Video call started' : 'Audio call started',
        callType
      });

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

      await emitCallLog({
        senderId: socket.userId,
        receiverId: toUserId,
        message: 'Call accepted',
        callType: payload.callType || 'audio'
      });

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

  socket.on('end-call', async (payload = {}) => {
    const { toUserId, callType = 'audio', durationSeconds = 0 } = payload;
    if (!toUserId) return;

    try {
      await callService.assertCanCall(socket.userId, toUserId);
      await emitCallLog({
        senderId: socket.userId,
        receiverId: toUserId,
        message: `Call ended${durationSeconds ? ` (${formatDuration(durationSeconds)})` : ''}`,
        callType,
        duration: durationSeconds || null
      });
    } catch (err) {
      emitCallError(socket, err.status ? err.message : 'Failed to save call log');
    }

    emitToUser(toUserId, 'end-call', {
      fromUserId: socket.userId
    });
  });
};

module.exports = { registerCallSocketHandlers };
