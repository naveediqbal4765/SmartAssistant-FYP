const Reminder = require('./reminder.model');

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

  if (!payload.title?.trim()) throw createError(400, 'Reminder title is required');
  if (!payload.targetUserName?.trim()) throw createError(400, 'Target user name is required');
  if (!payload.scheduledTime) throw createError(400, 'Scheduled time is required');

  const scheduledTime = new Date(payload.scheduledTime);
  if (Number.isNaN(scheduledTime.getTime())) {
    throw createError(400, 'Valid scheduled time is required');
  }

  return Reminder.create({
    seniorId: user._id,
    targetUserName: payload.targetUserName.trim(),
    title: payload.title.trim(),
    scheduledTime
  });
};

const getReminders = async (user) => {
  assertSenior(user);

  return Reminder.find({ seniorId: user._id })
    .sort({ scheduledTime: 1 })
    .limit(20);
};

const deleteReminder = async (user, reminderId) => {
  assertSenior(user);

  const reminder = await Reminder.findOneAndDelete({
    _id: reminderId,
    seniorId: user._id
  });

  if (!reminder) throw createError(404, 'Reminder not found');
  return reminder;
};

module.exports = {
  createReminder,
  getReminders,
  deleteReminder
};
