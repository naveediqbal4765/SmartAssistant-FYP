const mongoose = require('mongoose');
const notificationService = require('./notification.service');

const getNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications(req.user._id);
    return res.json({ success: true, notifications });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Valid notification id is required' });
    }

    const notification = await notificationService.markAsRead(id, req.user._id);
    if (!notification) {
      return res.status(404).json({ success: false, msg: 'Notification not found' });
    }

    return res.json({ success: true, notification });
  } catch (err) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Valid notification id is required' });
    }

    const notification = await notificationService.deleteNotification(id, req.user._id);
    if (!notification) {
      return res.status(404).json({ success: false, msg: 'Notification not found' });
    }

    return res.json({ success: true, notificationId: id });
  } catch (err) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const clearNotifications = async (req, res) => {
  try {
    const result = await notificationService.deleteNotificationsForUser(req.user._id);
    return res.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (err) {
    console.error('Clear notifications error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  deleteNotification,
  clearNotifications
};
