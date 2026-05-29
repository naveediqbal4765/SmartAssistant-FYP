import { useNavigate } from 'react-router-dom';
import CallReminderPanel from '../components/CallReminderPanel';
import FeaturePage from '../components/ui/FeaturePage';

export default function CallRemindersPage() {
  const navigate = useNavigate();

  return (
    <FeaturePage
      title="Call Reminders"
      description="Manage your future call alerts in one place."
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
    >
      <CallReminderPanel />
    </FeaturePage>
  );
}
