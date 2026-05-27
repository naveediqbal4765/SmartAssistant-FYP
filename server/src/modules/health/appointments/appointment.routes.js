const express = require('express');
const auth = require('../../../middleware/auth');
const {
  createAppointment,
  deleteAppointment,
  dismissReminder,
  getEligibleReminders,
  getAppointments,
  updateAppointment
} = require('./appointment.controller');

const router = express.Router();

router.get('/', auth, getAppointments);
router.get('/reminders/eligible', auth, getEligibleReminders);
router.post('/', auth, createAppointment);
router.put('/:id', auth, updateAppointment);
router.patch('/:id/reminder/dismiss', auth, dismissReminder);
router.delete('/:id', auth, deleteAppointment);

module.exports = router;
