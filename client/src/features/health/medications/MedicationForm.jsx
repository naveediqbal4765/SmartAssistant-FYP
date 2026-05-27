import { useEffect, useState } from 'react';

const emptyForm = {
  name: '',
  dosage: '',
  frequency: '',
  time: '',
  notes: ''
};

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
      setForm(emptyForm);
      return;
    }

    setForm({
      name: editingMedication.name || '',
      dosage: editingMedication.dosage || '',
      frequency: editingMedication.frequency || '',
      time: editingMedication.time || '',
      notes: editingMedication.notes || ''
    });
  }, [editingMedication]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (disabled || submitting) return;

    const saved = await onSubmit?.(form);
    if (saved && !editingMedication) {
      setForm(emptyForm);
    }
  };

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
        <input
          value={form.frequency}
          onChange={(event) => handleChange('frequency', event.target.value)}
          disabled={disabled || submitting}
          placeholder="Frequency"
          className="rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
        />
        <input
          type="time"
          value={form.time}
          onChange={(event) => handleChange('time', event.target.value)}
          disabled={disabled || submitting}
          className="rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none disabled:bg-gray-100"
        />
      </div>

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
            disabled={submitting || !form.name.trim() || !form.dosage.trim() || !form.frequency.trim() || !form.time.trim()}
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
