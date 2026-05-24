const express = require('express');
const auth = require('../../middleware/auth');
const {
  createReminder,
  deleteReminder,
  getReminders
} = require('./reminder.controller');

const router = express.Router();

router.get('/', auth, getReminders);
router.post('/', auth, createReminder);
router.delete('/:id', auth, deleteReminder);

module.exports = router;
