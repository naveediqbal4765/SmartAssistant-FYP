const mongoose = require('mongoose');
const Appointment = require('./appointment.model');
const PRE_ALERT_MINUTES = 30;
const EXPIRE_AFTER_MINUTES = 60;
const POPUP_VISIBLE_MINUTES = 1;
const REPEAT_AFTER_MINUTES = 5;
const DEFAULT_TIMEZONE = 'UTC';

const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const assertObjectId = (id, label = 'id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, `Valid ${label} is required`);
  }
};

const assertSenior = (user) => {
  if (!user?._id) throw createError(401, 'Unauthorized request');
  if (user.role !== 'elder') throw createError(403, 'Only seniors can manage appointments');
};

const getReadableSeniorId = (user) => {
  if (!user?._id) throw createError(401, 'Unauthorized request');

  if (user.role === 'elder') {
    return user._id;
  }

  if (user.role === 'caregiver') {
    if (!user.linkedSeniorId) {
      throw createError(404, 'No senior assigned to this caregiver');
    }
    return user.linkedSeniorId;
  }

  throw createError(403, 'Volunteers cannot access appointments');
};

const validateAppointmentPayload = (payload) => {
  const requiredFields = ['title', 'date', 'time'];
  requiredFields.forEach((field) => {
    if (!payload[field]?.trim()) {
      throw createError(400, `${field} is required`);
    }
  });

  return {
    title: payload.title.trim(),
    date: payload.date.trim(),
    time: payload.time.trim(),
    timezone: normalizeTimezone(payload.timezone),
    notes: payload.notes?.trim() || ''
  };
};

const normalizeTimezone = (timezone = DEFAULT_TIMEZONE) => {
  const candidate = String(timezone || DEFAULT_TIMEZONE).trim();
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch (err) {
    throw createError(400, 'Valid appointment timezone is required');
  }
};

const getZonedParts = (date, timezone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
};

const getAppointmentDateTime = ({ date, time, timezone = DEFAULT_TIMEZONE }) => {
  const [year, month, day] = String(date).split('-').map(Number);
  const [hour, minute] = String(time).split(':').map(Number);
  if ([year, month, day, hour, minute].some((value) => !Number.isFinite(value))) {
    throw createError(400, 'Valid appointment date and time are required');
  }

  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcValue = targetUtc;

  for (let index = 0; index < 3; index += 1) {
    const parts = getZonedParts(new Date(utcValue), timezone);
    const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
    utcValue = targetUtc - (zonedAsUtc - utcValue);
  }

  const appointmentDate = new Date(utcValue);
  const finalParts = getZonedParts(appointmentDate, timezone);
  if (
    finalParts.year !== year ||
    finalParts.month !== month ||
    finalParts.day !== day ||
    finalParts.hour !== hour ||
    finalParts.minute !== minute
  ) {
    throw createError(400, 'Appointment time does not exist in the selected timezone');
  }

  return appointmentDate;
};

const buildReminderLifecycle = ({ date, time, timezone = DEFAULT_TIMEZONE }) => {
  const normalizedTimezone = normalizeTimezone(timezone);
  const appointmentDate = getAppointmentDateTime({ date, time, timezone: normalizedTimezone });
  const reminderActiveAt = new Date(appointmentDate.getTime() - PRE_ALERT_MINUTES * 60 * 1000);
  return {
    timezone: normalizedTimezone,
    appointmentAtUTC: appointmentDate,
    reminderStatus: 'pending',
    reminderVersion: `${date}T${time}:${normalizedTimezone}`,
    reminderActiveAt,
    reminderExpiresAt: new Date(appointmentDate.getTime() + EXPIRE_AFTER_MINUTES * 60 * 1000),
    reminderDismissedAt: null,
    lastReminderShownAt: null,
    nextReminderAt: reminderActiveAt
  };
};

