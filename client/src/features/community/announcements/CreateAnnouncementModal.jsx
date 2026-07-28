import { useState } from 'react';
import { overlayLayers } from '../../../components/ui/overlayLayers';

const CATEGORY_LABELS = {
  general: 'General',
  health_safety: 'Health & Safety',
  event: 'Event',
  volunteer: 'Volunteer',
  system: 'System'
};

const AUDIENCE_LABELS = {
  all: 'Everyone',
  elder: 'Seniors',
  caregiver: 'Caregivers',
  volunteer: 'Volunteers'
};

export default function CreateAnnouncementModal({ open, categories, audiences, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [audience, setAudience] = useState('all');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Please add a title and message.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await onCreate({ title: title.trim(), body: body.trim(), category, audience, pinned });
      if (created) {
        setTitle('');
        setBody('');
        setPinned(false);
      }
    } catch (err) {
      setError(err?.response?.data?.msg || 'Could not post the announcement.');
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
        <h2 className="text-2xl font-bold text-gray-900">Post an Announcement</h2>
        <p className="mt-1 text-sm text-gray-500">Share important updates with the community.</p>

        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          className="mt-4 w-full rounded-xl border px-4 py-3"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your announcement..."
          rows={4}
          className="mt-3 w-full rounded-xl border px-4 py-3"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border px-4 py-3">
            {(categories?.length ? categories : Object.keys(CATEGORY_LABELS)).map((key) => (
              <option key={key} value={key}>{CATEGORY_LABELS[key] || key}</option>
            ))}
          </select>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className="rounded-xl border px-4 py-3">
            {(audiences?.length ? audiences : Object.keys(AUDIENCE_LABELS)).map((key) => (
              <option key={key} value={key}>{AUDIENCE_LABELS[key] || key}</option>
            ))}
          </select>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Pin to the top
        </label>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="motion-interactive rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post Announcement'}
          </button>
        </div>
      </form>
    </div>
  );
}

export { CATEGORY_LABELS, AUDIENCE_LABELS };
