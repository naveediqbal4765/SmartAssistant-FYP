const express = require('express');
const auth = require('../../../middleware/auth');
const conversationRoutes = require('./conversation.routes');
const { searchUsers } = require('./conversation.controller');
const {
  sendMessage,
  getMessages
} = require('./chat.controller');

const router = express.Router();

router.use('/conversations', conversationRoutes);
router.get('/search-users', auth, searchUsers);
router.post('/message', auth, sendMessage);
router.get('/:userId', auth, getMessages);

module.exports = router;
