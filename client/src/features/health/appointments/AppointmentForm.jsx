import { useEffect, useState } from 'react';

const emptyForm = {
  title: '',
  date: '',
  time: '',
  notes: ''
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (date) => (
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
);

const getAppointmentDateTime = ({ date, time }) => {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
};

const isAppointmentInFuture = (form) => {
  const appointmentTime = getAppointmentDateTime(form);
  return appointmentTime && appointmentTime > new Date();
};

export default function AppointmentForm({
  selectedDate,
  editingAppointment = null,
  onCancelEdit,
  onSubmit,
  submitting = false
}) {
  const [form, setForm] = useState({ ...emptyForm, date: selectedDate || '' });
  const [dateTimeError, setDateTimeError] = useState('');
  const now = new Date();
  const minDate = toDateInputValue(now);
  const minTime = form.date === minDate ? toTimeInputValue(now) : undefined;

  useEffect(() => {
    if (editingAppointment) {
      setForm({
        title: editingAppointment.title || '',
        date: editingAppointment.date || selectedDate || '',
        time: editingAppointment.time || '',
        notes: editingAppointment.notes || ''
      });
      return;
    }

    setForm((current) => ({ ...current, date: selectedDate || '' }));
  }, [editingAppointment, selectedDate]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDateTimeError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!isAppointmentInFuture(form)) {
      setDateTimeError('Appointment must be set in the future');
      return;
    }

    const saved = await onSubmit?.(form);
    if (saved && !editingAppointment) {
      setForm({ ...emptyForm, date: selectedDate || '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="motion-card rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {editingAppointment ? 'Edit Appointment' : 'Add Appointment'}
        </h2>
        <p className="text-sm text-gray-500">Create a simple appointment for the selected date.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <input
          value={form.title}
          onChange={(event) => handleChange('title', event.target.value)}
          disabled={submitting}
          placeholder="Appointment title"
          className="rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
        />
        <label className="text-sm font-semibold text-brand-primary">
          Date
          <input
            type="date"
            value={form.date}
            onChange={(event) => handleChange('date', event.target.value)}
            disabled={submitting}
            min={minDate}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 font-normal text-gray-900 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
          />
        </label>
        <label className="text-sm font-semibold text-brand-primary">
          Time
          <input
            type="time"
            value={form.time}
            onChange={(event) => handleChange('time', event.target.value)}
            disabled={submitting}
            min={minTime}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 font-normal text-gray-900 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
          />
        </label>
      </div>

      {dateTimeError && (
        <p className="mt-2 text-sm font-semibold text-red-600">{dateTimeError}</p>
      )}

      <textarea
        value={form.notes}
        onChange={(event) => handleChange('notes', event.target.value)}
        disabled={submitting}
        placeholder="Notes (optional)"
        rows={3}
        className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting || !form.title.trim() || !form.date.trim() || !form.time.trim()}
          className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Saving...' : editingAppointment ? 'Update Appointment' : 'Add Appointment'}
        </button>
        {editingAppointment && (
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={submitting}
            className="rounded-xl bg-gray-200 px-5 py-3 font-semibold text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
