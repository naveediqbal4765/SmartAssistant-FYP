import CallReminderPanel from '../../components/CallReminderPanel';
import LocationStatusCard from '../../features/location/LocationStatusCard';
import NearbyVolunteers from '../../features/location/NearbyVolunteers';
import RoleStabilityPanel from './RoleStabilityPanel';

function SeniorReadinessPanel() {
  return (
    <RoleStabilityPanel
      title="Emergency Readiness"
      description="Keep your location current and monitor nearby volunteer coverage for emergency routing."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <LocationStatusCard
          title="Senior Location Status"
          description="Update your location so emergency alerts can reach nearby volunteers and your linked caregivers."
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
        <LocationStatusCard
          readOnly
          title="Senior Live Location"
          description="View-only access to the senior's latest saved location. Location controls stay with the senior."
          location={linkedSenior.location || null}
        />
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
