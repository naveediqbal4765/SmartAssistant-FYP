const groupService = require('./group.service');
const { emitMessageDeleted } = require('../sockets/socket.manager');
const mongoose = require('mongoose');

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

const sendMessage = async (req, res) => {
  try {
    const message = await groupService.sendMessage(req.params.groupId, req.user, req.body);
    return res.status(201).json({ success: true, message });
  } catch (err) {
    return handleError(res, err, 'Send group message error:');
  }
};

const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;

    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: 'Unauthorized delete request' });
    }

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, msg: 'Valid message id is required' });
    }

    await groupService.deleteMessageForUser(messageId, req.user);
    emitMessageDeleted({
      userId: req.user._id,
      messageId,
      chatType: 'group'
    });
    return res.json({ success: true, msg: 'Message deleted successfully', messageId });
  } catch (err) {
    return handleError(res, err, 'Delete group message error:');
  }
};

const requestToJoin = async (req, res) => {
  try {
    const request = await groupService.requestToJoin(req.params.groupId, req.user);
    return res.status(201).json({ success: true, request });
  } catch (err) {
    return handleError(res, err, 'Group join request error:');
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
    return res.json({ success: true, request });
  } catch (err) {
    return handleError(res, err, 'Approve group request error:');
  }
};

const rejectRequest = async (req, res) => {
  try {
    const request = await groupService.updateRequest(req.params.requestId, req.user, 'rejected');
    return res.json({ success: true, request });
  } catch (err) {
    return handleError(res, err, 'Reject group request error:');
  }
};

const addMember = async (req, res) => {
  try {
    const group = await groupService.directAddMember(req.body.groupId, req.body.userId, req.user);
    return res.json({ success: true, group });
  } catch (err) {
    return handleError(res, err, 'Add group member error:');
  }
};

const removeMember = async (req, res) => {
  try {
    const group = await groupService.removeMember(req.params.groupId, req.params.userId, req.user);
    return res.json({ success: true, group });
  } catch (err) {
    return handleError(res, err, 'Remove group member error:');
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
  sendMessage,
  deleteMessage,
  requestToJoin,
  getRequests,
  approveRequest,
  rejectRequest,
  addMember,
  removeMember,
  searchAddableUsers,
  searchInitialMembers
};
