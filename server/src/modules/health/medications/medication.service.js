const mongoose = require('mongoose');
const Medication = require('./medication.model');
const User = require('../../../shared/models/User');
const {
  emitMedicationReminderStatusUpdated,
  emitSeniorReminderChanged
} = require('../../communication/sockets/socket.manager');
const ACTIVE_WINDOW_MS = 2 * 60 * 60 * 1000;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const VALID_SCHEDULE_TYPES = ['once_daily', 'multiple_times_daily', 'interval_hours', 'weekly', 'as_needed'];

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
  const requiredFields = ['name', 'dosage', 'scheduleType', 'startDate'];
  requiredFields.forEach((field) => {
    if (!String(payload[field] || '').trim()) {
      throw createError(400, `${field} is required`);
    }
  });

  const scheduleType = String(payload.scheduleType || '').trim();
  if (!VALID_SCHEDULE_TYPES.includes(scheduleType)) {
    throw createError(400, 'Valid schedule type is required');
  }

  const reminderTimes = Array.isArray(payload.reminderTimes)
    ? payload.reminderTimes.map((time) => String(time || '').trim()).filter(Boolean)
    : String(payload.time || '').trim()
      ? [String(payload.time).trim()]
      : [];

  if (['once_daily', 'multiple_times_daily', 'interval_hours', 'weekly'].includes(scheduleType) && !reminderTimes.length) {
    throw createError(400, 'At least one reminder time is required');
  }

  if (scheduleType === 'once_daily' && reminderTimes.length !== 1) {
    throw createError(400, 'Once daily schedules require exactly one reminder time');
  }

  const intervalHours = payload.intervalHours ? Number(payload.intervalHours) : null;
  if (scheduleType === 'interval_hours' && (!intervalHours || intervalHours < 1 || intervalHours > 24)) {
    throw createError(400, 'Interval schedules require interval hours between 1 and 24');
  }

  const daysOfWeek = Array.isArray(payload.daysOfWeek)
    ? payload.daysOfWeek.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];

  if (scheduleType === 'weekly' && !daysOfWeek.length) {
    throw createError(400, 'Weekly schedules require at least one day');
  }

  const frequency = payload.frequency?.trim() || getScheduleLabel({ scheduleType, reminderTimes, intervalHours, daysOfWeek });

  return {
    name: payload.name.trim(),
    dosage: payload.dosage.trim(),
    frequency,
    time: reminderTimes[0] || '',
    scheduleType,
    reminderTimes,
    intervalHours,
    daysOfWeek,
    startDate: payload.startDate.trim(),
    endDate: payload.endDate?.trim() || '',
    notes: payload.notes?.trim() || ''
  };
};

const getScheduleLabel = ({ scheduleType, reminderTimes, intervalHours, daysOfWeek }) => {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (scheduleType === 'once_daily') return 'Once daily';
  if (scheduleType === 'multiple_times_daily') return `${reminderTimes.length} times daily`;
  if (scheduleType === 'interval_hours') return `Every ${intervalHours} hours`;
  if (scheduleType === 'weekly') return `Weekly on ${daysOfWeek.map((day) => dayLabels[day]).join(', ')}`;
  return 'As needed';
};

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

const isDateInMedicationRange = (medication, dateKey) => {
  if (medication.startDate && dateKey < medication.startDate) return false;
  if (medication.endDate && dateKey > medication.endDate) return false;
  return true;
};

const getOccurrenceKey = (medicationId, scheduledFor) => (
  `${medicationId}:${scheduledFor.toISOString()}`
);

