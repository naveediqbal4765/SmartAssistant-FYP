const eventService = require('./event.service');
const { asyncHandler } = require('../shared/helpers');

const getCategories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: eventService.getEventCategories() });
});

const listEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listEvents(req.user, req.query);
  res.json({ success: true, data });
});

const createEvent = asyncHandler(async (req, res) => {
  const data = await eventService.createEvent(req.user, req.body);
  res.status(201).json({ success: true, data });
});

const getEvent = asyncHandler(async (req, res) => {
  const data = await eventService.getEventById(req.params.eventId, req.user);
  res.json({ success: true, data });
});

const rsvpEvent = asyncHandler(async (req, res) => {
  const data = await eventService.rsvpEvent(req.params.eventId, req.user, req.body.status);
  res.json({ success: true, data });
});

const cancelRsvp = asyncHandler(async (req, res) => {
  const data = await eventService.cancelRsvp(req.params.eventId, req.user);
  res.json({ success: true, data });
});

const cancelEvent = asyncHandler(async (req, res) => {
  const data = await eventService.cancelEvent(req.params.eventId, req.user);
  res.json({ success: true, data });
});

module.exports = { getCategories, listEvents, createEvent, getEvent, rsvpEvent, cancelRsvp, cancelEvent };
