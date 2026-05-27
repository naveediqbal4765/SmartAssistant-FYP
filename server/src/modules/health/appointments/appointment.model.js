const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  seniorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true,
    trim: true
  },
  time: {
    type: String,
    required: true,
    trim: true
  },
  timezone: {
    type: String,
    required: true,
    default: 'UTC',
    trim: true
  },
  appointmentAtUTC: {
    type: Date,
    required: true,
    index: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  reminderStatus: {
    type: String,
    enum: ['pending', 'active', 'dismissed', 'expired'],
    default: 'pending',
    index: true
  },
  reminderVersion: {
    type: String,
    required: true,
    trim: true
  },
  reminderActiveAt: {
    type: Date,
    required: true,
    index: true
  },
  reminderExpiresAt: {
    type: Date,
    required: true,
    index: true
  },
  reminderDismissedAt: {
    type: Date,
    default: null
  },
  lastReminderShownAt: {
    type: Date,
    default: null
  },
  nextReminderAt: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: { type: Date, default: Date.now }
});

AppointmentSchema.index({ seniorId: 1, date: 1, time: 1 });
AppointmentSchema.index({ seniorId: 1, reminderStatus: 1, reminderActiveAt: 1, reminderExpiresAt: 1 });
AppointmentSchema.index({ seniorId: 1, reminderStatus: 1, nextReminderAt: 1, reminderExpiresAt: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
