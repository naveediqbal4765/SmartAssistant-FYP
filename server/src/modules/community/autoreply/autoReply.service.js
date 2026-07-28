const AutoReplySettings = require('./autoReplySettings.model');
const { generateSuggestions } = require('./replySuggestionEngine');
const { createServiceError } = require('../shared/helpers');

const DEFAULTS = {
  smartSuggestionsEnabled: true,
  awayReplyEnabled: false,
  awayMessage: "Thanks for your message! I'll get back to you as soon as I can.",
  offlineDelayMinutes: 15
};

const formatSettings = (settings) => ({
  smartSuggestionsEnabled: settings?.smartSuggestionsEnabled ?? DEFAULTS.smartSuggestionsEnabled,
  awayReplyEnabled: settings?.awayReplyEnabled ?? DEFAULTS.awayReplyEnabled,
  awayMessage: settings?.awayMessage ?? DEFAULTS.awayMessage,
  offlineDelayMinutes: settings?.offlineDelayMinutes ?? DEFAULTS.offlineDelayMinutes
});

const getSettings = async (user) => {
  const settings = await AutoReplySettings.findOne({ userId: user._id });
  return formatSettings(settings);
};

const updateSettings = async (user, data) => {
  const update = {};
  if (data.smartSuggestionsEnabled !== undefined) update.smartSuggestionsEnabled = Boolean(data.smartSuggestionsEnabled);
  if (data.awayReplyEnabled !== undefined) update.awayReplyEnabled = Boolean(data.awayReplyEnabled);
  if (data.awayMessage !== undefined) {
    const message = String(data.awayMessage).trim();
    if (!message) throw createServiceError(400, 'Away message cannot be empty');
    update.awayMessage = message;
  }
  if (data.offlineDelayMinutes !== undefined) {
    const minutes = Number(data.offlineDelayMinutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      throw createServiceError(400, 'Offline delay must be between 1 and 240 minutes');
    }
    update.offlineDelayMinutes = minutes;
  }

  const settings = await AutoReplySettings.findOneAndUpdate(
    { userId: user._id },
    { $set: update, $setOnInsert: { userId: user._id } },
    { new: true, upsert: true }
  );
  return formatSettings(settings);
};

const getSuggestions = async (user, messageText) => {
  const settings = await AutoReplySettings.findOne({ userId: user._id });
  if (settings && settings.smartSuggestionsEnabled === false) return [];
  return generateSuggestions(messageText, 3);
};

// Called by the communication module when a recipient has been offline
// past their configured delay, to decide whether an away-message should be
// sent automatically on their behalf.
const getAwayReplyIfDue = async (recipientId, recipientLastSeenAt) => {
  const settings = await AutoReplySettings.findOne({ userId: recipientId });
  if (!settings || !settings.awayReplyEnabled) return null;
  if (!recipientLastSeenAt) return null;

  const offlineMinutes = (Date.now() - new Date(recipientLastSeenAt).getTime()) / 60000;
  if (offlineMinutes < settings.offlineDelayMinutes) return null;

  return settings.awayMessage;
};

module.exports = { getSettings, updateSettings, getSuggestions, getAwayReplyIfDue };
