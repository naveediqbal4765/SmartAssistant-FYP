const mongoose = require('mongoose');
const Medication = require('./medication.model');

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
  if (user.role !== 'elder') throw createError(403, 'Only seniors can manage medications');
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

  throw createError(403, 'Volunteers cannot access medications');
};

const validateMedicationPayload = (payload) => {
  const requiredFields = ['name', 'dosage', 'frequency', 'time'];
  requiredFields.forEach((field) => {
    if (!payload[field]?.trim()) {
      throw createError(400, `${field} is required`);
    }
  });

  return {
    name: payload.name.trim(),
    dosage: payload.dosage.trim(),
    frequency: payload.frequency.trim(),
    time: payload.time.trim(),
    notes: payload.notes?.trim() || ''
  };
};

const createMedication = async (user, payload) => {
  assertSenior(user);

  return Medication.create({
    seniorId: user._id,
    ...validateMedicationPayload(payload)
  });
};

const getMedications = async (user) => {
  const seniorId = getReadableSeniorId(user);

  return Medication.find({ seniorId }).sort({ createdAt: -1 });
};

const updateMedication = async (user, medicationId, payload) => {
  assertSenior(user);
  assertObjectId(medicationId, 'medication id');

  const medication = await Medication.findOneAndUpdate(
    { _id: medicationId, seniorId: user._id },
    validateMedicationPayload(payload),
    { new: true, runValidators: true }
  );

  if (!medication) {
    throw createError(404, 'Medication not found');
  }

  return medication;
};

const deleteMedication = async (user, medicationId) => {
  assertSenior(user);
  assertObjectId(medicationId, 'medication id');

  const medication = await Medication.findOneAndDelete({
    _id: medicationId,
    seniorId: user._id
  });

  if (!medication) {
    throw createError(404, 'Medication not found');
  }

  return medication;
};

module.exports = {
  createMedication,
  getMedications,
  updateMedication,
  deleteMedication
};
