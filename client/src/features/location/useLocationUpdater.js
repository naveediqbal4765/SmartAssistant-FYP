import { useCallback, useState } from 'react';
import axios from 'axios';

const getStoredUserLocation = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.location || null;
  } catch {
    return null;
  }
};

const updateStoredUserLocation = (location) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...user, location }));
  } catch {
    // Local storage is best-effort only; the backend update already succeeded.
  }
};

const getBrowserPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location access is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  });

export default function useLocationUpdater() {
  const [location, setLocation] = useState(getStoredUserLocation);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateLocation = useCallback(async () => {
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const position = await getBrowserPosition();
      const token = localStorage.getItem('token');

      const response = await axios.put(
        'http://localhost:5000/api/user/location',
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        },
        {
          headers: {
            Authorization: `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const nextLocation = response.data.location;
      setLocation(nextLocation);
      updateStoredUserLocation(nextLocation);
      setSuccess('Location updated successfully.');
      return nextLocation;
    } catch (err) {
      const message =
        err.response?.data?.msg ||
        err.message ||
        'Failed to update location.';
      setError(message);
      return null;
    } finally {
      setUpdating(false);
    }
  }, []);

  return {
    location,
    updating,
    error,
    success,
    updateLocation
  };
}
