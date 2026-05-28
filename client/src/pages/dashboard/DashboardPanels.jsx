import CallReminderPanel from '../../components/CallReminderPanel';
import useVitalsSource from '../../features/health/iot/hooks/useVitalsSource';
import LocationStatusCard from '../../features/location/LocationStatusCard';
import NearbyVolunteers from '../../features/location/NearbyVolunteers';
import RoleStabilityPanel from './RoleStabilityPanel';

const hasUsableLocation = (location) => {
  const [lng, lat] = location?.coordinates || [];
  return Number.isFinite(Number(lat))
    && Number.isFinite(Number(lng))
    && (Number(lat) !== 0 || Number(lng) !== 0);
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Waiting for live update';
  return new Date(timestamp).toLocaleString();
};

const getReadinessStatus = ({ vitals, hasLocation }) => {
  if (!vitals) {
    return {
      label: 'Warning',
      tone: 'warning',
      detail: 'Waiting for latest telemetry snapshot.'
    };
  }

  if (
    vitals.heartRate >= 100
    || vitals.heartRate <= 55
    || vitals.oxygenLevel < 95
    || vitals.temperature >= 37.5
  ) {
    return {
      label: 'Critical',
      tone: 'critical',
      detail: 'Vitals need attention. Review the latest health signal.'
    };
  }

  if (hasLocation === false) {
    return {
      label: 'Warning',
      tone: 'warning',
      detail: 'Vitals are stable, but location readiness needs an update.'
    };
  }

  return {
    label: 'Safe',
    tone: 'safe',
    detail: 'Latest vitals are in the expected range.'
  };
};

const readinessToneClasses = {
  safe: 'border-green-200 bg-green-50 text-green-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  critical: 'border-red-200 bg-red-50 text-red-800'
};

function TelemetryReadinessCard({
  title = 'Live Health Telemetry',
  description = 'Latest available senior vitals and emergency readiness status.',
  targetSeniorId = '',
  location = undefined
}) {
  const { vitalsSnapshot, connected, statusLabel } = useVitalsSource(targetSeniorId);
  const vitals = vitalsSnapshot?.vitals;
  const hasLocation = location === undefined ? undefined : hasUsableLocation(location);
  const readiness = getReadinessStatus({ vitals, hasLocation });

  return (
    <div className="motion-card rounded-2xl border border-gray-200 bg-white/90 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-brand-primary">{title}</h3>
          <p className="mt-1 text-sm text-gray-700">{description}</p>
        </div>
        <span className={`self-start rounded-full border px-3 py-1 text-sm font-bold ${readinessToneClasses[readiness.tone]}`}>
          {readiness.label}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium text-gray-700">{readiness.detail}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-rose-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Heart Rate</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{vitals?.heartRate ?? '--'} <span className="text-sm font-semibold text-gray-500">bpm</span></p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Blood Pressure</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {vitals ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}` : '--'}
          </p>
        </div>
        <div className="rounded-xl bg-green-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Oxygen</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{vitals?.oxygenLevel ?? '--'} <span className="text-sm font-semibold text-gray-500">%</span></p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Activity</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{vitals?.activityStatus || 'Waiting'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <span className={`font-semibold ${connected ? 'text-green-700' : 'text-yellow-700'}`}>
          {statusLabel}
        </span>
        <span>Last health update: {formatTimestamp(vitalsSnapshot?.timestamp)}</span>
      </div>
    </div>
  );
}

function SeniorReadinessPanel() {
  return (
    <RoleStabilityPanel
      title="Emergency Readiness"
      description="Keep your location current and monitor nearby volunteer coverage for emergency routing."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TelemetryReadinessCard
          title="Live Health Telemetry"
          description="Your latest vitals and emergency readiness status."
        />
        <NearbyVolunteers />
      </div>
    </RoleStabilityPanel>
  );
}

function VolunteerReadinessPanel() {
  return (
    <RoleStabilityPanel
      title="Volunteer Alert Readiness"
      description="Keep your own location current so relevant emergency and task alerts can reach you."
    >
      <LocationStatusCard
        title="Volunteer Location Status"
        description="Your location powers proximity matching for emergency and task notifications."
      />
    </RoleStabilityPanel>
  );
}

function CaregiverAlertCenter({ linkedSenior }) {
  return (
    <RoleStabilityPanel
      title="Caregiver Alert Center"
      description="You receive senior emergency and task alerts through the global alert banner. Location controls stay with the senior."
    >
      {linkedSenior ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TelemetryReadinessCard
            title={`${linkedSenior.name || 'Senior'} Health Telemetry`}
            description="Latest senior vitals, health status, and emergency readiness."
            targetSeniorId={linkedSenior._id || linkedSenior.id}
            location={linkedSenior.location || null}
          />
          <LocationStatusCard
            readOnly
            title="Senior Live Location"
            description="View-only access to the senior's latest saved location. Location controls stay with the senior."
            location={linkedSenior.location || null}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-800">
          No senior is linked to this caregiver account yet.
        </div>
      )}
    </RoleStabilityPanel>
  );
}

const panelComponents = {
  callReminders: CallReminderPanel,
  seniorReadiness: SeniorReadinessPanel,
  volunteerReadiness: VolunteerReadinessPanel,
  caregiverAlertCenter: CaregiverAlertCenter
};

export default function DashboardPanels({ panels, context }) {
  return (
    <>
      {panels.map((panelKey) => {
        const Panel = panelComponents[panelKey];
        if (!Panel) return null;
        return <Panel key={panelKey} {...context} />;
      })}
    </>
  );
}
