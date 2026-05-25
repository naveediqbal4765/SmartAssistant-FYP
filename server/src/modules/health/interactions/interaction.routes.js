const express = require('express');
const {
  checkInteractions,
  getInteractionStatus
} = require('./interaction.controller');

const router = express.Router();

router.get('/', getInteractionStatus);
router.post('/check', checkInteractions);

module.exports = router;
