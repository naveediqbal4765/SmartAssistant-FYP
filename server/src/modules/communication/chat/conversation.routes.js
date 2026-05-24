const express = require('express');
const auth = require('../../../middleware/auth');
const { getConversations } = require('./conversation.controller');

const router = express.Router();

router.get('/', auth, getConversations);

module.exports = router;
