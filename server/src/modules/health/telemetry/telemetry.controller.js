const telemetryService = require('./telemetry.service');

const getTelemetryStatus = async (req, res) => {
  const status = await telemetryService.getTelemetryModuleStatus();
  return res.json({ success: true, ...status });
};

module.exports = { getTelemetryStatus };
