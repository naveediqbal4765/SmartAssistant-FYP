const groupService = require('./group.service');
const { Group, GroupMessage } = require('./group.model');
const notificationService = require('../notifications/notification.service');
const { emitToUser, userRoom } = require('../sockets/socket.manager');

const groupRoom = (groupId) => `group:${groupId}`;
const groupCallRoom = (groupId) => `group-call:${groupId}`;
const activeGroupCalls = new Map();

const toId = (value) => String(value?._id || value || '');

const buildMessagePreview = (message) => {
  const preview = message.messageType === 'voice'
    ? 'Voice note'
    : (message.message || 'Sent an attachment');
  return preview.length > 80 ? `${preview.slice(0, 77)}...` : preview;
};

const getActiveGroupCall = (groupId) => activeGroupCalls.get(toId(groupId));

const ensureActiveGroupCall = ({ groupId, callType = 'audio', starter }) => {
  const normalizedGroupId = toId(groupId);
  const existing = activeGroupCalls.get(normalizedGroupId);
  if (existing) return existing;

  const call = {
    callId: `${normalizedGroupId}:${Date.now()}`,
    groupId: normalizedGroupId,
    callType,
    startedBy: toId(starter?._id || starter),
    startedByName: starter?.name || 'Member',
    startedAt: new Date().toISOString(),
    participants: new Map()
  };
  activeGroupCalls.set(normalizedGroupId, call);
  return call;
};

const serializeParticipant = (participant) => ({
  userId: participant.userId,
  name: participant.name || 'Member'
});

const serializeCall = (call) => ({
  callId: call.callId,
  groupId: call.groupId,
  callType: call.callType,
  startedBy: call.startedBy,
  startedByName: call.startedByName,
  startedAt: call.startedAt,
  participants: Array.from(call.participants.values()).map(serializeParticipant)
});

const addCallParticipant = (call, socket) => {
  const participant = {
    userId: socket.userId,
    name: socket.user?.name || 'Member'
  };
  call.participants.set(socket.userId, participant);
  return participant;
};

const getGroupMemberIds = async (groupId) => {
  const group = await Group.findById(groupId).select('members.userId name');
  return {
    groupName: group?.name || 'Group',
    memberIds: (group?.members || []).map((member) => toId(member.userId)).filter(Boolean)
  };
};

const emitGroupCallLog = async ({ io, groupId, user, message }) => {
  const groupMessage = await groupService.sendMessage(groupId, user, {
    message,
    messageType: 'call'
  });
  const group = groupMessage.$locals?.group;

  (group?.members || []).forEach((member) => {
    io.to(userRoom(toId(member.userId))).emit('group-message', groupMessage);
  });

  return groupMessage;
};

const removeCallParticipant = async ({ io, groupId, socket }) => {
  const call = getActiveGroupCall(groupId);
  if (!call || !call.participants.has(socket.userId)) return;

  call.participants.delete(socket.userId);
  socket.leave(groupCallRoom(groupId));
  io.to(groupCallRoom(groupId)).emit('group-call:user-left', {
    groupId: toId(groupId),
    userId: socket.userId
  });

  if (!call.participants.size) {
    activeGroupCalls.delete(toId(groupId));
    await emitGroupCallLog({
      io,
      groupId,
      user: socket.user,
      message: 'Group call ended'
    }).catch((err) => {
      console.error('Group call log failed:', err.message);
    });
    io.to(groupRoom(groupId)).emit('group-call:end', {
      groupId: toId(groupId)
    });
  }
};

const notifyGroupMembers = async ({ group, message, sender }) => {
  const mutedIds = new Set((group.mutedFor || []).map(toId));
  const originalMessage = message.repliedToMessageId
    ? await GroupMessage.findById(message.repliedToMessageId).select('senderId')
    : null;
  const senderName = sender.name || message.senderName || 'Member';

  await Promise.all((group.members || [])
    .filter((member) => toId(member.userId) !== toId(sender._id))
    .filter((member) => !mutedIds.has(toId(member.userId)))
    .map((member) => notificationService.createNotification({
      userId: toId(member.userId),
      type: 'group_message',
      title: originalMessage
        ? (
          toId(originalMessage.senderId) === toId(member.userId)
            ? `${senderName} replied to you in ${group.name}`
            : `${senderName} replied in ${group.name}`
        )
        : `${senderName} in ${group.name}`,
      message: buildMessagePreview(message),
      groupId: group._id,
      messageId: message._id,
      entityType: 'group_message',
      entityId: message._id,
      fromUserId: sender._id
    })));
};

