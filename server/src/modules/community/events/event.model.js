const mongoose = require('mongoose');

const EVENT_CATEGORIES = [
  'social',
  'health_wellness',
  'fitness',
  'education',
  'faith_spirituality',
  'arts_culture',
  'volunteering',
  'other'
];

const attendeeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['going', 'interested'], default: 'going' },
    respondedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    category: { type: String, enum: EVENT_CATEGORIES, default: 'social' },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    forumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum', default: null },
    isVirtual: { type: Boolean, default: false },
    meetingLink: { type: String, default: '', trim: true },
    location: {
      address: { type: String, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },
    capacity: { type: Number, default: null },
    attendees: { type: [attendeeSchema], default: [] },
    isCancelled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

eventSchema.index({ startAt: 1 });
eventSchema.index({ title: 'text', description: 'text' });

const CommunityEvent = mongoose.models.CommunityEvent || mongoose.model('CommunityEvent', eventSchema);

module.exports = { CommunityEvent, EVENT_CATEGORIES };
