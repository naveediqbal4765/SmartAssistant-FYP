import useMockVitals from './useMockVitals';
import { isValidVitalsSnapshot, VITALS_SOURCE_MODE } from '../types/vitals.contract';

export default function useVitalsSource() {
  // Single swap point for future sources: API, websocket stream, or hardware device feed.
  const vitalsSnapshot = useMockVitals();
  const isValid = isValidVitalsSnapshot(vitalsSnapshot);

  return {
    vitalsSnapshot: isValid ? vitalsSnapshot : null,
    sourceMode: VITALS_SOURCE_MODE.MOCK,
    connected: isValid,
    statusLabel: isValid ? 'Device Connected (Simulated)' : 'Device Disconnected (Simulated)'
  };
}
