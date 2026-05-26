import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const SYNC_INTERVAL_MS = 60 * 1000;
const MIN_MOVEMENT_METERS = 50;
const EARTH_RADIUS_METERS = 6371000;

const toRadians = (value) => (value * Math.PI) / 180;

const getStoredCoordinates = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [lng, lat] = user.location?.coordinates || [];

    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return null;
    }

    if (Number(lat) === 0 && Number(lng) === 0) {
      return null;
    }

    return { latitude: Number(lat), longitude: Number(lng), location: user.location };
  } catch {
    return null;
  }
};

const updateStoredUserLocation = (location) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...user, location }));
  } catch {
    // Local storage updates are best-effort.
  }
};

const calculateDistanceMeters = (from, to) => {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  });

export default function useAutoLocationSync({ enabled, latestLocation }) {
  const stored = getStoredCoordinates();
  const [syncedLocation, setSyncedLocation] = useState(stored?.location || null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const lastSentRef = useRef(stored ? {
    latitude: stored.latitude,
    longitude: stored.longitude
  } : null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (latestLocation) {
      setSyncedLocation(latestLocation);
      const [lng, lat] = latestLocation.coordinates || [];
      if (
        Number.isFinite(Number(lat)) &&
        Number.isFinite(Number(lng)) &&
        !(Number(lat) === 0 && Number(lng) === 0)
      ) {
        lastSentRef.current = {
          latitude: Number(lat),
          longitude: Number(lng)
        };
      }
    }
  }, [latestLocation]);

  const syncOnce = useCallback(async () => {
    if (!enabled || permissionDenied || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setSyncing(true);

    try {
      const position = await getCurrentPosition();
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      const lastSent = lastSentRef.current;
      const shouldSync =
        !lastSent ||
        calculateDistanceMeters(lastSent, current) >= MIN_MOVEMENT_METERS;

      if (!shouldSync) {
        return;
      }

      const response = await axios.put(
        'http://localhost:5000/api/user/location',
        current,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const nextLocation = response.data.location;
      lastSentRef.current = current;
      setSyncedLocation(nextLocation);
      updateStoredUserLocation(nextLocation);
      setLastSyncAt(new Date());
    } catch (err) {
      if (err.code === 1) {
        setPermissionDenied(true);
      }
      // Other failures wait until the next scheduled interval.
    } finally {
      inFlightRef.current = false;
      setSyncing(false);
    }
  }, [enabled, permissionDenied]);

  useEffect(() => {
    if (!enabled || permissionDenied) {
      return undefined;
    }

    syncOnce();
    const intervalId = window.setInterval(syncOnce, SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, permissionDenied, syncOnce]);

  return {
    syncedLocation,
    syncing,
    permissionDenied,
    lastSyncAt
  };
}
