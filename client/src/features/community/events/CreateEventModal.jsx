import { useState } from 'react';
import { overlayLayers } from '../../../components/ui/overlayLayers';

const CATEGORY_LABELS = {
  social: 'Social',
  health_wellness: 'Health & Wellness',
  fitness: 'Fitness',
  education: 'Education',
  faith_spirituality: 'Faith & Spirituality',
  arts_culture: 'Arts & Culture',
  volunteering: 'Volunteering',
  other: 'Other'
};

export default function CreateEventModal({ open, categories, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('social');
  const [isVirtual, setIsVirtual] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [address, setAddress] = useState('');
  const [startAt, setStartAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startAt) {
      setError('Please add a title and a start date/time.');
      return;
    }
    if (isVirtual && !meetingLink.trim()) {
      setError('Please add a meeting link for virtual events.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await onCreate({
        title: title.trim(),
        description: description.trim(),
        category,
        isVirtual,
        meetingLink: isVirtual ? meetingLink.trim() : '',
        location: isVirtual ? undefined : { address: address.trim() },
        startAt: new Date(startAt).toISOString(),
        capacity: capacity ? Number(capacity) : undefined
      });
      if (created) {
        setTitle('');
        setDescription('');
        setMeetingLink('');
        setAddress('');
        setStartAt('');
        setCapacity('');
      }
    } catch (err) {
      setError(err?.response?.data?.msg || 'Could not create the event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`motion-modal-backdrop fixed inset-0 ${overlayLayers.modal} flex items-center justify-center bg-black/40 px-4`}
      onPointerDown={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onPointerDown={(event) => event.stopPropagation()}
        className="motion-modal-in max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl shadow-gray-900/15"
      >
        <h2 className="text-2xl font-bold text-gray-900">Create Event</h2>
        <p className="mt-1 text-sm text-gray-500">Let the community know about something happening.</p>

        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          className="mt-4 w-full rounded-xl border px-4 py-3"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className="mt-3 w-full rounded-xl border px-4 py-3"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-3 w-full rounded-xl border px-4 py-3"
        >
          {(categories?.length ? categories : Object.keys(CATEGORY_LABELS)).map((key) => (
            <option key={key} value={key}>{CATEGORY_LABELS[key] || key}</option>
          ))}
        </select>

        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isVirtual} onChange={(e) => setIsVirtual(e.target.checked)} />
          This is a virtual event
        </label>

        {isVirtual ? (
          <input
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="Meeting link (Zoom, Google Meet, etc.)"
            className="mt-3 w-full rounded-xl border px-4 py-3"
          />
        ) : (
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Location / address"
            className="mt-3 w-full rounded-xl border px-4 py-3"
          />
        )}

        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="mt-3 w-full rounded-xl border px-4 py-3"
        />
        <input
          type="number"
          min="1"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Capacity (optional)"
          className="mt-3 w-full rounded-xl border px-4 py-3"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="motion-interactive rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}

export { CATEGORY_LABELS };
