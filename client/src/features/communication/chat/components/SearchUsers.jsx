import { useEffect, useState } from 'react';
import { searchUsers } from '../services/chatApi';

export default function SearchUsers({ onSelectUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setError('');
      return;
    }

    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const users = await searchUsers(trimmedQuery);
        if (!cancelled) {
          setResults(users);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.msg || 'Failed to search users');
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query]);

  const handleSelectUser = (user) => {
    onSelectUser?.(user);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative mb-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      {query.trim() && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border bg-white shadow-lg">
          {loading && <div className="p-3 text-gray-500">Searching users...</div>}
          {error && <div className="p-3 text-red-600">{error}</div>}
          {!loading && !error && !results.length && (
            <div className="p-3 text-gray-500">No allowed users found.</div>
          )}
          {!loading && !error && results.map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => handleSelectUser(user)}
              className="flex w-full items-center gap-3 border-b p-3 text-left last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                {(user.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user.name || 'Unknown user'}</p>
                <p className="text-sm capitalize text-gray-500">{user.role}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
