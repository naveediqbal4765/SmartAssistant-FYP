const mongoose = require('mongoose');
const Appointment = require('./appointment.model');
const PRE_ALERT_MINUTES = 30;
const EXPIRE_AFTER_MINUTES = 60;

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
    notes: payload.notes?.trim() || ''
  };
};

const getAppointmentDateTime = ({ date, time }) => {
  const appointmentDate = new Date(`${date}T${time}:00`);
  if (Number.isNaN(appointmentDate.getTime())) {
    throw createError(400, 'Valid appointment date and time are required');
  }
  return appointmentDate;
};

const buildReminderLifecycle = ({ date, time }) => {
  const appointmentDate = getAppointmentDateTime({ date, time });
  return {
    reminderStatus: 'pending',
    reminderVersion: `${date}T${time}`,
    reminderActiveAt: new Date(appointmentDate.getTime() - PRE_ALERT_MINUTES * 60 * 1000),
    reminderExpiresAt: new Date(appointmentDate.getTime() + EXPIRE_AFTER_MINUTES * 60 * 1000),
    reminderDismissedAt: null
  };
};

const normalizeAppointmentForReminder = (appointment) => ({
  _id: appointment._id,
  title: appointment.title,
  date: appointment.date,
  time: appointment.time,
  notes: appointment.notes,
  reminderStatus: appointment.reminderStatus,
  reminderVersion: appointment.reminderVersion,
  reminderActiveAt: appointment.reminderActiveAt,
  reminderExpiresAt: appointment.reminderExpiresAt
});

const backfillReminderLifecycle = async (seniorId) => {
  const legacyAppointments = await Appointment.find({
    seniorId,
    $or: [
      { reminderVersion: { $exists: false } },
      { reminderActiveAt: { $exists: false } },
      { reminderExpiresAt: { $exists: false } },
      { reminderStatus: { $exists: false } }
    ]
  });

  await Promise.all(legacyAppointments.map((appointment) => {
    const lifecycle = buildReminderLifecycle(appointment);
    Object.assign(appointment, lifecycle);
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
    { $set: { reminderStatus: 'active' } }
  );

  const reminders = await Appointment.find({
    seniorId: user._id,
    reminderStatus: 'active',
    reminderActiveAt: { $lte: now },
    reminderExpiresAt: { $gte: now }
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
