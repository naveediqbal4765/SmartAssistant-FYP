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
  notes: {
    type: String,
    default: '',
    trim: true
  },
  createdAt: { type: Date, default: Date.now }
});

AppointmentSchema.index({ seniorId: 1, date: 1, time: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
