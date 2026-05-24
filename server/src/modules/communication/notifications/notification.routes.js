const express = require('express');
const auth = require('../../../middleware/auth');
const {
  getNotifications,
  markAsRead
} = require('./notification.controller');

const router = express.Router();

router.get('/', auth, getNotifications);
router.patch('/:id/read', auth, markAsRead);

module.exports = router;
