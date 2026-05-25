const express = require('express');
const medicationRoutes = require('./medications/medication.routes');
const vaultRoutes = require('./vault/vault.routes');
const appointmentRoutes = require('./appointments/appointment.routes');
const telemetryRoutes = require('./telemetry/telemetry.routes');
const interactionRoutes = require('./interactions/interaction.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    module: 'Health & Medication',
    status: 'Feature under development'
  });
});

router.use('/medications', medicationRoutes);
router.use('/vault', vaultRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/interactions', interactionRoutes);

module.exports = router;
