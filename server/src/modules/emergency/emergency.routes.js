const express = require('express');
const auth = require('../../middleware/auth');
const {
  triggerEmergency,
  acceptEmergency,
  getActiveEmergencies,
  getCaregiverEmergencies
} = require('./emergency.controller');

const router = express.Router();

router.post('/trigger', auth, triggerEmergency);
router.post('/accept', auth, acceptEmergency);
router.get('/active', auth, getActiveEmergencies);
router.get('/caregiver', auth, getCaregiverEmergencies);

module.exports = router;
