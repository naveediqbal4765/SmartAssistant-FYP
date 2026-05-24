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
  rejectRequest,
  removeMember,
  requestToJoin,
  searchAddableUsers,
  searchInitialMembers,
  sendMessage
} = require('./group.controller');

const router = express.Router();

router.post('/', auth, createGroup);
router.get('/', auth, getMyGroups);
router.get('/discover', auth, discoverGroups);
router.get('/create/search-users', auth, searchInitialMembers);
router.post('/add-member', auth, addMember);
router.delete('/message/:id', auth, deleteMessage);
router.patch('/requests/:requestId/approve', auth, approveRequest);
router.patch('/requests/:requestId/reject', auth, rejectRequest);
router.get('/:groupId/messages', auth, getMessages);
router.post('/:groupId/messages', auth, sendMessage);
router.post('/:groupId/join-request', auth, requestToJoin);
router.get('/:groupId/requests', auth, getRequests);
router.get('/:groupId/search-users', auth, searchAddableUsers);
router.delete('/:groupId/members/:userId', auth, removeMember);

module.exports = router;
