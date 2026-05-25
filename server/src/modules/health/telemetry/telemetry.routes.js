const express = require('express');
const { getTelemetryStatus } = require('./telemetry.controller');

const router = express.Router();

router.get('/', getTelemetryStatus);

module.exports = router;
