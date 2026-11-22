const express = require('express');
const auth = require('../../middleware/auth');
const {
  createJourney,
  listJourneys,
  getJourney,
  startJourney,
  updateLocation,
  completeJourney,
  cancelJourney,
  getCaregiverActiveJourney,
  getCaregiverJourneys,
  hideJourneyFromHistory,
  clearHistory
} = require('./travel.controller');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Caregiver: get linked senior's active journey (must be before /:id)
router.get('/caregiver/active', getCaregiverActiveJourney);

// Caregiver: list linked senior's journeys (must be before /:id)
router.get('/caregiver/journeys', getCaregiverJourneys);

// Senior or caregiver: clear all completed/cancelled journeys from own history (must be before /:id)
router.post('/history/clear', clearHistory);

// Senior: create a journey
router.post('/', createJourney);

// Senior: list own journeys
router.get('/', listJourneys);

// Senior or linked caregiver: get journey details
router.get('/:id', getJourney);

// Senior: start a planned journey
router.post('/:id/start', startJourney);

// Senior: update current location during active journey
router.patch('/:id/location', updateLocation);

// Senior: complete an active journey
router.post('/:id/complete', completeJourney);

// Senior: cancel a planned or active journey
router.post('/:id/cancel', cancelJourney);

// Senior or caregiver: hide a completed/cancelled journey from own history
router.post('/:id/hide', hideJourneyFromHistory);

module.exports = router;
