const User = require('../../shared/models/User');
const EmergencyIncident = require('../emergency/emergencyIncident.model');
const locationService = require('../location/location.service');
const { dispatchNotificationSafely } = require('./notification.dispatcher');

const VALID_ALERT_TYPES = ['EMERGENCY', 'TASK'];

const toId = (value) => String(value?._id || value || '');

const toNumber = (value) => Number(value);

const normalizeAlertLocation = (location = {}) => {
  const lat = toNumber(location.latitude ?? location.lat);
  const lng = toNumber(location.longitude ?? location.lng);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return null;
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
};

const getSeniorCaregivers = async (seniorId) => {
  const senior = await User.findById(seniorId).select('linkedCaregivers');
  if (!senior?.linkedCaregivers?.length) {
    return [];
  }

  return User.find({
    _id: { $in: senior.linkedCaregivers },
    role: 'caregiver'
  }).select('name email phone role linkedSeniorId');
};

const getSeniorSummary = async (seniorId) => {
  const senior = await User.findById(seniorId).select('name role');
  if (!senior) {
    return { id: seniorId, name: 'Senior' };
  }

  return {
    id: senior._id,
    name: senior.name
  };
};

const findAllLocatedVolunteers = () =>
  User.find({
    role: 'volunteer',
    'location.coordinates': { $ne: [0, 0] }
  }).select('name email phone role location');

const getNearbyVolunteerTargets = async (location) => {
  if (!location) {
    return { radiusMeters: null, volunteers: await findAllLocatedVolunteers() };
  }

  const nearby = await locationService.findNearbyVolunteersWithFallback(location.lat, location.lng);
  if (nearby.volunteers.length) {
    return nearby;
  }

  return {
    radiusMeters: null,
    volunteers: await findAllLocatedVolunteers()
  };
};

const buildNotificationMessage = ({ type, message, location, metadata, timestamp }) => {
  const details = [
    message,
    `Alert type: ${type}`,
    `Timestamp: ${timestamp.toISOString()}`
  ];

  if (location) {
    details.push(`Location: ${location.lat}, ${location.lng}`);
  }

  if (metadata && Object.keys(metadata).length) {
    details.push(`Metadata: ${JSON.stringify(metadata)}`);
  }

  return details.join('\n');
};

const createIncidentIfNeeded = async ({ type, senior, seniorId, message, location, recipients }) => {
  if (type !== 'EMERGENCY') {
    return null;
  }

  return EmergencyIncident.create({
    seniorId,
    seniorName: senior.name,
    message,
    location: location || undefined,
    recipients: recipients.map((recipient) => ({
      userId: recipient._id,
      role: recipient.role
    }))
  });
};

const createEmergencyNotification = async (payload = {}) => {
  const { type, seniorId, message, metadata = {} } = payload;

  if (!VALID_ALERT_TYPES.includes(type)) {
    return { ok: false, msg: 'Alert type must be EMERGENCY or TASK' };
  }

  if (!seniorId || !message) {
    return { ok: false, msg: 'seniorId and message are required' };
  }

  const location = normalizeAlertLocation(payload.location);
  const [nearbyResult, caregivers, senior] = await Promise.all([
    getNearbyVolunteerTargets(location),
    getSeniorCaregivers(seniorId),
    getSeniorSummary(seniorId)
  ]);

  const recipientMap = new Map();
  nearbyResult.volunteers.forEach((volunteer) => {
    recipientMap.set(toId(volunteer), volunteer);
  });
  caregivers.forEach((caregiver) => {
    recipientMap.set(toId(caregiver), caregiver);
  });

  const timestamp = new Date();
  const notificationType = type === 'TASK' ? 'task' : 'system';
  const title = type === 'TASK' ? 'Nearby help request' : 'Emergency alert';
  const recipients = Array.from(recipientMap.values());
  const incident = await createIncidentIfNeeded({
    type,
    senior,
    seniorId,
    message,
    location,
    recipients
  });
  const fullMetadata = {
    ...metadata,
    senior,
    emergencyId: incident?._id || metadata.emergencyId || null,
    incidentStatus: incident?.status || undefined
  };
  const notificationMessage = buildNotificationMessage({
    type,
    message,
    location,
    metadata: fullMetadata,
    timestamp
  });

  const notifications = [];
  for (const recipientId of recipientMap.keys()) {
    const dispatchResult = await dispatchNotificationSafely({
      userId: recipientId,
      type: notificationType,
      title,
      message: notificationMessage,
      senior,
      taskId: metadata.taskId || null,
      emergencyId: incident?._id || null,
      entityType: incident?._id ? 'emergency' : notificationType,
      entityId: incident?._id || metadata.taskId || null,
      location,
      alertType: type,
      alertMessage: message,
      timestamp,
      metadata: fullMetadata
    });

    if (dispatchResult.ok) {
      notifications.push(dispatchResult.notification);
    }
  }

  return {
    ok: true,
    type,
    radiusMeters: nearbyResult.radiusMeters,
    volunteerCount: nearbyResult.volunteers.length,
    caregiverCount: caregivers.length,
    recipientCount: recipientMap.size,
    notifications
  };
};

module.exports = {
  createEmergencyNotification
};
