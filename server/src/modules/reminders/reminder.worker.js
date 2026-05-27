const Reminder = require('./reminder.model');
const notificationService = require('../communication/notifications/notification.service');

const CHECK_INTERVAL_MS = 30000;
let workerInterval = null;
let running = false;

const getDueReminderQuery = (now) => ({
  status: 'active',
  $or: [
    { scheduledAt: { $lte: now } },
    { scheduledAt: { $exists: false }, scheduledTime: { $lte: now } }
  ]
});

const processDueReminders = async () => {
  if (running) return;
  running = true;

  try {
    const now = new Date();
    const dueReminders = await Reminder.find(getDueReminderQuery(now))
      .sort({ scheduledAt: 1, scheduledTime: 1 })
      .limit(25);

    for (const dueReminder of dueReminders) {
      const reminder = await Reminder.findOneAndUpdate(
        { _id: dueReminder._id, status: 'active' },
        {
          $set: {
            status: 'triggered',
            scheduledAt: dueReminder.scheduledAt || dueReminder.scheduledTime,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (!reminder) continue;

      const userId = reminder.userId || reminder.seniorId;
      if (!userId) continue;

      await notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Call reminder',
        message: `${reminder.title || reminder.reminderText} - Call ${reminder.targetUserName}`,
        entityType: 'call_reminder',
        entityId: reminder._id
      });
    }
  } catch (err) {
    console.error('Reminder worker error:', err);
  } finally {
    running = false;
  }
};

const startReminderWorker = () => {
  if (workerInterval) return;
  processDueReminders();
  workerInterval = setInterval(processDueReminders, CHECK_INTERVAL_MS);
};

const stopReminderWorker = () => {
  if (!workerInterval) return;
  clearInterval(workerInterval);
  workerInterval = null;
};

module.exports = {
  processDueReminders,
  startReminderWorker,
  stopReminderWorker
};
