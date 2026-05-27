const express = require('express');
const auth = require('../../../middleware/auth');
const { reactToMessage } = require('./chat.controller');

const router = express.Router();

router.post('/:id/reaction', auth, reactToMessage);

module.exports = router;
