const medicationService = require('./medication.service');

const getMedicationStatus = async (req, res) => {
  const status = await medicationService.getMedicationModuleStatus();
  return res.json({ success: true, ...status });
};

module.exports = { getMedicationStatus };
