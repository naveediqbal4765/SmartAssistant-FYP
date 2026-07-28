import { useState } from 'react';
import { overlayLayers } from '../../../components/ui/overlayLayers';

const CATEGORY_LABELS = {
  gardening: 'Gardening',
  music: 'Music',
  books_reading: 'Books & Reading',
  games_puzzles: 'Games & Puzzles',
  walking_fitness: 'Walking & Fitness',
  cooking_baking: 'Cooking & Baking',
  arts_crafts: 'Arts & Crafts',
  technology: 'Technology',
  faith_spirituality: 'Faith & Spirituality',
  travel: 'Travel',
  pets: 'Pets',
  other: 'Other'
};

export default function CreateForumModal({ open, categories, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a group name.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await onCreate({ name: name.trim(), description: description.trim(), category });
      if (created) {
        setName('');
        setDescription('');
        setCategory('other');
      }
    } catch (err) {
      setError(err?.response?.data?.msg || 'Could not create the group.');
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
        className="motion-modal-in w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl shadow-gray-900/15"
      >
        <h2 className="text-2xl font-bold text-gray-900">Start a Hobby Group</h2>
        <p className="mt-1 text-sm text-gray-500">Anyone can discover and join public groups like this.</p>

        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name (e.g. Sunday Gardeners)"
          className="mt-4 w-full rounded-xl border px-4 py-3"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this group about?"
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

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="motion-interactive rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </form>
    </div>
  );
}

export { CATEGORY_LABELS };
