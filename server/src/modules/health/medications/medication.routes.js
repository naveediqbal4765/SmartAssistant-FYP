const express = require('express');
const { getMedicationStatus } = require('./medication.controller');

const router = express.Router();

router.get('/', getMedicationStatus);

module.exports = router;
