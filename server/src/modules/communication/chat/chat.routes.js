const express = require('express');
const auth = require('../../../middleware/auth');
const {
  sendMessage,
  getMessages
} = require('./chat.controller');

const router = express.Router();

router.post('/message', auth, sendMessage);
router.get('/:userId', auth, getMessages);

module.exports = router;
