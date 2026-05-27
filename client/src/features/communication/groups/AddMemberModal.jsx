import { useEffect, useState } from 'react';
import { overlayLayers } from '../../../components/ui/overlayLayers';
import { searchAddableUsers } from './groupApi';

export default function AddMemberModal({ open, group, onClose, onAddMember }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !group) return;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAddableUsers(group._id, query);
        setUsers(data);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [group, open, query]);

  if (!open || !group) return null;

  return (
    <div
      className={`motion-modal-backdrop fixed inset-0 ${overlayLayers.nestedModal} flex items-center justify-center bg-black/40 px-4`}
      onPointerDown={onClose}
    >
      <div
        className="motion-modal-in relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl shadow-gray-900/15"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-2xl font-bold">Add Member</h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
          className="mt-4 w-full rounded-xl border px-4 py-3"
        />
        <div className="relative mt-4 max-h-80 overflow-y-auto rounded-xl bg-white">
          {loading && <div className="p-3 text-gray-500">Searching...</div>}
          {!loading && !users.length && <div className="p-3 text-gray-500">No addable users found.</div>}
          {users.map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => onAddMember(user._id)}
              className="w-full border-b p-3 text-left hover:bg-gray-50"
            >
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm capitalize text-gray-500">{user.role}</p>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-gray-200 px-4 py-3 font-semibold">
          Close
        </button>
      </div>
    </div>
  );
}
