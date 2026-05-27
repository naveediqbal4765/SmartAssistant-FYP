export const VITALS_SOURCE_MODE = {
  MOCK: 'mock',
  API: 'api',
  WEBSOCKET: 'websocket',
  DEVICE: 'device'
};

export const createVitalsSnapshot = ({
  deviceId,
  seniorId,
  timestamp = new Date().toISOString(),
  heartRate,
  systolic,
  diastolic,
  oxygenLevel,
  temperature,
  activityStatus = 'Waiting'
}) => ({
  deviceId,
  seniorId,
  timestamp,
  vitals: {
    heartRate,
    bloodPressure: {
      systolic,
      diastolic
    },
    oxygenLevel,
    temperature,
    activityStatus
  }
});

export const isValidVitalsSnapshot = (snapshot) => Boolean(
  snapshot?.deviceId
  && snapshot?.seniorId
  && snapshot?.timestamp
  && typeof snapshot?.vitals?.heartRate === 'number'
  && typeof snapshot?.vitals?.bloodPressure?.systolic === 'number'
  && typeof snapshot?.vitals?.bloodPressure?.diastolic === 'number'
  && typeof snapshot?.vitals?.oxygenLevel === 'number'
  && typeof snapshot?.vitals?.temperature === 'number'
  && typeof snapshot?.vitals?.activityStatus === 'string'
);
