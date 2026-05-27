import { useEffect, useState } from 'react';

const emptyForm = {
  name: '',
  dosage: '',
  scheduleType: 'once_daily',
  reminderTimes: [''],
  intervalHours: '8',
  daysOfWeek: [],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  notes: ''
};

const scheduleOptions = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'multiple_times_daily', label: 'Multiple times daily' },
  { value: 'interval_hours', label: 'Every set number of hours' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As needed (no reminders)' }
];

const weekdays = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

const normalizeForm = (medication = {}) => ({
  name: medication.name || '',
  dosage: medication.dosage || '',
  scheduleType: medication.scheduleType || 'once_daily',
  reminderTimes: medication.reminderTimes?.length ? medication.reminderTimes : medication.time ? [medication.time] : [''],
  intervalHours: medication.intervalHours ? String(medication.intervalHours) : '8',
  daysOfWeek: medication.daysOfWeek || [],
  startDate: medication.startDate || new Date().toISOString().slice(0, 10),
  endDate: medication.endDate || '',
  notes: medication.notes || ''
});

export default function MedicationForm({
  disabled = false,
  editingMedication = null,
  onCancelEdit,
  onSubmit,
  submitting = false
}) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!editingMedication) {
      setForm(normalizeForm());
      return;
    }

    setForm(normalizeForm(editingMedication));
  }, [editingMedication]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (disabled || submitting) return;

    const saved = await onSubmit?.(form);
    if (saved && !editingMedication) {
      setForm(normalizeForm());
    }
  };

  const updateReminderTime = (index, value) => {
    setForm((current) => ({
      ...current,
      reminderTimes: current.reminderTimes.map((time, timeIndex) => (
        timeIndex === index ? value : time
      ))
    }));
  };

  const addReminderTime = () => {
    setForm((current) => ({ ...current, reminderTimes: [...current.reminderTimes, ''] }));
  };

  const removeReminderTime = (index) => {
    setForm((current) => ({
      ...current,
      reminderTimes: current.reminderTimes.filter((_, timeIndex) => timeIndex !== index)
    }));
  };

  const toggleDay = (day) => {
    setForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((value) => value !== day)
        : [...current.daysOfWeek, day].sort()
    }));
  };

  const requiresTimes = ['once_daily', 'multiple_times_daily', 'interval_hours', 'weekly'].includes(form.scheduleType);
  const showsReminderTimes = ['once_daily', 'multiple_times_daily', 'weekly'].includes(form.scheduleType);
  const canSubmit = form.name.trim()
    && form.dosage.trim()
    && form.scheduleType
    && form.startDate
    && (!requiresTimes || form.reminderTimes.some((time) => time.trim()))
    && (form.scheduleType !== 'weekly' || form.daysOfWeek.length > 0)
    && (form.scheduleType !== 'interval_hours' || Number(form.intervalHours) > 0);

  return (
    <form onSubmit={handleSubmit} className="motion-card rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {editingMedication ? 'Edit Medication' : 'Add Medication'}
        </h2>
        <p className="text-sm text-gray-500">
          {disabled ? 'Caregivers can view medications only.' : 'Enter medication details for your schedule.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <input
          value={form.name}
          onChange={(event) => handleChange('name', event.target.value)}
          disabled={disabled || submitting}
          placeholder="Medication name"
          className="rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
        />
        <input
          value={form.dosage}
          onChange={(event) => handleChange('dosage', event.target.value)}
          disabled={disabled || submitting}
          placeholder="Dosage"
          className="rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
        />
        <select
          value={form.scheduleType}
          onChange={(event) => handleChange('scheduleType', event.target.value)}
          disabled={disabled || submitting}
          className="rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
        >
          {scheduleOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <label className="text-sm font-semibold text-brand-primary">
          From
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => handleChange('startDate', event.target.value)}
            disabled={disabled || submitting}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 font-normal text-gray-900 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
          />
        </label>
        <label className="text-sm font-semibold text-brand-primary">
          To
          <input
            type="date"
            value={form.endDate}
            onChange={(event) => handleChange('endDate', event.target.value)}
            disabled={disabled || submitting}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 font-normal text-gray-900 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
            aria-label="End date"
          />
        </label>
      </div>

      {showsReminderTimes && (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="mb-3 text-sm font-semibold text-gray-700">Reminder times</p>
          <div className="space-y-3">
            {form.reminderTimes.map((time, index) => (
              <div key={`${index}-${time}`} className="flex gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(event) => updateReminderTime(index, event.target.value)}
                  disabled={disabled || submitting}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
                />
                {form.reminderTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReminderTime(index)}
                    disabled={disabled || submitting}
                    className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {['multiple_times_daily', 'weekly'].includes(form.scheduleType) && (
            <button
              type="button"
              onClick={addReminderTime}
              disabled={disabled || submitting}
              className="mt-3 rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700"
            >
              Add reminder time
            </button>
          )}
        </div>
      )}

      {form.scheduleType === 'interval_hours' && (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">
              First reminder time
              <input
                type="time"
                value={form.reminderTimes[0] || ''}
                onChange={(event) => updateReminderTime(0, event.target.value)}
                disabled={disabled || submitting}
                className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Repeat every
              <span className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={form.intervalHours}
                  onChange={(event) => handleChange('intervalHours', event.target.value)}
                  disabled={disabled || submitting}
                  className="w-24 rounded-xl border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
                />
                hours
              </span>
            </label>
          </div>
        </div>
      )}

      {form.scheduleType === 'weekly' && (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="mb-3 text-sm font-semibold text-gray-700">Days of week</p>
          <div className="flex flex-wrap gap-2">
            {weekdays.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                disabled={disabled || submitting}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  form.daysOfWeek.includes(day.value)
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={form.notes}
        onChange={(event) => handleChange('notes', event.target.value)}
        disabled={disabled || submitting}
        placeholder="Notes (optional)"
        rows={3}
        className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
      />

      {!disabled && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Saving...' : editingMedication ? 'Update Medication' : 'Add Medication'}
          </button>
          {editingMedication && (
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
      )}
    </form>
  );
}
