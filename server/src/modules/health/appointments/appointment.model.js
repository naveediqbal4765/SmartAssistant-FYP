const mongoose = require('mongoose');

// Placeholder schema for future appointment scheduling implementation.
const AppointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String, trim: true },
  scheduledAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
