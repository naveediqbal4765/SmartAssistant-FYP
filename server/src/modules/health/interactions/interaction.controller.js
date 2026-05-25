const interactionService = require('./interaction.service');

const getInteractionStatus = async (req, res) => {
  const status = await interactionService.getInteractionModuleStatus();
  return res.json({ success: true, ...status });
};

const checkInteractions = async (req, res) => {
  try {
    const medications = Array.isArray(req.body?.medications) ? req.body.medications : [];
    const result = interactionService.checkInteractions(medications);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('Drug interaction check error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Failed to check drug interactions'
    });
  }
};

module.exports = {
  getInteractionStatus,
  checkInteractions
};
