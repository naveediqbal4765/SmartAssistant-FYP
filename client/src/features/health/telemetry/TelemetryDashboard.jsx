import HealthPlaceholder from '../components/HealthPlaceholder';
import IoTDashboard from '../iot/components/IoTDashboard';

export default function TelemetryDashboard() {
  return (
    <HealthPlaceholder title="Telemetry Dashboard">
      <IoTDashboard />
    </HealthPlaceholder>
  );
}
