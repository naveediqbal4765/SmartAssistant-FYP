const express = require('express');
const auth = require('../../../middleware/auth');
const {
  addMember,
  approveRequest,
  createGroup,
  deleteMessage,
  discoverGroups,
  getMessages,
  getMyGroups,
  getRequests,
  exitGroup,
  muteGroup,
  transferAdminAndExit,
  rejectRequest,
  reactToMessage,
  removeMember,
  cancelJoinRequest,
  requestToJoin,
  searchAddableUsers,
  searchInitialMembers,
  sendMessage,
  deleteGroup,
  updateGroup
} = require('./group.controller');

const router = express.Router();

router.post('/', auth, createGroup);
router.get('/', auth, getMyGroups);
router.get('/discover', auth, discoverGroups);
router.get('/create/search-users', auth, searchInitialMembers);
router.post('/add-member', auth, addMember);
router.delete('/message/:id', auth, deleteMessage);
router.post('/message/:id/reaction', auth, reactToMessage);
router.patch('/requests/:requestId/approve', auth, approveRequest);
router.patch('/requests/:requestId/reject', auth, rejectRequest);
router.get('/:groupId/messages', auth, getMessages);
router.post('/:groupId/messages', auth, sendMessage);
router.patch('/:groupId', auth, updateGroup);
router.delete('/:groupId', auth, deleteGroup);
router.post('/:groupId/exit', auth, exitGroup);
router.post('/:groupId/transfer-admin-exit', auth, transferAdminAndExit);
router.patch('/:groupId/mute', auth, muteGroup);
router.post('/:groupId/join-request', auth, requestToJoin);
router.delete('/:groupId/join-request', auth, cancelJoinRequest);
router.get('/:groupId/requests', auth, getRequests);
router.get('/:groupId/search-users', auth, searchAddableUsers);
router.delete('/:groupId/members/:userId', auth, removeMember);

module.exports = router;
