const groupService = require('./group.service');
const { GroupMessage } = require('./group.model');
const { emitConversationDeleted, emitGroupItemReactionUpdated, emitGroupUpdated, emitMessageDeleted, emitToUser } = require('../sockets/socket.manager');
const notificationService = require('../notifications/notification.service');
const mongoose = require('mongoose');

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

const handleError = (res, err, label) => {
  console.error(label, err);
  return res.status(err.status || 500).json({
    success: false,
    msg: err.status ? err.message : 'Server error',
    error: err.status ? err.message : 'Unexpected group module failure'
  });
};

const createGroup = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        msg: 'Unauthorized request',
        error: 'Unauthorized request'
      });
    }

    const group = await groupService.createGroup(req.user, req.body);
    return res.status(201).json({ success: true, group });
  } catch (err) {
    return handleError(res, err, 'Create group error:');
  }
};

const getMyGroups = async (req, res) => {
  try {
    const groups = await groupService.getMyGroups(req.user._id);
    return res.json({ success: true, groups });
  } catch (err) {
    return handleError(res, err, 'Fetch groups error:');
  }
};

const discoverGroups = async (req, res) => {
  try {
    const groups = await groupService.discoverGroups(req.user);
    return res.json({ success: true, groups });
  } catch (err) {
    return handleError(res, err, 'Discover groups error:');
  }
};

const getMessages = async (req, res) => {
  try {
    const messages = await groupService.getMessages(req.params.groupId, req.user);
    return res.json({ success: true, messages });
  } catch (err) {
    return handleError(res, err, 'Fetch group messages error:');
  }
};

const updateGroup = async (req, res) => {
  try {
    const group = await groupService.updateGroupDetails(req.params.groupId, req.user, req.body || {});
    emitGroupUpdated({ group });
    return res.json({ success: true, group });
  } catch (err) {
    return handleError(res, err, 'Update group settings error:');
  }
};

const sendMessage = async (req, res) => {
  try {
    const message = await groupService.sendMessage(req.params.groupId, req.user, req.body);
    const group = message.$locals?.group;
    if (group) {
      (group.members || []).forEach((member) => {
        emitToUser(toId(member.userId), 'group-message', message);
      });
      notifyGroupMembers({ group, message, sender: req.user }).catch((notificationErr) => {
        console.error('Group notification failed:', notificationErr.message);
      });
    }
    return res.status(201).json({ success: true, message });
  } catch (err) {
    return handleError(res, err, 'Send group message error:');
  }
};

const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const deleteType = req.body?.deleteType || 'forEveryone';

    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: 'Unauthorized delete request' });
    }

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, msg: 'Valid message id is required' });
    }

    const { group, deleteType: resolvedDeleteType } = await groupService.deleteMessageForUser(messageId, req.user, deleteType);

    if (resolvedDeleteType === 'forEveryone') {
      (group.members || []).forEach((member) => {
        emitMessageDeleted({
          userId: member.userId?._id || member.userId,
          messageId,
          chatType: 'group',
          deleteType: resolvedDeleteType
        });
      });
    } else {
      emitMessageDeleted({
        userId: req.user._id,
        messageId,
        chatType: 'group',
        deleteType: resolvedDeleteType
      });
    }

    return res.json({ success: true, msg: 'Message deleted successfully', messageId, deleteType: resolvedDeleteType });
  } catch (err) {
    return handleError(res, err, 'Delete group message error:');
  }
};

const reactToMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { reactionType } = req.body;

    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: 'Unauthorized reaction request' });
    }

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, msg: 'Valid message id is required' });
    }

    const { message, group } = await groupService.applyGroupMessageReaction({
      messageId,
      userId: req.user._id,
      reactionType
    });

    emitGroupItemReactionUpdated({ group, message, updatedBy: req.user._id });

    return res.json({ success: true, message });
  } catch (err) {
    return handleError(res, err, 'React to group message error:');
  }
};

const requestToJoin = async (req, res) => {
  try {
    const request = await groupService.requestToJoin(req.params.groupId, req.user);
    const group = request.$locals?.group;
    if (group) {
      (group.members || [])
        .filter((member) => member.role === 'admin')
        .forEach((member) => {
          const adminId = toId(member.userId);
          notificationService.createNotification({
            userId: adminId,
            type: 'system',
            title: `New join request for ${group.name}`,
            message: `${req.user.name || 'A user'} requested to join ${group.name}.`,
            groupId: group._id,
            entityType: 'group_request',
            entityId: request._id,
            fromUserId: req.user._id
          }).catch((notificationErr) => {
            console.error('Group request notification failed:', notificationErr.message);
          });
          emitToUser(adminId, 'group-request-updated', {
            groupId: String(group._id),
            request,
            status: 'pending'
          });
        });
    }
    return res.status(201).json({ success: true, request });
  } catch (err) {
    return handleError(res, err, 'Group join request error:');
  }
};

