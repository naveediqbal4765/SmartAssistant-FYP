const { GroupActivity, ACTIVITY_TYPES, RECURRENCE_OPTIONS } = require('./activity.model');
const { toId, createServiceError, assertObjectId } = require('../shared/helpers');

const DAY_MS = 24 * 60 * 60 * 1000;

// Recurring activities store a single reference `startAt`; this derives the
// next upcoming occurrence so the UI can sort/display "starts in..." correctly.
const getNextOccurrence = (activity) => {
  const now = Date.now();
  const start = new Date(activity.startAt).getTime();

  if (activity.recurrence === 'once' || start > now) {
    return new Date(start);
  }

  if (activity.recurrence === 'daily') {
    const elapsedDays = Math.ceil((now - start) / DAY_MS);
    return new Date(start + elapsedDays * DAY_MS);
  }

  if (activity.recurrence === 'weekly') {
    const weekMs = 7 * DAY_MS;
    const elapsedWeeks = Math.ceil((now - start) / weekMs);
    return new Date(start + elapsedWeeks * weekMs);
  }

  return new Date(start);
};

const formatActivity = (activity, user) => ({
  _id: activity._id,
  title: activity.title,
  description: activity.description,
  activityType: activity.activityType,
  host: activity.hostId,
  forumId: activity.forumId,
  meetingLink: activity.meetingLink,
  recurrence: activity.recurrence,
  dayOfWeek: activity.dayOfWeek,
  durationMinutes: activity.durationMinutes,
  nextOccurrence: getNextOccurrence(activity),
  participantCount: activity.participants.length,
  isJoined: activity.participants.some((p) => toId(p.userId) === toId(user?._id)),
  isActive: activity.isActive,
  createdAt: activity.createdAt
});

const getActivityTypes = () => ACTIVITY_TYPES;

const listActivities = async (user, query = {}) => {
  const { activityType, mine } = query;
  const filter = { isActive: true };
  if (activityType && ACTIVITY_TYPES.includes(activityType)) filter.activityType = activityType;
  if (mine === 'true') filter['participants.userId'] = user._id;

  const activities = await GroupActivity.find(filter)
    .populate('hostId', 'name role')
    .sort({ startAt: 1 })
    .limit(100);

  return activities
    .map((activity) => formatActivity(activity, user))
    .sort((a, b) => new Date(a.nextOccurrence) - new Date(b.nextOccurrence));
};

const createActivity = async (user, data) => {
  const title = String(data.title || '').trim();
  if (!title) throw createServiceError(400, 'Activity title is required');
  const meetingLink = String(data.meetingLink || '').trim();
  if (!meetingLink) throw createServiceError(400, 'A meeting link is required for virtual activities');
  if (!data.startAt || Number.isNaN(new Date(data.startAt).getTime())) {
    throw createServiceError(400, 'A valid start date/time is required');
  }
  if (data.activityType && !ACTIVITY_TYPES.includes(data.activityType)) {
    throw createServiceError(400, 'Invalid activity type');
  }
  const recurrence = RECURRENCE_OPTIONS.includes(data.recurrence) ? data.recurrence : 'once';

  const activity = await GroupActivity.create({
    title,
    description: String(data.description || '').trim(),
    activityType: data.activityType || 'other',
    hostId: user._id,
    forumId: data.forumId || null,
    meetingLink,
    recurrence,
    dayOfWeek: recurrence === 'weekly' ? new Date(data.startAt).getDay() : null,
    startAt: new Date(data.startAt),
    durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : 30,
    participants: [{ userId: user._id }]
  });
  await activity.populate('hostId', 'name role');

  return formatActivity(activity, user);
};

const getActivityOrThrow = async (activityId) => {
  assertObjectId(activityId, 'activityId');
  const activity = await GroupActivity.findById(activityId).populate('hostId', 'name role');
  if (!activity) throw createServiceError(404, 'Activity not found');
  return activity;
};

const joinActivity = async (activityId, user) => {
  const activity = await getActivityOrThrow(activityId);
  if (!activity.isActive) throw createServiceError(400, 'This activity is no longer active');
  if (activity.participants.some((p) => toId(p.userId) === toId(user._id))) {
    return formatActivity(activity, user);
  }
  activity.participants.push({ userId: user._id });
  await activity.save();
  return formatActivity(activity, user);
};

const leaveActivity = async (activityId, user) => {
  const activity = await getActivityOrThrow(activityId);
  activity.participants = activity.participants.filter((p) => toId(p.userId) !== toId(user._id));
  await activity.save();
  return formatActivity(activity, user);
};

const cancelActivity = async (activityId, user) => {
  const activity = await getActivityOrThrow(activityId);
  if (toId(activity.hostId) !== toId(user._id)) {
    throw createServiceError(403, 'Only the host can cancel this activity');
  }
  activity.isActive = false;
  await activity.save();
  return { cancelled: true };
};

module.exports = {
  getActivityTypes,
  listActivities,
  createActivity,
  joinActivity,
  leaveActivity,
  cancelActivity
};