const normalizeAppointmentForReminder = (appointment) => ({
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

const backfillReminderLifecycle = async (seniorId) => {
  const legacyAppointments = await Appointment.find({
    seniorId,
    $or: [
      { timezone: { $exists: false } },
      { appointmentAtUTC: { $exists: false } },
      { reminderVersion: { $exists: false } },
      { reminderActiveAt: { $exists: false } },
      { reminderExpiresAt: { $exists: false } },
      { reminderStatus: { $exists: false } },
      { nextReminderAt: { $exists: false } }
    ]
  });

  await Promise.all(legacyAppointments.map((appointment) => {
    const lifecycle = buildReminderLifecycle({
      date: appointment.date,
      time: appointment.time,
      timezone: appointment.timezone || DEFAULT_TIMEZONE
    });

    appointment.timezone = appointment.timezone || lifecycle.timezone;
    appointment.appointmentAtUTC = appointment.appointmentAtUTC
      || (appointment.reminderActiveAt
        ? new Date(appointment.reminderActiveAt.getTime() + PRE_ALERT_MINUTES * 60 * 1000)
        : lifecycle.appointmentAtUTC);
    appointment.reminderVersion = appointment.reminderVersion || lifecycle.reminderVersion;
    appointment.reminderActiveAt = appointment.reminderActiveAt || lifecycle.reminderActiveAt;
    appointment.reminderExpiresAt = appointment.reminderExpiresAt || lifecycle.reminderExpiresAt;
    appointment.reminderStatus = appointment.reminderStatus || lifecycle.reminderStatus;
    appointment.nextReminderAt = appointment.nextReminderAt || appointment.reminderActiveAt || lifecycle.nextReminderAt;
    appointment.lastReminderShownAt = appointment.lastReminderShownAt || null;
    return appointment.save();
  }));
};

const createAppointment = async (user, payload) => {
  assertSenior(user);
  const appointmentPayload = validateAppointmentPayload(payload);

  return Appointment.create({
    seniorId: user._id,
    ...appointmentPayload,
    ...buildReminderLifecycle(appointmentPayload)
  });
};

const getAppointments = async (user) => {
  const seniorId = getReadableSeniorId(user);

  return Appointment.find({ seniorId }).sort({ date: 1, time: 1, createdAt: -1 });
};

const updateAppointment = async (user, appointmentId, payload) => {
  assertSenior(user);
  assertObjectId(appointmentId, 'appointment id');
  const appointmentPayload = validateAppointmentPayload(payload);

  const appointment = await Appointment.findOneAndUpdate(
    { _id: appointmentId, seniorId: user._id },
    {
      ...appointmentPayload,
      ...buildReminderLifecycle(appointmentPayload)
    },
    { new: true, runValidators: true }
  );

  if (!appointment) {
    throw createError(404, 'Appointment not found');
  }

  return appointment;
};

const getEligibleReminders = async (user) => {
  if (user.role !== 'elder') return [];

  const now = new Date();
  const visibleSince = new Date(now.getTime() - POPUP_VISIBLE_MINUTES * 60 * 1000);
  const nextCycleAt = new Date(now.getTime() + (POPUP_VISIBLE_MINUTES + REPEAT_AFTER_MINUTES) * 60 * 1000);
  await backfillReminderLifecycle(user._id);

  await Appointment.updateMany(
    {
      seniorId: user._id,
      reminderStatus: { $in: ['pending', 'active'] },
      reminderExpiresAt: { $lt: now }
    },
    { $set: { reminderStatus: 'expired' } }
  );

  await Appointment.updateMany(
    {
      seniorId: user._id,
      reminderStatus: 'pending',
      reminderActiveAt: { $lte: now },
      reminderExpiresAt: { $gte: now }
    },
    [
      {
        $set: {
          reminderStatus: 'active',
          nextReminderAt: { $ifNull: ['$nextReminderAt', '$reminderActiveAt'] }
        }
      }
    ]
  );

  await Appointment.updateMany(
    {
      seniorId: user._id,
      reminderStatus: 'active',
      reminderExpiresAt: { $gte: now },
      nextReminderAt: { $lte: now }
    },
    {
      $set: {
        lastReminderShownAt: now,
        nextReminderAt: nextCycleAt
      }
    }
  );

  const reminders = await Appointment.find({
    seniorId: user._id,
    reminderStatus: 'active',
    reminderExpiresAt: { $gte: now },
    lastReminderShownAt: { $gte: visibleSince }
  }).sort({ reminderActiveAt: 1, time: 1 });

  return reminders.map(normalizeAppointmentForReminder);
};

const dismissReminder = async (user, appointmentId, reminderVersion) => {
  assertSenior(user);
  assertObjectId(appointmentId, 'appointment id');
  if (!reminderVersion?.trim()) {
    throw createError(400, 'Reminder version is required');
  }

  const appointment = await Appointment.findOneAndUpdate(
    {
      _id: appointmentId,
      seniorId: user._id,
      reminderVersion,
      reminderStatus: { $in: ['pending', 'active'] }
    },
    {
      reminderStatus: 'dismissed',
      reminderDismissedAt: new Date()
    },
    { new: true }
  );

  if (!appointment) {
    throw createError(404, 'Active appointment reminder not found');
  }

  return normalizeAppointmentForReminder(appointment);
};

const deleteAppointment = async (user, appointmentId) => {
  assertSenior(user);
  assertObjectId(appointmentId, 'appointment id');

  const appointment = await Appointment.findOneAndDelete({
    _id: appointmentId,
    seniorId: user._id
  });

  if (!appointment) {
    throw createError(404, 'Appointment not found');
  }

  return appointment;
};

module.exports = {
  createAppointment,
  getAppointments,
  getEligibleReminders,
  dismissReminder,
  updateAppointment,
  deleteAppointment
};
