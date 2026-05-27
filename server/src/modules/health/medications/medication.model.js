const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
  seniorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    required: true,
    trim: true
  },
  frequency: {
    type: String,
    default: '',
    trim: true
  },
  time: {
    type: String,
    default: '',
    trim: true
  },
  scheduleType: {
    type: String,
    enum: ['once_daily', 'multiple_times_daily', 'interval_hours', 'weekly', 'as_needed'],
    default: 'once_daily',
    index: true
  },
  reminderTimes: {
    type: [String],
    default: []
  },
  intervalHours: {
    type: Number,
    default: null
  },
  daysOfWeek: {
    type: [Number],
    default: []
  },
  startDate: {
    type: String,
    default: ''
  },
  endDate: {
    type: String,
    default: ''
  },
  reminderOccurrences: [{
    occurrenceKey: { type: String, required: true },
    scheduledFor: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'dismissed', 'taken', 'skipped', 'expired'],
      default: 'pending',
      index: true
    },
    activatedAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },
    takenAt: { type: Date, default: null },
    skippedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null }
  }],
  notes: {
    type: String,
    default: '',
    trim: true
  },
  createdAt: { type: Date, default: Date.now }
});

MedicationSchema.index({ seniorId: 1, createdAt: -1 });
MedicationSchema.index({ seniorId: 1, 'reminderOccurrences.status': 1, 'reminderOccurrences.scheduledFor': 1 });

module.exports = mongoose.model('Medication', MedicationSchema);
