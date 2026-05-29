const Reminder = require('./reminder.model');

const scheduleReminderWorker = () => {
  const { scheduleNextReminderRun } = require('./reminder.worker');
  scheduleNextReminderRun();
};

const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const assertSenior = (user) => {
  if (!user?._id) throw createError(401, 'Unauthorized request');
  if (user.role !== 'elder') throw createError(403, 'Only seniors can access call reminders');
};

const createReminder = async (user, payload) => {
  assertSenior(user);

  const title = payload.title?.trim() || payload.reminderText?.trim();
  if (!title) throw createError(400, 'Reminder title is required');
  if (!payload.targetUserName?.trim()) throw createError(400, 'Target user name is required');
  if (!payload.scheduledAt && !payload.scheduledTime) throw createError(400, 'Scheduled time is required');

  const scheduledAt = new Date(payload.scheduledAt || payload.scheduledTime);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw createError(400, 'Valid scheduled time is required');
  }

  const reminder = await Reminder.create({
    userId: user._id,
    seniorId: user._id,
    targetUserName: payload.targetUserName.trim(),
    title,
    reminderText: title,
    scheduledAt,
    scheduledTime: scheduledAt,
    status: 'active',
    updatedAt: new Date()
  });

  scheduleReminderWorker();
  return reminder;
};

const getReminders = async (user) => {
  assertSenior(user);

  return Reminder.find({
    $or: [{ userId: user._id }, { seniorId: user._id }],
    status: 'active'
  })
    .sort({ scheduledAt: 1, scheduledTime: 1 })
    .limit(20);
};

const deleteReminder = async (user, reminderId) => {
  assertSenior(user);

  const reminder = await Reminder.findOneAndDelete({
    _id: reminderId,
    $or: [{ userId: user._id }, { seniorId: user._id }]
  });

  if (!reminder) throw createError(404, 'Reminder not found');
  scheduleReminderWorker();
  return reminder;
};

module.exports = {
  createReminder,
  getReminders,
  deleteReminder
};
