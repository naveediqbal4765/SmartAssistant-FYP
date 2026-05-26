const express = require('express');
const auth = require('../../middleware/auth');
const { getNearbyVolunteers } = require('./location.controller');

const router = express.Router();

router.get('/nearby-volunteers', auth, getNearbyVolunteers);

module.exports = router;
