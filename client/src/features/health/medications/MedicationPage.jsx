import { useCallback, useEffect, useMemo, useState } from 'react';
import MedicationList from './MedicationList';
import MedicationForm from './MedicationForm';
import HealthPlaceholder from '../components/HealthPlaceholder';
import {
  createMedication,
  deleteMedication,
  fetchMedications,
  getMedicationErrorMessage,
  updateMedication
} from './medicationApi';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

export default function MedicationPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [medications, setMedications] = useState([]);
  const [editingMedication, setEditingMedication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');

  const role = currentUser.role;
  const isSenior = role === 'elder';
  const isCaregiver = role === 'caregiver';

  const loadMedications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchMedications();
      setMedications(data);
    } catch (err) {
      setError(getMedicationErrorMessage(err, 'Failed to load medications'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'volunteer') {
      setLoading(false);
      return;
    }

    loadMedications();
  }, [loadMedications, role]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError('');

    try {
      if (editingMedication?._id) {
        const updated = await updateMedication(editingMedication._id, payload);
        setMedications((current) => current.map((item) => (
          item._id === updated._id ? updated : item
        )));
        setEditingMedication(null);
      } else {
        const created = await createMedication(payload);
        setMedications((current) => [created, ...current]);
      }

      return true;
    } catch (err) {
      setError(getMedicationErrorMessage(err, 'Failed to save medication'));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (medication) => {
    if (!medication?._id) return;
    if (!window.confirm(`Delete ${medication.name}?`)) return;

    setDeletingId(medication._id);
    setError('');

    try {
      await deleteMedication(medication._id);
      setMedications((current) => current.filter((item) => item._id !== medication._id));
      if (editingMedication?._id === medication._id) {
        setEditingMedication(null);
      }
    } catch (err) {
      setError(getMedicationErrorMessage(err, 'Failed to delete medication'));
    } finally {
      setDeletingId('');
    }
  };

  if (role === 'volunteer') {
    return (
      <HealthPlaceholder title="Medications">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
          Volunteers do not have access to medication records.
        </div>
      </HealthPlaceholder>
    );
  }

  return (
    <HealthPlaceholder title="Medications">
      <div className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {isSenior && (
          <MedicationForm
            editingMedication={editingMedication}
            onCancelEdit={() => setEditingMedication(null)}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}

        {isCaregiver && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-700">
            Caregiver view only. You can view the assigned senior&apos;s medications but cannot edit them.
          </div>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Medication List</h2>
            {loading && <span className="text-sm text-gray-500">Loading...</span>}
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
              Loading medications...
            </div>
          ) : (
            <MedicationList
              medications={medications}
              readOnly={!isSenior}
              onEdit={setEditingMedication}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          )}
        </section>
      </div>
    </HealthPlaceholder>
  );
}
