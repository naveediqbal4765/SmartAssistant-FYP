import useVitalsSource from '../hooks/useVitalsSource';
import VitalsCard from './VitalsCard';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Waiting for data';
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export default function IoTDashboard() {
  const { vitalsSnapshot, connected, statusLabel } = useVitalsSource();
  const vitals = vitalsSnapshot?.vitals;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Live IoT Telemetry</h2>
            <p className="mt-1 text-gray-700">
              Swap-safe vitals stream using the unified vitals source abstraction.
            </p>
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-bold ${
            connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {statusLabel}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-3">
          <p><span className="font-semibold text-gray-900">Device:</span> {vitalsSnapshot?.deviceId || 'N/A'}</p>
          <p><span className="font-semibold text-gray-900">Senior:</span> {vitalsSnapshot?.seniorId || 'N/A'}</p>
          <p><span className="font-semibold text-gray-900">Updated:</span> {formatTimestamp(vitalsSnapshot?.timestamp)}</p>
        </div>
      </div>

      {vitals ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <VitalsCard
            label="Heart Rate"
            value={vitals.heartRate}
            unit="bpm"
            helperText="Simulated live pulse reading"
            tone="rose"
          />
          <VitalsCard
            label="Blood Pressure"
            value={`${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`}
            unit="mmHg"
            helperText="Simulated systolic and diastolic pressure"
            tone="blue"
          />
          <VitalsCard
            label="Oxygen Level"
            value={vitals.oxygenLevel}
            unit="%"
            helperText="Simulated blood oxygen saturation"
            tone="green"
          />
          <VitalsCard
            label="Temperature"
            value={vitals.temperature}
            unit="°C"
            helperText="Simulated body temperature"
            tone="amber"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          Waiting for vitals data...
        </div>
      )}
    </div>
  );
}
