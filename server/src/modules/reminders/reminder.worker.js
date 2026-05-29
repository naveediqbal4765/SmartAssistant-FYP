const Reminder = require('./reminder.model');
const Appointment = require('../health/appointments/appointment.model');
const Medication = require('../health/medications/medication.model');
const User = require('../../shared/models/User');
const notificationService = require('../communication/notifications/notification.service');
const { emitSeniorReminderChanged } = require('../communication/sockets/socket.manager');

const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const MEDICATION_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const APPOINTMENT_POPUP_VISIBLE_MINUTES = 1;
const APPOINTMENT_REPEAT_AFTER_MINUTES = 5;
let workerTimer = null;
let running = false;

const getDueReminderQuery = (now) => ({
  status: 'active',
  $or: [
    { scheduledAt: { $lte: now } },
    { scheduledAt: { $exists: false }, scheduledTime: { $lte: now } }
  ]
});

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateTime = (dateKey, timeKey = '00:00') => {
  const date = new Date(`${dateKey}T${timeKey}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getOccurrenceKey = (medicationId, scheduledFor) => (
  `${medicationId}:${scheduledFor.toISOString()}`
);

const isDateInMedicationRange = (medication, dateKey) => {
  if (medication.startDate && dateKey < medication.startDate) return false;
  if (medication.endDate && dateKey > medication.endDate) return false;
  return true;
};

const getMedicationTimes = (medication) => (
  medication.reminderTimes?.length
    ? medication.reminderTimes
    : medication.time
      ? [medication.time]
      : []
).filter(Boolean);

const getNextIntervalOccurrence = (medication, now) => {
  const intervalHours = Number(medication.intervalHours || 0);
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const anchorTime = getMedicationTimes(medication)[0] || '08:00';
  const anchor = parseDateTime(medication.startDate || toDateKey(now), anchorTime);
  const end = medication.endDate ? parseDateTime(medication.endDate, '23:59') : null;

  if (!anchor || intervalMs <= 0) return null;

  let nextOccurrence = anchor;
  if (nextOccurrence <= now) {
    const elapsed = now.getTime() - anchor.getTime();
    nextOccurrence = new Date(anchor.getTime() + (Math.floor(elapsed / intervalMs) + 1) * intervalMs);
  }

  if (end && nextOccurrence > end) return null;
  return nextOccurrence;
};

const getNextScheduledOccurrence = (medication, now) => {
  const reminderTimes = getMedicationTimes(medication);
  if (!reminderTimes.length || medication.scheduleType === 'as_needed') return null;

  if (medication.scheduleType === 'interval_hours') {
    return getNextIntervalOccurrence(medication, now);
  }

  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  if (medication.startDate && medication.startDate > toDateKey(cursor)) {
    const startDate = parseDateTime(medication.startDate, '00:00');
    if (startDate) cursor.setTime(startDate.getTime());
  }

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const dateKey = toDateKey(cursor);
    const dayOfWeek = cursor.getDay();
    const canUseDate = isDateInMedicationRange(medication, dateKey)
      && (medication.scheduleType !== 'weekly' || (medication.daysOfWeek || []).includes(dayOfWeek));

    if (canUseDate) {
      const nextForDate = reminderTimes
        .map((time) => parseDateTime(dateKey, time))
        .filter((scheduledFor) => scheduledFor && scheduledFor > now)
        .sort((a, b) => a - b)[0];

      if (nextForDate) return nextForDate;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
};

const getDueMedicationOccurrences = (medication, now) => {
  const reminderTimes = getMedicationTimes(medication);
  if (!reminderTimes.length || medication.scheduleType === 'as_needed') return [];

  const existingKeys = new Set((medication.reminderOccurrences || []).map((occurrence) => occurrence.occurrenceKey));
  const dueOccurrences = [];
  const addOccurrence = (scheduledFor) => {
    if (!scheduledFor || scheduledFor > now || scheduledFor.getTime() < now.getTime() - MEDICATION_LOOKBACK_MS) return;
    const occurrenceKey = getOccurrenceKey(medication._id, scheduledFor);
    if (!existingKeys.has(occurrenceKey)) {
      dueOccurrences.push({ occurrenceKey, scheduledFor });
      existingKeys.add(occurrenceKey);
    }
  };

  if (medication.scheduleType === 'interval_hours') {
    const intervalHours = Number(medication.intervalHours || 0);
    const intervalMs = intervalHours * 60 * 60 * 1000;
    const anchorTime = reminderTimes[0] || '08:00';
    const anchor = parseDateTime(medication.startDate || toDateKey(now), anchorTime);
    const end = medication.endDate ? parseDateTime(medication.endDate, '23:59') : null;

    if (!anchor || intervalMs <= 0) return [];
    for (
      let scheduledFor = anchor;
      scheduledFor <= now && (!end || scheduledFor <= end);
      scheduledFor = new Date(scheduledFor.getTime() + intervalMs)
    ) {
      addOccurrence(scheduledFor);
    }
    return dueOccurrences;
  }

  const cursor = new Date(now.getTime() - MEDICATION_LOOKBACK_MS);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= now) {
    const dateKey = toDateKey(cursor);
    const dayOfWeek = cursor.getDay();
    const canUseDate = isDateInMedicationRange(medication, dateKey)
      && (medication.scheduleType !== 'weekly' || (medication.daysOfWeek || []).includes(dayOfWeek));

    if (canUseDate) {
      reminderTimes.forEach((time) => addOccurrence(parseDateTime(dateKey, time)));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dueOccurrences;
};

const normalizeMedicationReminder = (medication, occurrence) => ({
  _id: medication._id,
  medicationId: medication._id,
  name: medication.name,
  dosage: medication.dosage,
  frequency: medication.frequency,
  scheduleType: medication.scheduleType,
  notes: medication.notes,
  occurrenceKey: occurrence.occurrenceKey,
  scheduledFor: occurrence.scheduledFor,
  status: occurrence.status,
  activatedAt: occurrence.activatedAt,
  dismissedAt: occurrence.dismissedAt,
  takenAt: occurrence.takenAt,
  skippedAt: occurrence.skippedAt,
  expiredAt: occurrence.expiredAt
});

const normalizeAppointmentReminder = (appointment) => ({
  _id: appointment._id,
  title: appointment.title,
  date: appointment.date,
  time: appointment.time,
  timezone: appointment.timezone,
  appointmentAtUTC: appointment.appointmentAtUTC,
  notes: appointment.notes,
  reminderStatus: appointment.reminderStatus,
  reminderVersion: appointment.reminderVersion,
  reminderActiveAt: appointment.reminderActiveAt,
  reminderExpiresAt: appointment.reminderExpiresAt,
  lastReminderShownAt: appointment.lastReminderShownAt,
  nextReminderAt: appointment.nextReminderAt
});

const getSenior = (seniorId) => User.findById(seniorId).select('linkedCaregivers');

const processDueCallReminders = async (now) => {
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
};

const processDueAppointmentReminders = async (now) => {
  const nextCycleAt = new Date(now.getTime() + (APPOINTMENT_POPUP_VISIBLE_MINUTES + APPOINTMENT_REPEAT_AFTER_MINUTES) * 60 * 1000);
  const dueAppointments = await Appointment.find({
    reminderStatus: { $in: ['pending', 'active'] },
    reminderExpiresAt: { $gte: now },
    nextReminderAt: { $lte: now }
  }).sort({ nextReminderAt: 1 }).limit(50);

  for (const dueAppointment of dueAppointments) {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: dueAppointment._id,
        reminderStatus: { $in: ['pending', 'active'] },
        reminderExpiresAt: { $gte: now },
        nextReminderAt: { $lte: now }
      },
      {
        $set: {
          reminderStatus: 'active',
          lastReminderShownAt: now,
          nextReminderAt: nextCycleAt
        }
      },
      { new: true }
    );

    if (!appointment) continue;
    const senior = await getSenior(appointment.seniorId);
    emitSeniorReminderChanged({
      senior,
      reminderType: 'appointment',
      action: 'triggered',
      item: normalizeAppointmentReminder(appointment)
    });
  }

  await Appointment.updateMany(
    {
      reminderStatus: { $in: ['pending', 'active'] },
      reminderExpiresAt: { $lt: now }
    },
    { $set: { reminderStatus: 'expired' } }
  );
};

const processDueMedicationReminders = async (now) => {
  const medications = await Medication.find({ scheduleType: { $ne: 'as_needed' } });

  for (const medication of medications) {
    const dueOccurrences = getDueMedicationOccurrences(medication, now);
    if (!dueOccurrences.length) continue;

    dueOccurrences.forEach((occurrence) => {
      medication.reminderOccurrences.push({
        ...occurrence,
        status: 'active',
        activatedAt: occurrence.scheduledFor
      });
    });

    await medication.save();
    const senior = await getSenior(medication.seniorId);
    dueOccurrences.forEach((occurrence) => {
      emitSeniorReminderChanged({
        senior,
        reminderType: 'medication',
        action: 'triggered',
        item: {
          medication,
          reminder: normalizeMedicationReminder(medication, {
            ...occurrence,
            status: 'active',
            activatedAt: occurrence.scheduledFor
          })
        }
      });
    });
  }
};

const processDueReminders = async () => {
  if (running) return;
  running = true;

  try {
    const now = new Date();
    await processDueCallReminders(now);
    await processDueAppointmentReminders(now);
    await processDueMedicationReminders(now);
  } catch (err) {
    console.error('Reminder worker error:', err);
  } finally {
    running = false;
    scheduleNextReminderRun();
  }
};

const getNextCallReminderAt = async (now) => {
  const reminder = await Reminder.findOne({
    status: 'active',
    $or: [
      { scheduledAt: { $gt: now } },
      { scheduledAt: { $exists: false }, scheduledTime: { $gt: now } }
    ]
  }).sort({ scheduledAt: 1, scheduledTime: 1 }).select('scheduledAt scheduledTime');

  return reminder ? new Date(reminder.scheduledAt || reminder.scheduledTime) : null;
};

const getNextAppointmentReminderAt = async (now) => {
  const appointment = await Appointment.findOne({
    reminderStatus: { $in: ['pending', 'active'] },
    reminderExpiresAt: { $gte: now },
    nextReminderAt: { $gt: now }
  }).sort({ nextReminderAt: 1 }).select('nextReminderAt');

  return appointment?.nextReminderAt || null;
};

const getNextMedicationReminderAt = async (now) => {
  const medications = await Medication.find({ scheduleType: { $ne: 'as_needed' } });
  return medications
    .map((medication) => getNextScheduledOccurrence(medication, now))
    .filter(Boolean)
    .sort((a, b) => a - b)[0] || null;
};

const getNextReminderRunAt = async () => {
  const now = new Date();
  const candidates = await Promise.all([
    getNextCallReminderAt(now),
    getNextAppointmentReminderAt(now),
    getNextMedicationReminderAt(now)
  ]);

  return candidates.filter(Boolean).sort((a, b) => a - b)[0] || null;
};

const scheduleNextReminderRun = async () => {
  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = null;
  }

  try {
    const nextRunAt = await getNextReminderRunAt();
    if (!nextRunAt) return;

    const delayMs = Math.max(0, Math.min(nextRunAt.getTime() - Date.now(), MAX_TIMEOUT_MS));
    workerTimer = setTimeout(processDueReminders, delayMs);
  } catch (err) {
    console.error('Reminder scheduler error:', err);
  }
};

const startReminderWorker = () => {
  if (workerTimer || running) return;
  processDueReminders();
};

const stopReminderWorker = () => {
  if (!workerTimer) return;
  clearTimeout(workerTimer);
  workerTimer = null;
};

module.exports = {
  processDueReminders,
  scheduleNextReminderRun,
  startReminderWorker,
  stopReminderWorker
};
