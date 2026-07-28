const autoReplyService = require('./autoReply.service');
const { asyncHandler } = require('../shared/helpers');

const getSettings = asyncHandler(async (req, res) => {
  const data = await autoReplyService.getSettings(req.user);
  res.json({ success: true, data });
});

const updateSettings = asyncHandler(async (req, res) => {
  const data = await autoReplyService.updateSettings(req.user, req.body);
  res.json({ success: true, data });
});

const getSuggestions = asyncHandler(async (req, res) => {
  const text = req.query.text || req.body?.text || '';
  const data = await autoReplyService.getSuggestions(req.user, text);
  res.json({ success: true, data });
});

module.exports = { getSettings, updateSettings, getSuggestions };
