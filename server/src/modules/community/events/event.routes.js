const express = require('express');
const auth = require('../../../middleware/auth');
const eventController = require('./event.controller');

const router = express.Router();

router.get('/categories', auth, eventController.getCategories);
router.get('/', auth, eventController.listEvents);
router.post('/', auth, eventController.createEvent);
router.get('/:eventId', auth, eventController.getEvent);
router.post('/:eventId/rsvp', auth, eventController.rsvpEvent);
router.delete('/:eventId/rsvp', auth, eventController.cancelRsvp);
router.delete('/:eventId', auth, eventController.cancelEvent);

module.exports = router;
