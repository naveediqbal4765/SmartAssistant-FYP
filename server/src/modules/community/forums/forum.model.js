const mongoose = require('mongoose');

const FORUM_CATEGORIES = [
  'gardening',
  'music',
  'books_reading',
  'games_puzzles',
  'walking_fitness',
  'cooking_baking',
  'arts_crafts',
  'technology',
  'faith_spirituality',
  'travel',
  'pets',
  'other'
];

const forumMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const forumSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    category: { type: String, enum: FORUM_CATEGORIES, default: 'other' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [forumMemberSchema], default: [] },
    postsCount: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

forumSchema.index({ name: 'text', description: 'text' });
forumSchema.index({ category: 1, isArchived: 1 });

const forumPostSchema = new mongoose.Schema(
  {
    forumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    imageUrl: { type: String, default: '' },
    likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    commentsCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const forumCommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true, index: true },
    forumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

const Forum = mongoose.models.Forum || mongoose.model('Forum', forumSchema);
const ForumPost = mongoose.models.ForumPost || mongoose.model('ForumPost', forumPostSchema);
const ForumComment = mongoose.models.ForumComment || mongoose.model('ForumComment', forumCommentSchema);

module.exports = { Forum, ForumPost, ForumComment, FORUM_CATEGORIES };
