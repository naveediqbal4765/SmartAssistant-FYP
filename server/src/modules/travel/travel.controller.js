const mongoose = require('mongoose');
const TravelJourney = require('./models/TravelJourney');
const User = require('../../../models/User');

// ── Helpers ──────────────────────────────────────────────────────────────────

const isValidCoordinate = (coord) => {
  if (!Array.isArray(coord) || coord.length !== 2) return false;
  const [lng, lat] = coord;
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 && lng <= 180 &&
    lat >= -90 && lat <= 90
  );
};

const isValidLineString = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  return coords.every(isValidCoordinate);
};

const VALID_TRANSITIONS = {
  planned: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

// ── Create Journey ───────────────────────────────────────────────────────────

const createJourney = async (req, res) => {
  try {
    if (req.user.role !== 'elder') {
      return res.status(403).json({
        success: false,
        msg: 'Only seniors can create journeys'
      });
    }

    const {
      pickup,
      destination,
      route,
      caregiverLocationConsent
    } = req.body;

    // Validate pickup
    if (!pickup || !pickup.address || !pickup.coordinates) {
      return res.status(400).json({
        success: false,
        msg: 'Pickup address and coordinates are required'
      });
    }
    if (!isValidCoordinate(pickup.coordinates)) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid pickup coordinates. Must be [longitude, latitude]'
      });
    }

    // Validate destination
    if (!destination || !destination.address || !destination.coordinates) {
      return res.status(400).json({
        success: false,
        msg: 'Destination address and coordinates are required'
      });
    }
    if (!isValidCoordinate(destination.coordinates)) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid destination coordinates. Must be [longitude, latitude]'
      });
    }

    // Validate route
    if (!route || !route.geometry || !route.geometry.coordinates) {
      return res.status(400).json({
        success: false,
        msg: 'Route geometry is required'
      });
    }
    if (!isValidLineString(route.geometry.coordinates)) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid route geometry. Must be a LineString with at least 2 valid coordinate pairs'
      });
    }
    if (typeof route.distanceMeters !== 'number' || route.distanceMeters < 0) {
      return res.status(400).json({
        success: false,
        msg: 'Route distanceMeters must be a non-negative number'
      });
    }
    if (typeof route.estimatedDurationSeconds !== 'number' || route.estimatedDurationSeconds < 0) {
      return res.status(400).json({
        success: false,
        msg: 'Route estimatedDurationSeconds must be a non-negative number'
      });
    }

    const journey = await TravelJourney.create({
      seniorId: req.user._id,
      pickup: {
        address: pickup.address,
        coordinates: {
          type: 'Point',
          coordinates: pickup.coordinates
        }
      },
      destination: {
        address: destination.address,
        coordinates: {
          type: 'Point',
          coordinates: destination.coordinates
        }
      },
      route: {
        geometry: {
          type: 'LineString',
          coordinates: route.geometry.coordinates
        },
        distanceMeters: route.distanceMeters,
        estimatedDurationSeconds: route.estimatedDurationSeconds
      },
      caregiverLocationConsent: !!caregiverLocationConsent,
      status: 'planned'
    });

    return res.status(201).json({
      success: true,
      msg: 'Journey created successfully',
      journey
    });
  } catch (err) {
    console.error('Create journey error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// ── List Journeys ────────────────────────────────────────────────────────────

const listJourneys = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {
      seniorId: req.user._id,
      // Exclude journeys hidden by the current user
      historyHiddenBy: { $ne: req.user._id }
    };
    if (status && ['planned', 'active', 'completed', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const [journeys, total] = await Promise.all([
      TravelJourney.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-route.geometry.coordinates'),
      TravelJourney.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      journeys,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('List journeys error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// ── Get Journey Details ──────────────────────────────────────────────────────

const getJourney = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Invalid journey ID' });
    }

    const journey = await TravelJourney.findById(id);
    if (!journey) {
      return res.status(404).json({ success: false, msg: 'Journey not found' });
    }

    // Senior owner can always view
    if (journey.seniorId.toString() === req.user._id.toString()) {
      return res.json({ success: true, journey });
    }

    // Caregiver can view only if journey is active and consent is granted
    if (req.user.role === 'caregiver') {
      const caregiver = await User.findById(req.user._id);
      if (
        caregiver &&
        caregiver.linkedSeniorId &&
        caregiver.linkedSeniorId.toString() === journey.seniorId.toString()
      ) {
        if (journey.status !== 'active') {
          return res.status(403).json({
            success: false,
            msg: 'Caregivers can only view active journeys'
          });
        }
        if (!journey.caregiverLocationConsent) {
          return res.status(403).json({
            success: false,
            msg: 'Senior has not granted location sharing consent for this journey'
          });
        }
        return res.json({ success: true, journey });
      }
    }

    return res.status(403).json({
      success: false,
      msg: 'You do not have permission to view this journey'
    });
  } catch (err) {
    console.error('Get journey error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// ── Start Journey ────────────────────────────────────────────────────────────

const startJourney = async (req, res) => {
  try {
    if (req.user.role !== 'elder') {
      return res.status(403).json({
        success: false,
        msg: 'Only seniors can start journeys'
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Invalid journey ID' });
    }

    // Atomic check: no other active journey for this senior
    const existingActive = await TravelJourney.findOne({
      seniorId: req.user._id,
      status: 'active'
    });

    if (existingActive) {
      return res.status(409).json({
        success: false,
        msg: 'You already have an active journey. Complete or cancel it first.',
        activeJourneyId: existingActive._id
      });
    }

    // Atomic transition: planned → active (only if still planned)
    let journey;
    try {
      journey = await TravelJourney.findOneAndUpdate(
        {
          _id: id,
          seniorId: req.user._id,
          status: 'planned'
        },
        {
          $set: {
            status: 'active',
            startedAt: new Date(),
            currentLocation: {
              type: 'Point',
              coordinates: req.body.currentLocation || null
            },
            lastLocationUpdateAt: req.body.currentLocation ? new Date() : null
          }
        },
        { new: true }
      );
    } catch (dbErr) {
      // Partial unique index violation: another active journey was created concurrently
      if (dbErr.code === 11000) {
        return res.status(409).json({
          success: false,
          msg: 'You already have an active journey. Complete or cancel it first.'
        });
      }
      throw dbErr;
    }

    if (!journey) {
      const existing = await TravelJourney.findOne({
        _id: id,
        seniorId: req.user._id
      });
      if (!existing) {
        return res.status(404).json({ success: false, msg: 'Journey not found' });
      }
      return res.status(409).json({
        success: false,
        msg: `Cannot start journey with status '${existing.status}'`
      });
    }

    return res.json({
      success: true,
      msg: 'Journey started',
      journey
    });
  } catch (err) {
    console.error('Start journey error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// ── Update Location ──────────────────────────────────────────────────────────

const updateLocation = async (req, res) => {
  try {
    if (req.user.role !== 'elder') {
      return res.status(403).json({
        success: false,
        msg: 'Only seniors can update journey location'
      });
    }

    const { id } = req.params;
    const { coordinates } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Invalid journey ID' });
    }

    if (!coordinates || !isValidCoordinate(coordinates)) {
      return res.status(400).json({
        success: false,
        msg: 'Valid coordinates [longitude, latitude] are required'
      });
    }

    const journey = await TravelJourney.findOneAndUpdate(
      {
        _id: id,
        seniorId: req.user._id,
        status: 'active'
      },
      {
        $set: {
          currentLocation: {
            type: 'Point',
            coordinates
          },
          lastLocationUpdateAt: new Date()
        }
      },
      { new: true }
    );

    if (!journey) {
      const existing = await TravelJourney.findOne({
        _id: id,
        seniorId: req.user._id
      });
      if (!existing) {
        return res.status(404).json({ success: false, msg: 'Journey not found' });
      }
      return res.status(409).json({
        success: false,
        msg: `Cannot update location for journey with status '${existing.status}'`
      });
    }

    return res.json({
      success: true,
      msg: 'Location updated',
      journey
    });
  } catch (err) {
    console.error('Update location error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// ── Complete Journey ─────────────────────────────────────────────────────────

const completeJourney = async (req, res) => {
  try {
    if (req.user.role !== 'elder') {
      return res.status(403).json({
        success: false,
        msg: 'Only seniors can complete journeys'
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Invalid journey ID' });
    }

    const journey = await TravelJourney.findOneAndUpdate(
      {
        _id: id,
        seniorId: req.user._id,
        status: 'active'
      },
      {
        $set: {
          status: 'completed',
          completedAt: new Date()
        }
      },
      { new: true }
    );

    if (!journey) {
      const existing = await TravelJourney.findOne({
        _id: id,
        seniorId: req.user._id
      });
      if (!existing) {
        return res.status(404).json({ success: false, msg: 'Journey not found' });
      }
      return res.status(409).json({
        success: false,
        msg: `Cannot complete journey with status '${existing.status}'`
      });
    }

    return res.json({
      success: true,
      msg: 'Journey completed',
      journey
    });
  } catch (err) {
    console.error('Complete journey error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// ── Cancel Journey ───────────────────────────────────────────────────────────

const cancelJourney = async (req, res) => {
  try {
    if (req.user.role !== 'elder') {
      return res.status(403).json({
        success: false,
        msg: 'Only seniors can cancel journeys'
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Invalid journey ID' });
    }

    const journey = await TravelJourney.findOneAndUpdate(
      {
        _id: id,
        seniorId: req.user._id,
        status: { $in: ['planned', 'active'] }
      },
      {
        $set: {
          status: 'cancelled',
          completedAt: new Date()
        }
      },
      { new: true }
    );

    if (!journey) {
      const existing = await TravelJourney.findOne({
        _id: id,
        seniorId: req.user._id
      });
      if (!existing) {
        return res.status(404).json({ success: false, msg: 'Journey not found' });
      }
      return res.status(409).json({
        success: false,
        msg: `Cannot cancel journey with status '${existing.status}'`
      });
    }

    return res.json({
      success: true,
      msg: 'Journey cancelled',
      journey
    });
  } catch (err) {
    console.error('Cancel journey error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// ── Get Caregiver's Journeys (List) ──────────────────────────────────────────

const getCaregiverJourneys = async (req, res) => {
  try {
    // Only caregivers can access this endpoint
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({
        success: false,
        msg: 'Only caregivers can access this endpoint'
      });
    }

    // Get caregiver and verify linked senior
    const caregiver = await User.findById(req.user._id);
    if (!caregiver || !caregiver.linkedSeniorId) {
      return res.status(400).json({
        success: false,
        msg: 'You are not linked to a senior'
      });
    }

    const { status, limit = 20, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Exclude journeys hidden by the caregiver
    const filter = {
      seniorId: caregiver.linkedSeniorId,
      historyHiddenBy: { $ne: req.user._id }
    };
    if (status && ['planned', 'active', 'completed', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const [journeys, total] = await Promise.all([
      TravelJourney.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      TravelJourney.countDocuments(filter)
    ]);

    // Sanitize: remove live GPS coordinates unless journey is active with consent
    const sanitizedJourneys = journeys.map((journey) => {
      const journeyObj = journey.toObject();

      const isActiveWithConsent =
        journeyObj.status === 'active' && journeyObj.caregiverLocationConsent === true;

      if (!isActiveWithConsent) {
        // Remove current location for non-active or non-consent journeys
        journeyObj.currentLocation = null;
        journeyObj.lastLocationUpdateAt = null;
      }

      return journeyObj;
    });

    return res.json({
      success: true,
      journeys: sanitizedJourneys,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get caregiver journeys error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// ── Get Caregiver's Active Journey ───────────────────────────────────────────

const getCaregiverActiveJourney = async (req, res) => {
  try {
    // Only caregivers can access this endpoint
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({
        success: false,
        msg: 'Only caregivers can access this endpoint'
      });
    }

    // Get caregiver and verify linked senior
    const caregiver = await User.findById(req.user._id);
    if (!caregiver || !caregiver.linkedSeniorId) {
      return res.status(400).json({
        success: false,
        msg: 'You are not linked to a senior'
      });
    }

    // Find active journey for linked senior with consent enabled
    const journey = await TravelJourney.findOne({
      seniorId: caregiver.linkedSeniorId,
      status: 'active',
      caregiverLocationConsent: true
    });

    if (!journey) {
      return res.json({
        success: true,
        journey: null,
        msg: 'No active journey with location sharing enabled'
      });
    }

    return res.json({
      success: true,
      journey
    });
  } catch (err) {
    console.error('Get caregiver active journey error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// ── Hide Journey from History (Soft Delete) ──────────────────────────────────

const hideJourneyFromHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Invalid journey ID' });
    }

    // Find the journey
    const journey = await TravelJourney.findById(id);
    if (!journey) {
      return res.status(404).json({ success: false, msg: 'Journey not found' });
    }

    // Verify user has access to this journey
    let hasAccess = false;

    // Senior owner
    if (journey.seniorId.toString() === req.user._id.toString()) {
      hasAccess = true;
    }

    // Linked caregiver
    if (req.user.role === 'caregiver') {
      const caregiver = await User.findById(req.user._id);
      if (
        caregiver &&
        caregiver.linkedSeniorId &&
        caregiver.linkedSeniorId.toString() === journey.seniorId.toString()
      ) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        msg: 'You do not have permission to modify this journey'
      });
    }

    // Cannot hide planned or active journeys
    if (journey.status === 'planned' || journey.status === 'active') {
      return res.status(400).json({
        success: false,
        msg: 'Cannot hide planned or active journeys from history'
      });
    }

    // Add user to historyHiddenBy if not already present
    const alreadyHidden = journey.historyHiddenBy.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!alreadyHidden) {
      await TravelJourney.findByIdAndUpdate(id, {
        $addToSet: { historyHiddenBy: req.user._id }
      });
    }

    return res.json({
      success: true,
      msg: 'Journey hidden from your history'
    });
  } catch (err) {
    console.error('Hide journey error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// ── Clear History (Hide All Completed/Cancelled) ─────────────────────────────

const clearHistory = async (req, res) => {
  try {
    let seniorId;

    // Determine whose history to clear
    if (req.user.role === 'elder') {
      seniorId = req.user._id;
    } else if (req.user.role === 'caregiver') {
      const caregiver = await User.findById(req.user._id);
      if (!caregiver || !caregiver.linkedSeniorId) {
        return res.status(400).json({
          success: false,
          msg: 'You are not linked to a senior'
        });
      }
      seniorId = caregiver.linkedSeniorId;
    } else {
      return res.status(403).json({
        success: false,
        msg: 'Only seniors and caregivers can clear history'
      });
    }

    // Find all completed/cancelled journeys for this senior that are not already hidden
    const journeys = await TravelJourney.find({
      seniorId,
      status: { $in: ['completed', 'cancelled'] },
      historyHiddenBy: { $ne: req.user._id }
    });

    if (journeys.length === 0) {
      return res.json({
        success: true,
        msg: 'No journeys to clear',
        hiddenCount: 0
      });
    }

    // Add current user to historyHiddenBy for all matching journeys
    const journeyIds = journeys.map((j) => j._id);
    await TravelJourney.updateMany(
      { _id: { $in: journeyIds } },
      { $addToSet: { historyHiddenBy: req.user._id } }
    );

    return res.json({
      success: true,
      msg: `Cleared ${journeys.length} journeys from your history`,
      hiddenCount: journeys.length
    });
  } catch (err) {
    console.error('Clear history error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

module.exports = {
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
};
