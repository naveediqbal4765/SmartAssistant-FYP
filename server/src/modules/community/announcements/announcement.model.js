const mongoose = require('mongoose');

const ANNOUNCEMENT_CATEGORIES = ['general', 'health_safety', 'event', 'volunteer', 'system'];
const AUDIENCES = ['all', 'elder', 'caregiver', 'volunteer'];

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    category: { type: String, enum: ANNOUNCEMENT_CATEGORIES, default: 'general' },
    audience: { type: String, enum: AUDIENCES, default: 'all' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pinned: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    readBy: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] }
  },
  { timestamps: true }
);

announcementSchema.index({ audience: 1, pinned: -1, createdAt: -1 });

const CommunityAnnouncement = mongoose.models.CommunityAnnouncement
  || mongoose.model('CommunityAnnouncement', announcementSchema);

module.exports = { CommunityAnnouncement, ANNOUNCEMENT_CATEGORIES, AUDIENCES };
