const medicationService = require('./medication.service');

const handleError = (res, err, label) => {
  console.error(label, err);
  return res.status(err.status || 500).json({
    success: false,
    msg: err.status ? err.message : 'Server error'
  });
};

const createMedication = async (req, res) => {
  try {
    const medication = await medicationService.createMedication(req.user, req.body);
    return res.status(201).json({ success: true, medication });
  } catch (err) {
    return handleError(res, err, 'Create medication error:');
  }
};

const getMedications = async (req, res) => {
  try {
    const medications = await medicationService.getMedications(req.user);
    return res.json({ success: true, medications });
  } catch (err) {
    return handleError(res, err, 'Fetch medications error:');
  }
};

const updateMedication = async (req, res) => {
  try {
    const medication = await medicationService.updateMedication(req.user, req.params.id, req.body);
    return res.json({ success: true, medication });
  } catch (err) {
    return handleError(res, err, 'Update medication error:');
  }
};

const deleteMedication = async (req, res) => {
  try {
    await medicationService.deleteMedication(req.user, req.params.id);
    return res.json({ success: true, medicationId: req.params.id });
  } catch (err) {
    return handleError(res, err, 'Delete medication error:');
  }
};

module.exports = {
  createMedication,
  getMedications,
  updateMedication,
  deleteMedication
};
