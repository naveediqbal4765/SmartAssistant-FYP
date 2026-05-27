const groupService = require('./group.service');
const { GroupMessage } = require('./group.model');
const notificationService = require('../notifications/notification.service');
const { userRoom } = require('../sockets/socket.manager');

const groupRoom = (groupId) => `group:${groupId}`;

const toId = (value) => String(value?._id || value || '');

const buildMessagePreview = (message) => {
  const preview = message.messageType === 'voice'
    ? 'Voice note'
    : (message.message || 'Sent an attachment');
  return preview.length > 80 ? `${preview.slice(0, 77)}...` : preview;
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
      callback?.({ success: true });
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
};

module.exports = {
  groupRoom,
  registerGroupSocketHandlers
};
