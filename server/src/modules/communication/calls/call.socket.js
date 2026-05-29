const callService = require('./call.service');
const chatService = require('../chat/chat.service');
const { emitToUser } = require('../sockets/socket.manager');

const activePrivateCalls = new Map();
const savedPrivateCallLogs = new Set();

const getCallSessionKey = (userId, peerId) => [toId(userId), toId(peerId)].sort().join(':');
const toId = (value) => String(value?._id || value || '');
const createCallId = (userId, peerId) => `${getCallSessionKey(userId, peerId)}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

const emitCallError = (socket, message) => {
  socket.emit('call-error', { message });
};

const formatDuration = (seconds = 0) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const secondsPart = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`;
};

const getCallLabel = (callType = 'audio') => `${callType === 'video' ? 'Video' : 'Audio'} call`;
const getCallTitleLabel = (callType = 'audio') => `${callType === 'video' ? 'Video' : 'Audio'} Call`;

const emitCallLog = async ({ senderId, receiverId, message, duration = null, deletedFor = [] }) => {
  const chatMessage = await chatService.sendMessage({
    senderId,
    receiverId,
    message,
    messageType: 'call',
    duration,
    deletedFor
  });

  if (!deletedFor.some((userId) => toId(userId) === toId(senderId))) {
    emitToUser(senderId, 'newMessage', chatMessage);
  }
  if (!deletedFor.some((userId) => toId(userId) === toId(receiverId))) {
    emitToUser(receiverId, 'newMessage', chatMessage);
  }
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
      activePrivateCalls.set(getCallSessionKey(socket.userId, toUserId), {
        callId: createCallId(socket.userId, toUserId),
        callType,
        callerId: socket.userId,
        receiverId: toUserId,
        accepted: false,
        logSaved: false
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
      const session = activePrivateCalls.get(getCallSessionKey(socket.userId, toUserId));
      if (session) {
        session.accepted = true;
        session.callType = payload.callType || session.callType || 'audio';
      }

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
    const sessionKey = getCallSessionKey(socket.userId, toUserId);
    const session = activePrivateCalls.get(sessionKey);
    const callLogKey = session?.callId || createCallId(socket.userId, toUserId);
    const resolvedCallType = session?.callType || callType;
    const duration = session?.accepted ? durationSeconds : 0;
    const callerId = session?.callerId || socket.userId;
    const receiverId = session?.receiverId || toUserId;

    try {
      await callService.assertCanCall(socket.userId, toUserId);
      if (!savedPrivateCallLogs.has(callLogKey) && !session?.logSaved) {
        savedPrivateCallLogs.add(callLogKey);
        if (session) session.logSaved = true;
        if (duration) {
          await emitCallLog({
            senderId: callerId,
            receiverId,
            message: `${getCallLabel(resolvedCallType)} — ${formatDuration(duration)}`,
            duration
          });
        } else {
          await Promise.all([
            emitCallLog({
              senderId: callerId,
              receiverId,
              message: getCallTitleLabel(resolvedCallType),
              deletedFor: [receiverId]
            }),
            emitCallLog({
              senderId: callerId,
              receiverId,
              message: `Missed ${getCallTitleLabel(resolvedCallType)}`,
              deletedFor: [callerId]
            })
          ]);
        }
      }
    } catch (err) {
      emitCallError(socket, err.status ? err.message : 'Failed to save call log');
    }

    activePrivateCalls.delete(sessionKey);

    emitToUser(toUserId, 'end-call', {
      fromUserId: socket.userId
    });
  });
};

module.exports = { registerCallSocketHandlers };
