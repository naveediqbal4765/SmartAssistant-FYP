const express = require('express');
const { getInteractionStatus } = require('./interaction.controller');

const router = express.Router();

router.get('/', getInteractionStatus);

module.exports = router;
