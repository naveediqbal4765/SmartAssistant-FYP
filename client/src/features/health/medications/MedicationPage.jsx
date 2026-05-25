import MedicationList from './MedicationList';
import MedicationForm from './MedicationForm';
import HealthPlaceholder from '../components/HealthPlaceholder';

export default function MedicationPage() {
  return (
    <HealthPlaceholder title="Medications">
      <MedicationList />
      <MedicationForm />
    </HealthPlaceholder>
  );
}
