import useRealtimeVitals from './useRealtimeVitals';
import { isValidVitalsSnapshot, VITALS_SOURCE_MODE } from '../types/vitals.contract';

export default function useVitalsSource(targetSeniorId = '') {
  // Single swap point for future sources: API, websocket stream, or hardware device feed.
  const vitalsSnapshot = useRealtimeVitals(targetSeniorId);
  const isValid = isValidVitalsSnapshot(vitalsSnapshot);

  return {
    vitalsSnapshot: isValid ? vitalsSnapshot : null,
    sourceMode: VITALS_SOURCE_MODE.WEBSOCKET,
    connected: isValid,
    statusLabel: isValid ? 'Live Stream Connected' : 'Waiting for Live Stream'
  };
}
