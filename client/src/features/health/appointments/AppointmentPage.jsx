import { useCallback, useEffect, useMemo, useState } from 'react';
import HealthPlaceholder from '../components/HealthPlaceholder';
import AppointmentCalendar, { toDateKey } from './AppointmentCalendar';
import AppointmentForm from './AppointmentForm';
import AppointmentList from './AppointmentList';
import { SENIOR_REMINDERS_REFRESH_EVENT } from '../reminders/GlobalSeniorReminderPopups';
import { useDialog } from '../../../components/ui/GlobalDialogProvider';
import {
  createAppointment,
  deleteAppointment,
  fetchAppointments,
  getAppointmentErrorMessage,
  updateAppointment
} from './appointmentApi';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

export default function AppointmentPage() {
  const dialog = useDialog();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [clearingAll, setClearingAll] = useState(false);
  const [error, setError] = useState('');

  const role = currentUser.role;
  const isSenior = role === 'elder';
  const isCaregiver = role === 'caregiver';

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchAppointments();
      setAppointments(data);
    } catch (err) {
      setError(getAppointmentErrorMessage(err, 'Failed to load appointments'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'volunteer') {
      setLoading(false);
      return;
    }

    loadAppointments();
  }, [loadAppointments, role]);

  const selectedAppointments = appointments.filter((appointment) => appointment.date === selectedDate);

  const handleSelectDate = (dateKey) => {
    setSelectedDate(dateKey);
    setEditingAppointment(null);
  };

  const handleChangeMonth = (offset) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError('');

    try {
      if (editingAppointment?._id) {
        const updated = await updateAppointment(editingAppointment._id, payload);
        setAppointments((current) => current.map((item) => (
          item._id === updated._id ? updated : item
        )));
        setSelectedDate(updated.date);
        setEditingAppointment(null);
        window.dispatchEvent(new Event(SENIOR_REMINDERS_REFRESH_EVENT));
      } else {
        const created = await createAppointment(payload);
        setAppointments((current) => [...current, created].sort((a, b) => (
          `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
        )));
        setSelectedDate(created.date);
        window.dispatchEvent(new Event(SENIOR_REMINDERS_REFRESH_EVENT));
      }

      return true;
    } catch (err) {
      setError(getAppointmentErrorMessage(err, 'Failed to save appointment'));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (appointment) => {
    if (!appointment?._id) return;
    const confirmed = await dialog.showConfirm({
      title: 'Delete appointment?',
      message: `Delete ${appointment.title}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    setDeletingId(appointment._id);
    setError('');

    try {
      await deleteAppointment(appointment._id);
      setAppointments((current) => current.filter((item) => item._id !== appointment._id));
      window.dispatchEvent(new Event(SENIOR_REMINDERS_REFRESH_EVENT));
      if (editingAppointment?._id === appointment._id) {
        setEditingAppointment(null);
      }
    } catch (err) {
      setError(getAppointmentErrorMessage(err, 'Failed to delete appointment'));
    } finally {
      setDeletingId('');
    }
  };

  const handleClearAll = async () => {
    if (!appointments.length) return;

    const confirmed = await dialog.showConfirm({
      title: 'Clear all appointment reminders?',
      message: 'This will clear all reminders for this section',
      confirmText: 'Clear All',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    const appointmentsToDelete = appointments;
    setClearingAll(true);
    setError('');
    setAppointments([]);
    setEditingAppointment(null);

    try {
      await Promise.all(appointmentsToDelete.map((appointment) => deleteAppointment(appointment._id)));
      window.dispatchEvent(new Event(SENIOR_REMINDERS_REFRESH_EVENT));
    } catch (err) {
      setError(getAppointmentErrorMessage(err, 'Failed to clear appointment reminders'));
      loadAppointments();
    } finally {
      setClearingAll(false);
    }
  };

  if (role === 'volunteer') {
    return (
      <HealthPlaceholder title="Appointments">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
          Volunteers do not have access to appointment records.
        </div>
      </HealthPlaceholder>
    );
  }

  return (
    <HealthPlaceholder title="Appointments">
      <div className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {isCaregiver && (
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-brand-primary">
            Caregiver view only. You can view the assigned senior&apos;s appointments but cannot edit them.
          </div>
        )}

        <AppointmentCalendar
          appointments={appointments}
          selectedDate={selectedDate}
          visibleMonth={visibleMonth}
          onSelectDate={handleSelectDate}
          onChangeMonth={handleChangeMonth}
        />

        {isSenior && (
          <AppointmentForm
            selectedDate={selectedDate}
            editingAppointment={editingAppointment}
            onCancelEdit={() => setEditingAppointment(null)}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-brand-primary">Appointments for {selectedDate}</h2>
            <div className="flex items-center gap-3">
              {loading && <span className="text-sm text-gray-500">Loading...</span>}
              {isSenior && appointments.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={clearingAll}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {clearingAll ? 'Clearing...' : 'Clear All'}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="motion-card rounded-2xl bg-white p-8 text-center text-gray-500">
              Loading appointments...
            </div>
          ) : (
            <AppointmentList
              appointments={selectedAppointments}
              selectedDate={selectedDate}
              readOnly={!isSenior}
              onEdit={setEditingAppointment}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          )}
        </section>
      </div>
    </HealthPlaceholder>
  );
}
