const { CommunityAnnouncement, ANNOUNCEMENT_CATEGORIES, AUDIENCES } = require('./announcement.model');
const { toId, createServiceError, assertObjectId } = require('../shared/helpers');

// Caregivers and volunteers act as community organizers who can broadcast
// announcements; seniors receive and read them. This mirrors the app's
// existing role split (elder / volunteer / caregiver) without inventing a
// new "admin" role.
const canPostAnnouncements = (user) => ['caregiver', 'volunteer'].includes(user.role);

const audienceMatches = (announcement, user) => {
  if (announcement.audience === 'all') return true;
  const role = user.role === 'senior' ? 'elder' : user.role;
  return announcement.audience === role;
};

const isActive = (announcement) => !announcement.expiresAt || new Date(announcement.expiresAt) > new Date();

const formatAnnouncement = (announcement, user) => ({
  _id: announcement._id,
  title: announcement.title,
  body: announcement.body,
  category: announcement.category,
  audience: announcement.audience,
  postedBy: announcement.postedBy,
  pinned: announcement.pinned,
  expiresAt: announcement.expiresAt,
  isActive: isActive(announcement),
  isRead: announcement.readBy.some((id) => toId(id) === toId(user._id)),
  createdAt: announcement.createdAt
});

const getCategories = () => ANNOUNCEMENT_CATEGORIES;
const getAudiences = () => AUDIENCES;

const listAnnouncements = async (user, query = {}) => {
  const { category, includeExpired } = query;
  const role = user.role === 'senior' ? 'elder' : user.role;
  const filter = { audience: { $in: ['all', role] } };
  if (category && ANNOUNCEMENT_CATEGORIES.includes(category)) filter.category = category;
  if (includeExpired !== 'true') {
    filter.$or = [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }];
  }

  const announcements = await CommunityAnnouncement.find(filter)
    .populate('postedBy', 'name role')
    .sort({ pinned: -1, createdAt: -1 })
    .limit(100);

  return announcements
    .filter((announcement) => audienceMatches(announcement, user))
    .map((announcement) => formatAnnouncement(announcement, user));
};

const createAnnouncement = async (user, data) => {
  if (!canPostAnnouncements(user)) {
    throw createServiceError(403, 'Only caregivers and volunteers can post community announcements');
  }
  const title = String(data.title || '').trim();
  const body = String(data.body || '').trim();
  if (!title || !body) throw createServiceError(400, 'Title and body are required');
  if (data.category && !ANNOUNCEMENT_CATEGORIES.includes(data.category)) {
    throw createServiceError(400, 'Invalid category');
  }
  if (data.audience && !AUDIENCES.includes(data.audience)) {
    throw createServiceError(400, 'Invalid audience');
  }

  const announcement = await CommunityAnnouncement.create({
    title,
    body,
    category: data.category || 'general',
    audience: data.audience || 'all',
    postedBy: user._id,
    pinned: Boolean(data.pinned),
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
  });
  await announcement.populate('postedBy', 'name role');

  return formatAnnouncement(announcement, user);
};

const getAnnouncementOrThrow = async (announcementId) => {
  assertObjectId(announcementId, 'announcementId');
  const announcement = await CommunityAnnouncement.findById(announcementId).populate('postedBy', 'name role');
  if (!announcement) throw createServiceError(404, 'Announcement not found');
  return announcement;
};

const markAsRead = async (announcementId, user) => {
  const announcement = await getAnnouncementOrThrow(announcementId);
  if (!announcement.readBy.some((id) => toId(id) === toId(user._id))) {
    announcement.readBy.push(user._id);
    await announcement.save();
  }
  return formatAnnouncement(announcement, user);
};

const deleteAnnouncement = async (announcementId, user) => {
  const announcement = await getAnnouncementOrThrow(announcementId);
  if (toId(announcement.postedBy) !== toId(user._id)) {
    throw createServiceError(403, 'Only the author can delete this announcement');
  }
  await announcement.deleteOne();
  return { deleted: true };
};

module.exports = {
  getCategories,
  getAudiences,
  listAnnouncements,
  createAnnouncement,
  markAsRead,
  deleteAnnouncement,
  canPostAnnouncements
};
