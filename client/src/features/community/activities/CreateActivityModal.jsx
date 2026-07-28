import { useState } from 'react';
import { overlayLayers } from '../../../components/ui/overlayLayers';

const TYPE_LABELS = {
  chair_yoga: 'Chair Yoga',
  meditation: 'Meditation',
  bingo: 'Bingo',
  book_club: 'Book Club',
  sing_along: 'Sing-Along',
  trivia: 'Trivia',
  coffee_chat: 'Coffee Chat',
  light_exercise: 'Light Exercise',
  other: 'Other'
};

export default function CreateActivityModal({ open, activityTypes, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState('other');
  const [meetingLink, setMeetingLink] = useState('');
  const [recurrence, setRecurrence] = useState('once');
  const [startAt, setStartAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !meetingLink.trim() || !startAt) {
      setError('Please fill in the title, meeting link, and start time.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await onCreate({
        title: title.trim(),
        description: description.trim(),
        activityType,
        meetingLink: meetingLink.trim(),
        recurrence,
        startAt: new Date(startAt).toISOString(),
        durationMinutes: Number(durationMinutes) || 30
      });
      if (created) {
        setTitle('');
        setDescription('');
        setMeetingLink('');
        setStartAt('');
        setDurationMinutes(30);
      }
    } catch (err) {
      setError(err?.response?.data?.msg || 'Could not create the activity.');
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
        <h2 className="text-2xl font-bold text-gray-900">Host a Virtual Activity</h2>
        <p className="mt-1 text-sm text-gray-500">Set up a recurring or one-time online meetup.</p>

        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Activity title (e.g. Morning Chair Yoga)"
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
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className="mt-3 w-full rounded-xl border px-4 py-3"
        >
          {(activityTypes?.length ? activityTypes : Object.keys(TYPE_LABELS)).map((key) => (
            <option key={key} value={key}>{TYPE_LABELS[key] || key}</option>
          ))}
        </select>
        <input
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
          placeholder="Meeting link (Zoom, Google Meet, etc.)"
          className="mt-3 w-full rounded-xl border px-4 py-3"
        />
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value)}
          className="mt-3 w-full rounded-xl border px-4 py-3"
        >
          <option value="once">One-time</option>
          <option value="daily">Repeats daily</option>
          <option value="weekly">Repeats weekly</option>
        </select>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="mt-3 w-full rounded-xl border px-4 py-3"
        />
        <input
          type="number"
          min="5"
          max="240"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          placeholder="Duration (minutes)"
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
            {submitting ? 'Creating...' : 'Create Activity'}
          </button>
        </div>
      </form>
    </div>
  );
}

export { TYPE_LABELS };
