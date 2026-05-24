import { useEffect, useState } from 'react';
import { searchInitialGroupMembers } from './groupApi';

export default function CreateGroupModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchInitialGroupMembers(query);
        setUsers(results);
      } catch (err) {
        setUsers([]);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [open, query]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || selectedMembers.length < 2) return;

    setSubmitting(true);
    const created = await onCreate({
      name: name.trim(),
      description: description.trim(),
      initialMemberIds: selectedMembers.map((member) => member._id)
    });
    setSubmitting(false);

    if (created) {
      setName('');
      setDescription('');
      setQuery('');
      setSelectedMembers([]);
    }
  };

  const toggleMember = (user) => {
    setSelectedMembers((current) => {
      if (current.some((member) => member._id === user._id)) {
        return current.filter((member) => member._id !== user._id);
      }
      return [...current, user];
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-bold">Create Group</h2>
        <p className="mt-1 text-sm text-gray-500">Select at least 2 members so the group starts with 3 people.</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="mt-4 w-full rounded-xl border px-4 py-3"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="mt-3 w-full rounded-xl border px-4 py-3"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search initial members..."
          className="mt-3 w-full rounded-xl border px-4 py-3"
        />
        <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border">
          {!users.length && <div className="p-3 text-sm text-gray-500">No users found.</div>}
          {users.map((user) => {
            const selected = selectedMembers.some((member) => member._id === user._id);
            return (
              <button
                key={user._id}
                type="button"
                onClick={() => toggleMember(user)}
                className={`w-full border-b p-3 text-left last:border-b-0 hover:bg-gray-50 ${selected ? 'bg-green-50' : ''}`}
              >
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm capitalize text-gray-500">{user.role}</p>
              </button>
            );
          })}
        </div>
        <p className={`mt-2 text-sm ${selectedMembers.length >= 2 ? 'text-green-700' : 'text-red-600'}`}>
          {selectedMembers.length}/2 required members selected
        </p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-xl bg-gray-200 px-4 py-3 font-semibold disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={submitting || selectedMembers.length < 2} className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
