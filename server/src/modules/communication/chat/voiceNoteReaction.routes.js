const express = require('express');
const auth = require('../../../middleware/auth');
const { reactToVoiceNote } = require('./chat.controller');

const router = express.Router();

router.post('/:id/reaction', auth, reactToVoiceNote);

module.exports = router;
