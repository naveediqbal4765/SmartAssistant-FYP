const groupService = require('./group.service');

const groupRoom = (groupId) => `group:${groupId}`;

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
      io.to(groupRoom(payload.groupId)).emit('group-message', message);
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
