const mongoose = require('mongoose');
const reminderService = require('./reminder.service');

const handleError = (res, err, label) => {
  console.error(label, err);
  return res.status(err.status || 500).json({
    success: false,
    msg: err.status ? err.message : 'Server error'
  });
};

const createReminder = async (req, res) => {
  try {
    const reminder = await reminderService.createReminder(req.user, req.body);
    return res.status(201).json({ success: true, reminder });
  } catch (err) {
    return handleError(res, err, 'Create reminder error:');
  }
};

const getReminders = async (req, res) => {
  try {
    const reminders = await reminderService.getReminders(req.user);
    return res.json({ success: true, reminders });
  } catch (err) {
    return handleError(res, err, 'Fetch reminders error:');
  }
};

const deleteReminder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, msg: 'Valid reminder id is required' });
    }

    await reminderService.deleteReminder(req.user, req.params.id);
    return res.json({ success: true, reminderId: req.params.id });
  } catch (err) {
    return handleError(res, err, 'Delete reminder error:');
  }
};

module.exports = {
  createReminder,
  getReminders,
  deleteReminder
};
