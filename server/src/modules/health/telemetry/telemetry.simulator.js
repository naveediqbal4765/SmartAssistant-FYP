const User = require('../../../shared/models/User');
const { emitSeniorTelemetryUpdated } = require('../../communication/sockets/socket.manager');

const TELEMETRY_INTERVAL_MS = 7000;
const telemetryStateBySenior = new Map();
let telemetryInterval = null;
let running = false;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundOne = (value) => Math.round(value * 10) / 10;

const createInitialTelemetry = () => ({
  heartRate: 74,
  bloodPressure: {
    systolic: 122,
    diastolic: 78
  },
  oxygenLevel: 98,
  activityStatus: 'Resting',
  temperature: 36.8
});

const nextActivityStatus = (heartRate) => {
  if (heartRate >= 95) return 'Active';
  if (heartRate <= 65) return 'Resting';
  return 'Light activity';
};

const nextTelemetry = (previous) => {
  const heartRate = Math.round(clamp(previous.heartRate + 1.5, 58, 105));
  const systolic = Math.round(clamp(previous.bloodPressure.systolic + 1, 105, 145));
  const diastolic = Math.round(clamp(previous.bloodPressure.diastolic + 0.8, 65, 95));
  const oxygenLevel = Math.round(clamp(previous.oxygenLevel + 0.4, 94, 100));
  const temperature = roundOne(clamp(previous.temperature + 0.05, 36.1, 37.6));

  return {
    heartRate: heartRate >= 104 ? 74 : heartRate,
    bloodPressure: {
      systolic: systolic >= 144 ? 122 : systolic,
      diastolic: diastolic >= 94 ? 78 : diastolic
    },
    oxygenLevel: oxygenLevel >= 100 ? 98 : oxygenLevel,
    activityStatus: nextActivityStatus(heartRate),
    temperature: temperature >= 37.5 ? 36.8 : temperature
  };
};

const emitTelemetrySnapshot = async () => {
  if (running) return;
  running = true;

  try {
    const seniors = await User.find({ role: 'elder' }).select('_id linkedCaregivers');
    const updatedAt = new Date().toISOString();

    seniors.forEach((senior) => {
      const seniorId = String(senior._id);
      const previous = telemetryStateBySenior.get(seniorId) || createInitialTelemetry();
      const telemetry = nextTelemetry(previous);
      telemetryStateBySenior.set(seniorId, telemetry);

      emitSeniorTelemetryUpdated({
        senior,
        telemetry: {
          ...telemetry,
          updatedAt
        }
      });
    });
  } catch (err) {
    console.error('Telemetry simulation error:', err.message);
  } finally {
    running = false;
  }
};

const startTelemetrySimulator = () => {
  if (telemetryInterval) return;

  emitTelemetrySnapshot();
  telemetryInterval = setInterval(emitTelemetrySnapshot, TELEMETRY_INTERVAL_MS);
};

const stopTelemetrySimulator = () => {
  if (!telemetryInterval) return;
  clearInterval(telemetryInterval);
  telemetryInterval = null;
};

module.exports = {
  startTelemetrySimulator,
  stopTelemetrySimulator
};
