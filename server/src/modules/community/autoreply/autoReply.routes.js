const express = require('express');
const auth = require('../../../middleware/auth');
const autoReplyController = require('./autoReply.controller');

const router = express.Router();

router.get('/settings', auth, autoReplyController.getSettings);
router.put('/settings', auth, autoReplyController.updateSettings);
router.get('/suggestions', auth, autoReplyController.getSuggestions);

module.exports = router;
