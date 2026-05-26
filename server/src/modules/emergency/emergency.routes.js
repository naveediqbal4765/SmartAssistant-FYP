const express = require('express');
const auth = require('../../middleware/auth');
const { triggerEmergency, acceptEmergency } = require('./emergency.controller');

const router = express.Router();

router.post('/trigger', auth, triggerEmergency);
router.post('/accept', auth, acceptEmergency);

module.exports = router;
