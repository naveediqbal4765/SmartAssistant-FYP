const appointmentService = require('./appointment.service');

const getAppointmentStatus = async (req, res) => {
  const status = await appointmentService.getAppointmentModuleStatus();
  return res.json({ success: true, ...status });
};

module.exports = { getAppointmentStatus };
