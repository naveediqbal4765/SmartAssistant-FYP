import { useEffect, useMemo, useRef, useState } from 'react';
import { getChatSocket } from '../../../communication/chat/services/socket';
import { createVitalsSnapshot } from '../types/vitals.contract';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

const normalizeBloodPressure = (bloodPressure) => {
  if (typeof bloodPressure === 'string') {
    const [systolic, diastolic] = bloodPressure.split('/').map(Number);
    return { systolic, diastolic };
  }

  return {
    systolic: Number(bloodPressure?.systolic),
    diastolic: Number(bloodPressure?.diastolic)
  };
};

const toSnapshot = (payload) => {
  const bloodPressure = normalizeBloodPressure(payload?.bloodPressure);

  return createVitalsSnapshot({
    deviceId: `sim-device-${String(payload.userId).slice(-6) || '001'}`,
    seniorId: String(payload.userId),
    timestamp: payload.updatedAt,
    heartRate: Number(payload.heartRate),
    systolic: bloodPressure.systolic,
    diastolic: bloodPressure.diastolic,
    oxygenLevel: Number(payload.oxygenLevel),
    temperature: Number(payload.temperature ?? 36.8),
    activityStatus: payload.activityStatus || 'Waiting'
  });
};

export default function useRealtimeVitals() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const targetSeniorId = String(currentUser.linkedSeniorId || currentUser._id || currentUser.id || '');
  const [vitalsSnapshot, setVitalsSnapshot] = useState(null);
  const lastPayloadRef = useRef('');

  useEffect(() => {
    if (!targetSeniorId) return undefined;

    const socket = getChatSocket();
    const handleTelemetryUpdated = (payload) => {
      if (String(payload?.userId || '') !== targetSeniorId) return;

      const nextSignature = JSON.stringify({
        userId: payload.userId,
        heartRate: payload.heartRate,
        bloodPressure: payload.bloodPressure,
        oxygenLevel: payload.oxygenLevel,
        activityStatus: payload.activityStatus,
        updatedAt: payload.updatedAt
      });

      if (nextSignature === lastPayloadRef.current) return;
      lastPayloadRef.current = nextSignature;
      setVitalsSnapshot(toSnapshot(payload));
    };

    socket.on('SENIOR_TELEMETRY_UPDATED', handleTelemetryUpdated);

    return () => {
      socket.off('SENIOR_TELEMETRY_UPDATED', handleTelemetryUpdated);
    };
  }, [targetSeniorId]);

  return vitalsSnapshot;
}
