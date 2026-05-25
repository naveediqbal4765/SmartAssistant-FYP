const vaultService = require('./vault.service');

const getHealthVaultStatus = async (req, res) => {
  const status = await vaultService.getHealthVaultModuleStatus();
  return res.json({ success: true, ...status });
};

module.exports = { getHealthVaultStatus };
