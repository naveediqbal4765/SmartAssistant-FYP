import { useCallback, useEffect, useMemo, useState } from 'react';
import MedicationList from './MedicationList';
import MedicationForm from './MedicationForm';
import HealthPlaceholder from '../components/HealthPlaceholder';
import { SENIOR_REMINDERS_REFRESH_EVENT } from '../reminders/GlobalSeniorReminderPopups';
import { getChatSocket } from '../../communication/chat/services/socket';
import { useDialog } from '../../../components/ui/GlobalDialogProvider';
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

const MEDICATION_STATUS_UPDATED_EVENT = 'MEDICATION_REMINDER_STATUS_UPDATED';
const CAREGIVER_MEDICATION_POLL_MS = 15000;

const mergeMedicationReminderStatus = (medications, payload = {}) => {
  const medicationId = String(payload.medicationId || payload.reminder?.medicationId || '');
  const occurrence = payload.reminder;

  if (!medicationId || !occurrence?.occurrenceKey) return medications;

  let matched = false;
  const nextMedications = medications.map((medication) => {
    if (String(medication._id) !== medicationId) return medication;

    matched = true;
    let occurrenceMatched = false;
    const reminderOccurrences = (medication.reminderOccurrences || []).map((item) => {
      if (item.occurrenceKey !== occurrence.occurrenceKey) return item;
      occurrenceMatched = true;
      return { ...item, ...occurrence };
    });

    return {
      ...medication,
      reminderOccurrences: occurrenceMatched
        ? reminderOccurrences
        : [...reminderOccurrences, occurrence]
    };
  });

  return matched ? nextMedications : medications;
};

export default function MedicationPage() {
  const dialog = useDialog();
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

  useEffect(() => {
    if (!isCaregiver) return undefined;

    const socket = getChatSocket();
    const handleMedicationStatusUpdated = (payload) => {
      setMedications((current) => mergeMedicationReminderStatus(current, payload));
    };

    socket.on(MEDICATION_STATUS_UPDATED_EVENT, handleMedicationStatusUpdated);
    return () => socket.off(MEDICATION_STATUS_UPDATED_EVENT, handleMedicationStatusUpdated);
  }, [isCaregiver]);

  useEffect(() => {
    if (!isCaregiver) return undefined;

    const intervalId = window.setInterval(async () => {
      try {
        const data = await fetchMedications();
        setMedications(data);
      } catch (err) {
        console.error('Failed to refresh caregiver medication status:', err);
      }
    }, CAREGIVER_MEDICATION_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [isCaregiver]);

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
        window.dispatchEvent(new Event(SENIOR_REMINDERS_REFRESH_EVENT));
      } else {
        const created = await createMedication(payload);
        setMedications((current) => [created, ...current]);
        window.dispatchEvent(new Event(SENIOR_REMINDERS_REFRESH_EVENT));
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
    const confirmed = await dialog.showConfirm({
      title: 'Delete medication?',
      message: `Delete ${medication.name}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    setDeletingId(medication._id);
    setError('');

    try {
      await deleteMedication(medication._id);
      setMedications((current) => current.filter((item) => item._id !== medication._id));
      window.dispatchEvent(new Event(SENIOR_REMINDERS_REFRESH_EVENT));
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
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-brand-primary">
            Caregiver view only. You can view the assigned senior&apos;s medications but cannot edit them.
          </div>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-brand-primary">Medication List</h2>
            {loading && <span className="text-sm text-gray-500">Loading...</span>}
          </div>

          {loading ? (
            <div className="motion-card rounded-2xl bg-white p-8 text-center text-gray-500">
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
