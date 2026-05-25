const appointmentService = require('./appointment.service');

const handleError = (res, err, label) => {
  console.error(label, err);
  return res.status(err.status || 500).json({
    success: false,
    msg: err.status ? err.message : 'Server error'
  });
};

const createAppointment = async (req, res) => {
  try {
    const appointment = await appointmentService.createAppointment(req.user, req.body);
    return res.status(201).json({ success: true, appointment });
  } catch (err) {
    return handleError(res, err, 'Create appointment error:');
  }
};

const getAppointments = async (req, res) => {
  try {
    const appointments = await appointmentService.getAppointments(req.user);
    return res.json({ success: true, appointments });
  } catch (err) {
    return handleError(res, err, 'Fetch appointments error:');
  }
};

const updateAppointment = async (req, res) => {
  try {
    const appointment = await appointmentService.updateAppointment(req.user, req.params.id, req.body);
    return res.json({ success: true, appointment });
  } catch (err) {
    return handleError(res, err, 'Update appointment error:');
  }
};

const deleteAppointment = async (req, res) => {
  try {
    await appointmentService.deleteAppointment(req.user, req.params.id);
    return res.json({ success: true, appointmentId: req.params.id });
  } catch (err) {
    return handleError(res, err, 'Delete appointment error:');
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment
};
