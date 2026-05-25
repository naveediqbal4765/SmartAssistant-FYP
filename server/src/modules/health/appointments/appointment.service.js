const mongoose = require('mongoose');
const Appointment = require('./appointment.model');

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

const createAppointment = async (user, payload) => {
  assertSenior(user);

  return Appointment.create({
    seniorId: user._id,
    ...validateAppointmentPayload(payload)
  });
};

const getAppointments = async (user) => {
  const seniorId = getReadableSeniorId(user);

  return Appointment.find({ seniorId }).sort({ date: 1, time: 1, createdAt: -1 });
};

const updateAppointment = async (user, appointmentId, payload) => {
  assertSenior(user);
  assertObjectId(appointmentId, 'appointment id');

  const appointment = await Appointment.findOneAndUpdate(
    { _id: appointmentId, seniorId: user._id },
    validateAppointmentPayload(payload),
    { new: true, runValidators: true }
  );

  if (!appointment) {
    throw createError(404, 'Appointment not found');
  }

  return appointment;
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
  updateAppointment,
  deleteAppointment
};
