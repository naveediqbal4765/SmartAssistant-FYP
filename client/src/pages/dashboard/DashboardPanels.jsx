import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  return (
    <RoleStabilityPanel
      title="Caregiver Alert Center"
      description="You receive senior emergency and task alerts through the global alert banner. Location controls stay with the senior."
    >
      {linkedSenior ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-green-200 bg-white/90 p-5 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-900">Linked Senior</h4>
            <p className="mt-3 font-semibold text-gray-900">{linkedSenior.name}</p>
            <p className="text-sm text-gray-700">{linkedSenior.email}</p>
            {linkedSenior.phone && <p className="text-sm text-gray-700">Phone: {linkedSenior.phone}</p>}
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="mt-5 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
            >
              View Senior Details
            </button>
          </div>
          <LocationStatusCard
            readOnly
            title="Senior Location Preview"
            description="Emergency routing uses the senior location. Exact coordinates appear only when exposed by profile data."
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
