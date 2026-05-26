const express = require('express');
const auth = require('../../../middleware/auth');
const { createConversation, getConversationById, getConversations, resolveConversation } = require('./conversation.controller');

const router = express.Router();

router.get('/', auth, getConversations);
router.post('/resolve', auth, resolveConversation);
router.get('/:conversationId', auth, getConversationById);
router.post('/', auth, createConversation);

module.exports = router;
