const express = require('express');
const auth = require('../../../middleware/auth');
const {
  createAppointment,
  deleteAppointment,
  getAppointments,
  updateAppointment
} = require('./appointment.controller');

const router = express.Router();

router.get('/', auth, getAppointments);
router.post('/', auth, createAppointment);
router.put('/:id', auth, updateAppointment);
router.delete('/:id', auth, deleteAppointment);

module.exports = router;
