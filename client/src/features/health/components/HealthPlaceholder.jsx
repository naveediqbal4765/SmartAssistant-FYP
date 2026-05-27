import { useNavigate } from 'react-router-dom';
import FeatureCard from '../../../components/ui/FeatureCard';
import FeaturePage from '../../../components/ui/FeaturePage';

export default function HealthPlaceholder({ title, children }) {
  const navigate = useNavigate();

  return (
    <FeaturePage
      title={title}
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
      maxWidth="max-w-4xl"
    >
      <FeatureCard>
        {children && <div className="mt-6">{children}</div>}
      </FeatureCard>
    </FeaturePage>
  );
}
