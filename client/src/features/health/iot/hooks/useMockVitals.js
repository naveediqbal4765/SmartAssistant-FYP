import { useEffect, useMemo, useState } from 'react';
import { createVitalsSnapshot } from '../types/vitals.contract';

const MOCK_INTERVAL_MS = 3500;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randomDelta = (range) => (Math.random() * range * 2) - range;
const roundOne = (value) => Math.round(value * 10) / 10;

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

const createInitialVitals = ({ deviceId, seniorId }) => createVitalsSnapshot({
  deviceId,
  seniorId,
  heartRate: 74,
  systolic: 122,
  diastolic: 78,
  oxygenLevel: 98,
  temperature: 36.8
});

const fluctuateVitals = (previous) => createVitalsSnapshot({
  deviceId: previous.deviceId,
  seniorId: previous.seniorId,
  heartRate: Math.round(clamp(previous.vitals.heartRate + randomDelta(3), 58, 105)),
  systolic: Math.round(clamp(previous.vitals.bloodPressure.systolic + randomDelta(4), 105, 145)),
  diastolic: Math.round(clamp(previous.vitals.bloodPressure.diastolic + randomDelta(3), 65, 95)),
  oxygenLevel: Math.round(clamp(previous.vitals.oxygenLevel + randomDelta(1.2), 94, 100)),
  temperature: roundOne(clamp(previous.vitals.temperature + randomDelta(0.15), 36.1, 37.6))
});

export default function useMockVitals() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const seniorId = currentUser.linkedSeniorId || currentUser._id || currentUser.id || 'simulated-senior';
  const deviceId = `sim-device-${String(seniorId).slice(-6) || '001'}`;
  const [vitalsSnapshot, setVitalsSnapshot] = useState(() => createInitialVitals({ deviceId, seniorId }));

  useEffect(() => {
    const intervalId = setInterval(() => {
      setVitalsSnapshot((current) => fluctuateVitals(current));
    }, MOCK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return vitalsSnapshot;
}