const cancelJoinRequest = async (req, res) => {
  try {
    const request = await groupService.cancelJoinRequest(req.params.groupId, req.user);
    const group = request.$locals?.group;

    if (group) {
      (group.members || [])
        .filter((member) => member.role === 'admin')
        .forEach((member) => {
          emitToUser(toId(member.userId), 'group-request-updated', {
            groupId: String(group._id),
            requestId: String(request._id),
            status: 'cancelled'
          });
        });
    }

    emitToUser(req.user._id, 'group-request-updated', {
      groupId: String(req.params.groupId),
      requestId: String(request._id),
      status: 'cancelled'
    });

    return res.json({ success: true, requestId: String(request._id), groupId: req.params.groupId });
  } catch (err) {
    return handleError(res, err, 'Cancel group join request error:');
  }
};

const getRequests = async (req, res) => {
  try {
    const requests = await groupService.getRequests(req.params.groupId, req.user);
    return res.json({ success: true, requests });
  } catch (err) {
    return handleError(res, err, 'Fetch group requests error:');
  }
};

const approveRequest = async (req, res) => {
  try {
    const request = await groupService.updateRequest(req.params.requestId, req.user, 'approved');
    await notificationService.createNotification({
      userId: request.userId?._id || request.userId,
      type: 'system',
      title: 'Group request accepted',
      message: 'Your group join request was accepted.',
      groupId: request.groupId,
      entityType: 'group_request',
      entityId: request._id
    });
    const group = await groupService.getGroupForAdmin(request.groupId, req.user);
    emitGroupUpdated({ group });
    emitToUser(request.userId?._id || request.userId, 'group-request-updated', {
      groupId: String(request.groupId),
      requestId: String(request._id),
      status: 'approved',
      group
    });
    return res.json({ success: true, request });
  } catch (err) {
    return handleError(res, err, 'Approve group request error:');
  }
};

const rejectRequest = async (req, res) => {
  try {
    const request = await groupService.updateRequest(req.params.requestId, req.user, 'rejected');
    emitToUser(request.userId?._id || request.userId, 'group-request-updated', {
      groupId: String(request.groupId),
      requestId: String(request._id),
      status: 'rejected'
    });
    return res.json({ success: true, request });
  } catch (err) {
    return handleError(res, err, 'Reject group request error:');
  }
};

const addMember = async (req, res) => {
  try {
    const group = await groupService.directAddMember(req.body.groupId, req.body.userId, req.user);
    emitGroupUpdated({ group });
    return res.json({ success: true, group });
  } catch (err) {
    return handleError(res, err, 'Add group member error:');
  }
};

const removeMember = async (req, res) => {
  try {
    const group = await groupService.removeMember(req.params.groupId, req.params.userId, req.user);
    emitGroupUpdated({ group, removedUserId: req.params.userId });
    return res.json({ success: true, group });
  } catch (err) {
    return handleError(res, err, 'Remove group member error:');
  }
};

const exitGroup = async (req, res) => {
  try {
    const group = await groupService.exitGroup(req.params.groupId, req.user._id);
    emitConversationDeleted({
      userId: req.user._id,
      conversationId: req.params.groupId,
      chatType: 'group'
    });
    return res.json({ success: true, groupId: req.params.groupId, group });
  } catch (err) {
    return handleError(res, err, 'Exit group error:');
  }
};

const muteGroup = async (req, res) => {
  try {
    const muted = req.body?.muted !== false;
    const group = await groupService.setGroupMutedForUser(req.params.groupId, req.user._id, muted);
    return res.json({ success: true, group, muted });
  } catch (err) {
    return handleError(res, err, 'Mute group error:');
  }
};

const searchAddableUsers = async (req, res) => {
  try {
    const users = await groupService.searchAddableUsers(
      req.params.groupId,
      req.user,
      req.query.query || ''
    );
    return res.json({ success: true, users });
  } catch (err) {
    return handleError(res, err, 'Search addable group users error:');
  }
};

const searchInitialMembers = async (req, res) => {
  try {
    const users = await groupService.searchInitialMembers(req.user, req.query.query || '');
    return res.json({ success: true, users });
  } catch (err) {
    return handleError(res, err, 'Search initial group members error:');
  }
};

module.exports = {
  createGroup,
  getMyGroups,
  discoverGroups,
  getMessages,
  updateGroup,
  sendMessage,
  deleteMessage,
  reactToMessage,
  requestToJoin,
  cancelJoinRequest,
  getRequests,
  approveRequest,
  rejectRequest,
  addMember,
  removeMember,
  exitGroup,
  muteGroup,
  searchAddableUsers,
  searchInitialMembers
};
