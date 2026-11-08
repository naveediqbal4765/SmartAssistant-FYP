const emergencyRoutingService = require('../notifications/emergencyRouting.service');
const EmergencyIncident = require('./emergencyIncident.model');
const { dispatchNotificationSafely } = require('../notifications/notification.dispatcher');
const chatService = require('../communication/chat/chat.service');
const { emitNewMessage } = require('../communication/sockets/socket.manager');
const mongoose = require('mongoose');

const getUserLocation = (user) => {
  const [lng, lat] = user.location?.coordinates || [];

  if (
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    !(Number(lat) === 0 && Number(lng) === 0)
  ) {
    return { lat: Number(lat), lng: Number(lng) };
  }

  return null;
};

const resolveSeniorId = (user, requestedSeniorId) => {
  if (user.role === 'elder') {
    return user._id;
  }

  if (
    user.role === 'caregiver' &&
    user.linkedSeniorId &&
    (!requestedSeniorId || user.linkedSeniorId.toString() === requestedSeniorId)
  ) {
    return user.linkedSeniorId;
  }

  return null;
};

const triggerEmergency = async (req, res) => {
  try {
    const seniorId = resolveSeniorId(req.user, req.body.seniorId);
    if (!seniorId) {
      return res.status(403).json({
        success: false,
        msg: 'Only seniors or linked caregivers can trigger emergency alerts'
      });
    }

    const result = await emergencyRoutingService.createEmergencyNotification({
      type: 'EMERGENCY',
      seniorId,
      location: req.body.location || getUserLocation(req.user),
      message: req.body.message || 'Emergency assistance needed',
      metadata: req.body.metadata || {}
    });

    if (!result.ok) {
      return res.status(400).json({ success: false, msg: result.msg });
    }

    return res.json({
      success: true,
      msg: 'Emergency alert routed successfully',
      routing: {
        radiusMeters: result.radiusMeters,
        volunteerCount: result.volunteerCount,
        caregiverCount: result.caregiverCount,
        recipientCount: result.recipientCount
      }
    });
  } catch (err) {
    console.error('Emergency trigger error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const buildAcceptedMessage = ({ emergencyId, volunteer }) => [
  `1 volunteer has accepted this emergency`,
  `Alert type: EMERGENCY_ACCEPTED`,
  `Timestamp: ${new Date().toISOString()}`,
  `Metadata: ${JSON.stringify({
    emergencyId,
    incidentStatus: 'ACCEPTED',
    acceptedVolunteer: volunteer
  })}`
].join('\n');

const acceptEmergency = async (req, res) => {
  try {
    if (req.user.role !== 'volunteer') {
      return res.status(403).json({
        success: false,
        msg: 'Only volunteers can accept emergency incidents'
      });
    }

    const { emergencyId } = req.body;
    if (!emergencyId) {
      return res.status(400).json({ success: false, msg: 'emergencyId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(emergencyId)) {
      return res.status(400).json({ success: false, msg: 'Valid emergencyId is required' });
    }

    const volunteer = {
      id: req.user._id,
      name: req.user.name
    };

    const acceptedAt = new Date();
    const incident = await EmergencyIncident.findOneAndUpdate(
      {
        _id: emergencyId,
        status: 'ACTIVE',
        'acceptedVolunteer.id': null
      },
      {
        $set: {
          status: 'ACCEPTED',
          acceptedVolunteer: {
            ...volunteer,
            acceptedAt
          }
        }
      },
      { new: true }
    );

    if (!incident) {
      const existingIncident = await EmergencyIncident.findById(emergencyId);
      if (!existingIncident) {
        return res.status(404).json({ success: false, msg: 'Emergency incident not found' });
      }

      return res.status(409).json({
        success: false,
        msg: 'This emergency has already been accepted',
        incident: {
          emergencyId,
          status: existingIncident.status,
          acceptedVolunteer: existingIncident.acceptedVolunteer
        }
      });
    }

    const chatMessage = await chatService.sendMessage({
      senderId: req.user._id,
      receiverId: incident.seniorId,
      message: `Hi, I’m ${req.user.name} (ID: ${req.user._id}). I’m on my way to help you.`,
      messageType: 'text'
    });
    emitNewMessage(chatMessage);

    const acceptedMessage = buildAcceptedMessage({ emergencyId, volunteer });
    const recipientIds = (incident.recipients || [])
      .map((recipient) => recipient.userId)
      .filter((userId) => userId && userId.toString() !== req.user._id.toString());

    await Promise.all(recipientIds.map((userId) => dispatchNotificationSafely({
      userId,
      type: 'system',
      title: 'Emergency accepted',
      message: acceptedMessage,
      emergencyId,
      entityType: 'emergency',
      entityId: emergencyId,
      alertType: 'EMERGENCY_ACCEPTED',
      acceptedVolunteer: volunteer,
      metadata: {
        emergencyId,
        incidentStatus: 'ACCEPTED',
        acceptedVolunteer: volunteer
      }
    })));

    return res.json({
      success: true,
      msg: `Volunteer ${req.user.name} is on the way`,
      incident: {
        emergencyId,
        status: incident.status,
        acceptedVolunteer: incident.acceptedVolunteer
      },
      chatMessage
    });
  } catch (err) {
    console.error('Emergency accept error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// Emergencies older than this are no longer offered as popups.
const ACTIVE_EMERGENCY_WINDOW_MS = 2 * 60 * 60 * 1000;

// Returns the still-ACTIVE emergencies this user was alerted about, so the
// accept popup can be shown again after a page reload or a late login.
const getActiveEmergencies = async (req, res) => {
  try {
    const since = new Date(Date.now() - ACTIVE_EMERGENCY_WINDOW_MS);
    const incidents = await EmergencyIncident.find({
      status: 'ACTIVE',
      'recipients.userId': req.user._id,
      createdAt: { $gte: since }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('seniorId seniorName message location status createdAt');

    return res.json({ success: true, incidents });
  } catch (err) {
    console.error('Active emergencies error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

module.exports = {
  triggerEmergency,
  acceptEmergency,
  getActiveEmergencies
};
