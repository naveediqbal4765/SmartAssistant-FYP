const mongoose = require('mongoose');

// Placeholder schema for future health telemetry implementation.
const TelemetrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  metricType: { type: String, trim: true },
  recordedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Telemetry', TelemetrySchema);
