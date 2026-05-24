const express = require('express');
const auth = require('../../../middleware/auth');
const { createConversation, getConversations } = require('./conversation.controller');

const router = express.Router();

router.get('/', auth, getConversations);
router.post('/', auth, createConversation);

module.exports = router;
