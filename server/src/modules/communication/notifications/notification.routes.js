const express = require('express');
const auth = require('../../../middleware/auth');
const {
  clearNotifications,
  deleteNotification,
  getNotifications,
  markAsRead
} = require('./notification.controller');

const router = express.Router();

router.get('/', auth, getNotifications);
router.delete('/', auth, clearNotifications);
router.patch('/:id/read', auth, markAsRead);
router.delete('/:id', auth, deleteNotification);

module.exports = router;
