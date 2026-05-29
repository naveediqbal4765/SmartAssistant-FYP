const locationService = require('./location.service');

const EARTH_RADIUS_METERS = 6371000;

const toNumber = (value) => Number(value);

const isValidLatitude = (value) =>
  Number.isFinite(value) && value >= -90 && value <= 90;

const isValidLongitude = (value) =>
  Number.isFinite(value) && value >= -180 && value <= 180;

const toRadians = (value) => (value * Math.PI) / 180;

const calculateDistanceMeters = (from, to) => {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const resolveRequestLocation = (req) => {
  const queryLat = req.query.lat;
  const queryLng = req.query.lng;

  if (queryLat !== undefined || queryLng !== undefined) {
    const lat = toNumber(queryLat);
    const lng = toNumber(queryLng);
    return isValidLatitude(lat) && isValidLongitude(lng) ? { lat, lng } : null;
  }

  const [lng, lat] = req.user.location?.coordinates || [];
  if (!isValidLatitude(toNumber(lat)) || !isValidLongitude(toNumber(lng))) {
    return null;
  }

  if (Number(lat) === 0 && Number(lng) === 0) {
    return null;
  }

  return { lat: Number(lat), lng: Number(lng) };
};

const serializeVolunteer = (volunteer, origin) => {
  const [lng, lat] = volunteer.location?.coordinates || [];
  const distanceMeters = calculateDistanceMeters(origin, {
    lat: Number(lat),
    lng: Number(lng)
  });

  return {
    _id: volunteer._id,
    name: volunteer.name,
    role: volunteer.role,
    location: {
      lat: Number(lat),
      lng: Number(lng)
    },
    distance: {
      meters: Math.round(distanceMeters),
      km: Number((distanceMeters / 1000).toFixed(2))
    }
  };
};

const getNearbyVolunteers = async (req, res) => {
  try {
    const origin = resolveRequestLocation(req);
    if (!origin) {
      return res.status(400).json({
        success: false,
        msg: 'Valid lat/lng query params or an updated user location are required'
      });
    }

    const [fallbackResult, volunteersWithin10km] = await Promise.all([
      locationService.findNearbyVolunteersWithFallback(origin.lat, origin.lng),
      locationService.findNearbyVolunteers(origin.lat, origin.lng, locationService.TEN_KM_METERS)
    ]);

    const serialized = volunteersWithin10km.map((volunteer) =>
      serializeVolunteer(volunteer, origin)
    );

    const within5km = serialized.filter(
      (volunteer) => volunteer.distance.meters <= locationService.FIVE_KM_METERS
    );
    const within10km = serialized.filter(
      (volunteer) =>
        volunteer.distance.meters > locationService.FIVE_KM_METERS &&
        volunteer.distance.meters <= locationService.TEN_KM_METERS
    );

    return res.json({
      success: true,
      origin,
      within5km,
      within10km,
      fallbackUsed: fallbackResult.radiusMeters === locationService.TEN_KM_METERS
    });
  } catch (err) {
    console.error('Nearby volunteers fetch error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

module.exports = {
  getNearbyVolunteers
};
