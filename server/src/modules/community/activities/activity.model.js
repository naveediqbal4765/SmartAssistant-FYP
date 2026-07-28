const mongoose = require('mongoose');

const ACTIVITY_TYPES = [
  'chair_yoga',
  'meditation',
  'bingo',
  'book_club',
  'sing_along',
  'trivia',
  'coffee_chat',
  'light_exercise',
  'other'
];

const RECURRENCE_OPTIONS = ['once', 'daily', 'weekly'];

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    activityType: { type: String, enum: ACTIVITY_TYPES, default: 'other' },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    forumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum', default: null },
    meetingLink: { type: String, required: true, trim: true },
    recurrence: { type: String, enum: RECURRENCE_OPTIONS, default: 'once' },
    dayOfWeek: { type: Number, min: 0, max: 6, default: null },
    startAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30, min: 5, max: 240 },
    participants: { type: [participantSchema], default: [] },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

activitySchema.index({ startAt: 1 });

const GroupActivity = mongoose.models.GroupActivity || mongoose.model('GroupActivity', activitySchema);

module.exports = { GroupActivity, ACTIVITY_TYPES, RECURRENCE_OPTIONS };
