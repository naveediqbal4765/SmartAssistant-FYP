const express = require('express');
const { getAppointmentStatus } = require('./appointment.controller');

const router = express.Router();

router.get('/', getAppointmentStatus);

module.exports = router;