const getCandidateOccurrences = (medication, now = new Date()) => {
  if (medication.scheduleType === 'as_needed') return [];

  const candidates = [];
  if (medication.scheduleType === 'interval_hours') {
    const intervalHours = medication.intervalHours || 0;
    const anchorTime = medication.reminderTimes?.[0] || medication.time || '08:00';
    const anchor = parseDateTime(medication.startDate || toDateKey(now), anchorTime);
    const end = medication.endDate ? parseDateTime(medication.endDate, '23:59') : null;

    if (!anchor || intervalHours <= 0) return candidates;

    for (let occurrence = anchor; occurrence <= now; occurrence = new Date(occurrence.getTime() + intervalHours * 60 * 60 * 1000)) {
      if (occurrence.getTime() < now.getTime() - LOOKBACK_MS) continue;
      if (end && occurrence > end) break;
      candidates.push(new Date(occurrence));
    }

    return candidates;
  }

  const start = new Date(now.getTime() - LOOKBACK_MS);
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= now) {
    const dateKey = toDateKey(cursor);
    const dayOfWeek = cursor.getDay();

    if (isDateInMedicationRange(medication, dateKey)) {
      if (medication.scheduleType === 'weekly' && !(medication.daysOfWeek || []).includes(dayOfWeek)) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      (medication.reminderTimes || []).forEach((time) => {
        const scheduledFor = parseDateTime(dateKey, time);
        if (scheduledFor && scheduledFor <= now) {
          candidates.push(scheduledFor);
        }
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return candidates;
};

const normalizeReminder = (medication, occurrence) => ({
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

const backfillMedicationSchedule = async (medication) => {
  if (medication.scheduleType && medication.reminderTimes?.length && medication.startDate) return medication;

  medication.scheduleType = medication.scheduleType || 'once_daily';
  medication.reminderTimes = medication.reminderTimes?.length ? medication.reminderTimes : medication.time ? [medication.time] : [];
  medication.startDate = medication.startDate || toDateKey(medication.createdAt || new Date());
  medication.frequency = medication.frequency || getScheduleLabel({
    scheduleType: medication.scheduleType,
    reminderTimes: medication.reminderTimes,
    intervalHours: medication.intervalHours,
    daysOfWeek: medication.daysOfWeek || []
  });
  await medication.save();
  return medication;
};

const syncEligibleOccurrences = async (medication, now = new Date()) => {
  await backfillMedicationSchedule(medication);
  const occurrenceByKey = new Map((medication.reminderOccurrences || []).map((occurrence) => [
    occurrence.occurrenceKey,
    occurrence
  ]));

  getCandidateOccurrences(medication, now).forEach((scheduledFor) => {
    const occurrenceKey = getOccurrenceKey(medication._id, scheduledFor);
    if (!occurrenceByKey.has(occurrenceKey)) {
      medication.reminderOccurrences.push({
        occurrenceKey,
        scheduledFor,
        status: 'active',
        activatedAt: now
      });
    }
  });

  medication.reminderOccurrences.forEach((occurrence) => {
    if (
      ['pending', 'active'].includes(occurrence.status)
      && occurrence.scheduledFor.getTime() + ACTIVE_WINDOW_MS < now.getTime()
    ) {
      occurrence.status = 'expired';
      occurrence.expiredAt = now;
    } else if (occurrence.status === 'pending' && occurrence.scheduledFor <= now) {
      occurrence.status = 'active';
      occurrence.activatedAt = occurrence.activatedAt || now;
    }
  });

  await medication.save();
  return medication.reminderOccurrences.filter((occurrence) => occurrence.status === 'active');
};

const createMedication = async (user, payload) => {
  assertSenior(user);
  const medicationPayload = validateMedicationPayload(payload);

  const medication = await Medication.create({
    seniorId: user._id,
    ...medicationPayload,
    reminderOccurrences: []
  });

  const senior = await User.findById(user._id).select('linkedCaregivers');
  emitSeniorReminderChanged({ senior, reminderType: 'medication', action: 'created', item: medication });
  return medication;
};

const getMedications = async (user) => {
  const seniorId = getReadableSeniorId(user);

  const medications = await Medication.find({ seniorId }).sort({ createdAt: -1 });
  await Promise.all(medications.map((medication) => syncEligibleOccurrences(medication)));
  return medications;
};

const updateMedication = async (user, medicationId, payload) => {
  assertSenior(user);
  assertObjectId(medicationId, 'medication id');

  const medication = await Medication.findOneAndUpdate(
    { _id: medicationId, seniorId: user._id },
    {
      ...validateMedicationPayload(payload),
      reminderOccurrences: []
    },
    { new: true, runValidators: true }
  );

  if (!medication) {
    throw createError(404, 'Medication not found');
  }

  const senior = await User.findById(user._id).select('linkedCaregivers');
  emitSeniorReminderChanged({ senior, reminderType: 'medication', action: 'updated', item: medication });
  return medication;
};

const getEligibleReminders = async (user) => {
  if (user.role !== 'elder') return [];

  const medications = await Medication.find({ seniorId: user._id });
  const now = new Date();
  const remindersByMedication = await Promise.all(medications.map(async (medication) => {
    const activeOccurrences = await syncEligibleOccurrences(medication, now);
    return activeOccurrences.map((occurrence) => normalizeReminder(medication, occurrence));
  }));

  return remindersByMedication.flat().sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
};

const updateReminderStatus = async (user, medicationId, occurrenceKey, status) => {
  assertSenior(user);
  assertObjectId(medicationId, 'medication id');
  if (!occurrenceKey?.trim()) {
    throw createError(400, 'Reminder occurrence key is required');
  }

  const timestampFieldByStatus = {
    dismissed: 'reminderOccurrences.$.dismissedAt',
    taken: 'reminderOccurrences.$.takenAt',
    skipped: 'reminderOccurrences.$.skippedAt'
  };

  const medication = await Medication.findOneAndUpdate(
    {
      _id: medicationId,
      seniorId: user._id,
      'reminderOccurrences.occurrenceKey': occurrenceKey,
      'reminderOccurrences.status': { $in: ['pending', 'active'] }
    },
    {
      $set: {
        'reminderOccurrences.$.status': status,
        [timestampFieldByStatus[status]]: new Date()
      }
    },
    { new: true }
  );

  if (!medication) {
    throw createError(404, 'Active medication reminder not found');
  }

  const occurrence = medication.reminderOccurrences.find((item) => item.occurrenceKey === occurrenceKey);
  const reminder = normalizeReminder(medication, occurrence);
  const senior = await User.findById(user._id).select('linkedCaregivers');
  emitMedicationReminderStatusUpdated({ senior, medication, reminder });
  emitSeniorReminderChanged({ senior, reminderType: 'medication', action: 'completed', item: medication });
  return reminder;
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

  const senior = await User.findById(user._id).select('linkedCaregivers');
  emitSeniorReminderChanged({ senior, reminderType: 'medication', action: 'deleted', item: medication });
  return medication;
};

module.exports = {
  createMedication,
  getMedications,
  getEligibleReminders,
  updateReminderStatus,
  updateMedication,
  deleteMedication
};