const registerGroupSocketHandlers = (io, socket) => {
  socket.on('create-group', async (payload = {}, callback) => {
    try {
      const group = await groupService.createGroup(socket.user, payload);
      socket.join(groupRoom(group._id));
      callback?.({ success: true, group });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to create group' });
    }
  });

  socket.on('join-group-room', async ({ groupId } = {}, callback) => {
    try {
      await groupService.getMessages(groupId, socket.user);
      socket.join(groupRoom(groupId));
      callback?.({ success: true, activeCall: getActiveGroupCall(groupId) ? serializeCall(getActiveGroupCall(groupId)) : null });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to join group room' });
    }
  });

  socket.on('group-message', async (payload = {}, callback) => {
    try {
      const message = await groupService.sendMessage(payload.groupId, socket.user, payload);
      const group = message.$locals?.group;
      if (group) {
        (group.members || []).forEach((member) => {
          io.to(userRoom(toId(member.userId))).emit('group-message', message);
        });
        notifyGroupMembers({ group, message, sender: socket.user }).catch((notificationErr) => {
          console.error('Group notification failed:', notificationErr.message);
        });
      }
      callback?.({ success: true, message });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to send group message' });
    }
  });

  const emitGroupTypingEvent = (event, payload = {}) => {
    if (!payload.groupId) return;

    socket.to(groupRoom(payload.groupId)).emit(event, {
      fromUserId: socket.userId,
      fromName: socket.user?.name || 'Someone',
      groupId: payload.groupId,
      conversationId: payload.conversationId || payload.groupId
    });
  };

  socket.on('group:typing:start', (payload = {}) => emitGroupTypingEvent('group:typing:start', payload));
  socket.on('group:typing:stop', (payload = {}) => emitGroupTypingEvent('group:typing:stop', payload));

  socket.on('group-message:delivered', async (payload = {}, callback) => {
    try {
      const results = await groupService.markGroupMessagesDelivered({
        groupId: payload.groupId,
        userId: socket.userId,
        messageIds: payload.messageIds || (payload.messageId ? [payload.messageId] : [])
      });

      results.forEach((result) => {
        emitToUser(result.senderId, 'group-message:delivered', result);
      });
      callback?.({ success: true });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to mark group messages delivered' });
    }
  });

  socket.on('group-message:seen', async (payload = {}, callback) => {
    try {
      const results = await groupService.markGroupMessagesSeen({
        groupId: payload.groupId,
        userId: socket.userId,
        messageIds: payload.messageIds || (payload.messageId ? [payload.messageId] : [])
      });

      results.forEach((result) => {
        emitToUser(result.senderId, 'group-message:seen', result);
      });
      callback?.({ success: true });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to mark group messages seen' });
    }
  });

  socket.on('group-call:start', async (payload = {}, callback) => {
    try {
      const { groupId, callType = 'audio' } = payload;
      if (!groupId) {
        callback?.({ success: false, msg: 'groupId is required' });
        return;
      }

      await groupService.getMessages(groupId, socket.user);
      socket.join(groupRoom(groupId));
      socket.join(groupCallRoom(groupId));

      const call = ensureActiveGroupCall({ groupId, callType, starter: socket.user });
      addCallParticipant(call, socket);
      const serializedCall = serializeCall(call);
      const { groupName, memberIds } = await getGroupMemberIds(groupId);

      await emitGroupCallLog({
        io,
        groupId,
        user: socket.user,
        message: `Group ${callType === 'video' ? 'video' : 'audio'} call started by ${socket.user?.name || 'Member'}`
      });

      memberIds
        .filter((memberId) => memberId !== socket.userId)
        .forEach((memberId) => {
          emitToUser(memberId, 'group-call:invite', {
            ...serializedCall,
            groupName,
            fromUserId: socket.userId,
            fromName: socket.user?.name || 'Member'
          });
        });

      io.to(groupRoom(groupId)).emit('group-call:start', serializedCall);
      callback?.({ success: true, call: serializedCall });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to start group call' });
    }
  });

  const joinExistingGroupCall = async (payload = {}, callback) => {
    try {
      const { groupId } = payload;
      if (!groupId) {
        callback?.({ success: false, msg: 'groupId is required' });
        return;
      }

      await groupService.getMessages(groupId, socket.user);
      const call = getActiveGroupCall(groupId);
      if (!call) {
        callback?.({ success: false, msg: 'No active group call' });
        return;
      }

      const existingParticipants = Array.from(call.participants.values()).map(serializeParticipant);
      socket.join(groupCallRoom(groupId));
      const participant = addCallParticipant(call, socket);

      await emitGroupCallLog({
        io,
        groupId,
        user: socket.user,
        message: `Group call joined by ${socket.user?.name || 'Member'}`
      });

      socket.to(groupCallRoom(groupId)).emit('group-call:user-joined', {
        groupId: toId(groupId),
        participant: serializeParticipant(participant)
      });

      callback?.({
        success: true,
        call: serializeCall(call),
        participants: existingParticipants
      });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to join group call' });
    }
  };

  socket.on('group-call:join', joinExistingGroupCall);

  socket.on('group-call:join-existing', async (payload = {}, callback) => {
    await joinExistingGroupCall(payload, callback);
  });

  socket.on('group-call:accept', (payload = {}, callback) => {
    callback?.({ success: true, groupId: payload.groupId, callId: payload.callId });
  });

  socket.on('group-call:ignore', (payload = {}, callback) => {
    callback?.({ success: true, groupId: payload.groupId, callId: payload.callId });
  });

  socket.on('group-call:offer', (payload = {}) => {
    const { groupId, targetUserId, offer } = payload;
    if (!groupId || !targetUserId || !offer) return;

    emitToUser(targetUserId, 'group-call:offer', {
      groupId,
      fromUserId: socket.userId,
      fromName: socket.user?.name || 'Member',
      targetUserId,
      offer
    });
  });

  socket.on('group-call:answer', (payload = {}) => {
    const { groupId, targetUserId, answer } = payload;
    if (!groupId || !targetUserId || !answer) return;

    emitToUser(targetUserId, 'group-call:answer', {
      groupId,
      fromUserId: socket.userId,
      fromName: socket.user?.name || 'Member',
      targetUserId,
      answer
    });
  });

  socket.on('group-call:ice-candidate', (payload = {}) => {
    const { groupId, targetUserId, candidate } = payload;
    if (!groupId || !targetUserId || !candidate) return;

    emitToUser(targetUserId, 'group-call:ice-candidate', {
      groupId,
      fromUserId: socket.userId,
      targetUserId,
      candidate
    });
  });

  socket.on('group-call:user-left', (payload = {}) => {
    if (!payload.groupId) return;
    removeCallParticipant({ io, groupId: payload.groupId, socket });
  });

  socket.on('group-call:end', async (payload = {}) => {
    const { groupId } = payload;
    if (!groupId) return;

    const call = getActiveGroupCall(groupId);
    if (!call) return;

    activeGroupCalls.delete(toId(groupId));
    await emitGroupCallLog({
      io,
      groupId,
      user: socket.user,
      message: 'Group call ended'
    }).catch((err) => {
      console.error('Group call log failed:', err.message);
    });
    io.to(groupCallRoom(groupId)).emit('group-call:end', { groupId: toId(groupId) });
    io.to(groupRoom(groupId)).emit('group-call:end', { groupId: toId(groupId) });
  });

  socket.on('join-group-request', async (payload = {}, callback) => {
    try {
      const request = await groupService.requestToJoin(payload.groupId, socket.user);
      callback?.({ success: true, request });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to request group join' });
    }
  });

  socket.on('approve-group-request', async (payload = {}, callback) => {
    try {
      const request = await groupService.updateRequest(payload.requestId, socket.user, 'approved');
      callback?.({ success: true, request });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to approve request' });
    }
  });

  socket.on('reject-group-request', async (payload = {}, callback) => {
    try {
      const request = await groupService.updateRequest(payload.requestId, socket.user, 'rejected');
      callback?.({ success: true, request });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to reject request' });
    }
  });

  socket.on('add-group-member', async (payload = {}, callback) => {
    try {
      const group = await groupService.directAddMember(payload.groupId, payload.userId, socket.user);
      callback?.({ success: true, group });
    } catch (err) {
      callback?.({ success: false, msg: err.message || 'Failed to add group member' });
    }
  });

  socket.on('disconnect', () => {
    Array.from(activeGroupCalls.keys()).forEach((groupId) => {
      removeCallParticipant({ io, groupId, socket });
    });
  });
};

module.exports = {
  groupRoom,
  registerGroupSocketHandlers
};
