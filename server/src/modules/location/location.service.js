const User = require('../../shared/models/User');

const FIVE_KM_METERS = 5000;
const TEN_KM_METERS = 10000;

const toNumber = (value) => Number(value);

const isValidLatitude = (value) =>
  Number.isFinite(value) && value >= -90 && value <= 90;

const isValidLongitude = (value) =>
  Number.isFinite(value) && value >= -180 && value <= 180;

const normalizeCoordinates = ({ latitude, longitude }) => {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return null;
  }

  return { lat, lng };
};

const updateUserLocation = async (user, payload) => {
  if (!user) {
    return { status: 401, body: { success: false, msg: 'Please authenticate' } };
  }

  const coordinates = normalizeCoordinates(payload || {});
  if (!coordinates) {
    return {
      status: 400,
      body: {
        success: false,
        msg: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required'
      }
    };
  }

  user.location = {
    type: 'Point',
    coordinates: [coordinates.lng, coordinates.lat],
    lastUpdated: new Date()
  };

  await user.save();

  return {
    status: 200,
    body: {
      success: true,
      msg: 'Location updated successfully',
      location: user.location
    }
  };
};

const findNearbyVolunteers = async (lat, lng, radiusMeters = FIVE_KM_METERS) => {
  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return [];
  }

  return User.find({
    role: 'volunteer',
    'location.coordinates': { $ne: [0, 0] },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusMeters
      }
    }
  }).select('name email phone role location');
};

const findNearbyVolunteersWithFallback = async (lat, lng) => {
  const volunteersWithin5km = await findNearbyVolunteers(lat, lng, FIVE_KM_METERS);

  if (volunteersWithin5km.length) {
    return {
      radiusMeters: FIVE_KM_METERS,
      volunteers: volunteersWithin5km
    };
  }

  const volunteersWithin10km = await findNearbyVolunteers(lat, lng, TEN_KM_METERS);

  return {
    radiusMeters: TEN_KM_METERS,
    volunteers: volunteersWithin10km
  };
};

const getCaregiversForSenior = async (seniorId) => {
  if (!seniorId) {
    return [];
  }

  const senior = await User.findById(seniorId).select('linkedCaregivers');
  if (!senior?.linkedCaregivers?.length) {
    return [];
  }

  return User.find({
    _id: { $in: senior.linkedCaregivers },
    role: 'caregiver'
  }).select('name email phone role linkedSeniorId');
};

const getTargetVolunteersForAlert = async (location) => {
  const coordinates = normalizeCoordinates(location || {});
  if (!coordinates) {
    return {
      radiusMeters: null,
      volunteers: [],
      caregivers: []
    };
  }

  const [nearbyResult, caregivers] = await Promise.all([
    findNearbyVolunteersWithFallback(coordinates.lat, coordinates.lng),
    getCaregiversForSenior(location.seniorId)
  ]);

  return {
    radiusMeters: nearbyResult.radiusMeters,
    volunteers: nearbyResult.volunteers,
    caregivers
  };
};

module.exports = {
  FIVE_KM_METERS,
  TEN_KM_METERS,
  updateUserLocation,
  findNearbyVolunteers,
  findNearbyVolunteersWithFallback,
  getTargetVolunteersForAlert
};
