import HealthPlaceholder from '../components/HealthPlaceholder';
import DrugInteractionChecker from './DrugInteractionChecker';

export default function DrugInteractionPage() {
  return (
    <HealthPlaceholder title="Drug Interactions">
      <DrugInteractionChecker />
    </HealthPlaceholder>
  );
}
