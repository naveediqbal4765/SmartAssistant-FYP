const mongoose = require('mongoose');

const autoReplySettingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    smartSuggestionsEnabled: { type: Boolean, default: true },
    awayReplyEnabled: { type: Boolean, default: false },
    awayMessage: {
      type: String,
      default: "Thanks for your message! I'll get back to you as soon as I can.",
      maxlength: 300
    },
    offlineDelayMinutes: { type: Number, default: 15, min: 1, max: 240 }
  },
  { timestamps: true }
);

module.exports = mongoose.models.AutoReplySettings || mongoose.model('AutoReplySettings', autoReplySettingsSchema);
