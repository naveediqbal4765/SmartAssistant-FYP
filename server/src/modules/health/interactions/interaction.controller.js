const interactionService = require('./interaction.service');

const getInteractionStatus = async (req, res) => {
  const status = await interactionService.getInteractionModuleStatus();
  return res.json({ success: true, ...status });
};

module.exports = { getInteractionStatus };
