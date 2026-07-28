const { CommunityEvent, EVENT_CATEGORIES } = require('./event.model');
const { toId, createServiceError, assertObjectId, parsePagination } = require('../shared/helpers');

const formatEvent = (event, user) => {
  const rsvp = event.attendees.find((a) => toId(a.userId) === toId(user?._id));
  return {
    _id: event._id,
    title: event.title,
    description: event.description,
    category: event.category,
    organizer: event.organizerId,
    forumId: event.forumId,
    isVirtual: event.isVirtual,
    meetingLink: event.meetingLink,
    location: event.location,
    startAt: event.startAt,
    endAt: event.endAt,
    capacity: event.capacity,
    attendeeCount: event.attendees.filter((a) => a.status === 'going').length,
    interestedCount: event.attendees.filter((a) => a.status === 'interested').length,
    myRsvpStatus: rsvp?.status || null,
    isCancelled: event.isCancelled,
    isFull: event.capacity ? event.attendees.filter((a) => a.status === 'going').length >= event.capacity : false,
    createdAt: event.createdAt
  };
};

const getEventCategories = () => EVENT_CATEGORIES;

const listEvents = async (user, query = {}) => {
  const { category, search, when, mine } = query;
  const filter = { isCancelled: false };

  if (category && EVENT_CATEGORIES.includes(category)) filter.category = category;
  if (search) filter.$text = { $search: search };
  if (mine === 'true') filter['attendees.userId'] = user._id;

  if (when === 'past') {
    filter.startAt = { $lt: new Date() };
  } else {
    // default: upcoming only, discovery should surface what a senior can still attend
    filter.startAt = { $gte: new Date() };
  }

  const events = await CommunityEvent.find(filter)
    .populate('organizerId', 'name role')
    .sort({ startAt: when === 'past' ? -1 : 1 })
    .limit(100);

  return events.map((event) => formatEvent(event, user));
};

const createEvent = async (user, data) => {
  const title = String(data.title || '').trim();
  if (!title) throw createServiceError(400, 'Event title is required');
  if (!data.startAt || Number.isNaN(new Date(data.startAt).getTime())) {
    throw createServiceError(400, 'A valid start date/time is required');
  }
  if (data.category && !EVENT_CATEGORIES.includes(data.category)) {
    throw createServiceError(400, 'Invalid category');
  }
  const isVirtual = Boolean(data.isVirtual);
  if (isVirtual && !String(data.meetingLink || '').trim()) {
    throw createServiceError(400, 'A meeting link is required for virtual events');
  }

  const event = await CommunityEvent.create({
    title,
    description: String(data.description || '').trim(),
    category: data.category || 'social',
    organizerId: user._id,
    forumId: data.forumId || null,
    isVirtual,
    meetingLink: isVirtual ? String(data.meetingLink).trim() : '',
    location: isVirtual ? {} : {
      address: String(data.location?.address || '').trim(),
      lat: data.location?.lat ?? null,
      lng: data.location?.lng ?? null
    },
    startAt: new Date(data.startAt),
    endAt: data.endAt ? new Date(data.endAt) : null,
    capacity: data.capacity ? Number(data.capacity) : null,
    attendees: [{ userId: user._id, status: 'going' }]
  });
  await event.populate('organizerId', 'name role');

  return formatEvent(event, user);
};

const getEventOrThrow = async (eventId) => {
  assertObjectId(eventId, 'eventId');
  const event = await CommunityEvent.findById(eventId).populate('organizerId', 'name role');
  if (!event) throw createServiceError(404, 'Event not found');
  return event;
};

const getEventById = async (eventId, user) => {
  const event = await getEventOrThrow(eventId);
  return formatEvent(event, user);
};

const rsvpEvent = async (eventId, user, status) => {
  if (!['going', 'interested'].includes(status)) {
    throw createServiceError(400, 'RSVP status must be "going" or "interested"');
  }
  const event = await getEventOrThrow(eventId);
  if (event.isCancelled) throw createServiceError(400, 'This event was cancelled');

  const goingCount = event.attendees.filter((a) => a.status === 'going').length;
  const alreadyGoing = event.attendees.some((a) => toId(a.userId) === toId(user._id) && a.status === 'going');
  if (status === 'going' && event.capacity && goingCount >= event.capacity && !alreadyGoing) {
    throw createServiceError(400, 'This event is full');
  }

  event.attendees = event.attendees.filter((a) => toId(a.userId) !== toId(user._id));
  event.attendees.push({ userId: user._id, status });
  await event.save();

  return formatEvent(event, user);
};

const cancelRsvp = async (eventId, user) => {
  const event = await getEventOrThrow(eventId);
  event.attendees = event.attendees.filter((a) => toId(a.userId) !== toId(user._id));
  await event.save();
  return formatEvent(event, user);
};

const cancelEvent = async (eventId, user) => {
  const event = await getEventOrThrow(eventId);
  if (toId(event.organizerId) !== toId(user._id)) {
    throw createServiceError(403, 'Only the organizer can cancel this event');
  }
  event.isCancelled = true;
  await event.save();
  return { cancelled: true };
};

module.exports = {
  getEventCategories,
  listEvents,
  createEvent,
  getEventById,
  rsvpEvent,
  cancelRsvp,
  cancelEvent
};
