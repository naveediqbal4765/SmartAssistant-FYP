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

MedicationSchema.index({ seniorId: 1, createdAt: -1 });

module.exports = mongoose.model('Medication', MedicationSchema);
