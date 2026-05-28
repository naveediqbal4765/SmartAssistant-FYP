const express = require('express');
const auth = require('../../../middleware/auth');
const conversationRoutes = require('./conversation.routes');
const { searchUsers } = require('./conversation.controller');
const {
  reactToMessage,
  reactToVoiceNote,
  sendMessage,
  getMessages,
  deleteMessage
} = require('./chat.controller');

const router = express.Router();

router.use('/conversations', conversationRoutes);
router.get('/search-users', auth, searchUsers);
router.post('/message', auth, sendMessage);
router.delete('/message/:id', auth, deleteMessage);
router.post('/message/:id/reaction', auth, reactToMessage);
router.post('/voice-note/:id/reaction', auth, reactToVoiceNote);
router.get('/:userId', auth, getMessages);

module.exports = router;
