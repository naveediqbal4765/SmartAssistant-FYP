const mongoose = require('mongoose');

// Placeholder schema for future medication tracking implementation.
const MedicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Medication', MedicationSchema);
