const express = require('express');
const auth = require('../../../middleware/auth');
const {
  createMedication,
  deleteMedication,
  dismissReminder,
  getEligibleReminders,
  getMedications,
  markReminderTaken,
  skipReminder,
  updateMedication
} = require('./medication.controller');

const router = express.Router();

router.get('/', auth, getMedications);
router.get('/reminders/eligible', auth, getEligibleReminders);
router.post('/', auth, createMedication);
router.put('/:id', auth, updateMedication);
router.patch('/:id/reminder/dismiss', auth, dismissReminder);
router.patch('/:id/reminder/taken', auth, markReminderTaken);
router.patch('/:id/reminder/skip', auth, skipReminder);
router.delete('/:id', auth, deleteMedication);

module.exports = router;
