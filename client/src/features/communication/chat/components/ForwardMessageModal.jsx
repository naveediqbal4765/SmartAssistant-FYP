import { useEffect, useMemo, useState } from 'react';

export default function ForwardMessageModal({
  open,
  conversations = [],
  groups = [],
  onSearchUsers,
  onClose,
  onForward
}) {
  const [query, setQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setUserResults([]);
      setSearchingUsers(false);
    }
  }, [open]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!open || !normalizedQuery) {
      setUserResults([]);
      setSearchingUsers(false);
      return undefined;
    }

    let cancelled = false;
    setSearchingUsers(true);

    const timerId = window.setTimeout(async () => {
      try {
        const results = await onSearchUsers?.(normalizedQuery);
        if (!cancelled) setUserResults(results || []);
      } catch (err) {
        if (!cancelled) setUserResults([]);
      } finally {
        if (!cancelled) setSearchingUsers(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [onSearchUsers, open, query]);

  const privateTargets = useMemo(() => (
    conversations.filter((conversation) => conversation?.participant?._id)
  ), [conversations]);

  const searchedUsers = useMemo(() => {
    const seenUserIds = new Set();

    privateTargets.forEach((conversation) => {
      seenUserIds.add(String(conversation.participant?._id));
    });

    return userResults.filter((user) => {
      const userId = String(user?._id || '');
      if (!userId || seenUserIds.has(userId)) return false;
      seenUserIds.add(userId);
      return true;
    });
  }, [privateTargets, userResults]);

  const visiblePrivateTargets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return privateTargets;

    return privateTargets.filter((conversation) => {
      const searchable = `${conversation.participant?.name || ''} ${conversation.participant?.role || ''}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [privateTargets, query]);

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return groups;

    return groups.filter((group) => (
      `${group.name || ''} ${group.description || ''}`.toLowerCase().includes(normalizedQuery)
    ));
  }, [groups, query]);

  if (!open) return null;

  const hasSearch = Boolean(query.trim());

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="motion-modal-in w-full max-w-lg rounded-2xl border border-green-100 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand-primary">Forward Message</h2>
            <p className="mt-1 text-sm text-gray-600">Choose a chat or group to receive this message.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-bold text-gray-500 hover:bg-gray-100"
          >
            X
          </button>
        </div>

        <div className="mt-5">
          <label className="sr-only" htmlFor="forward-search">Search users or groups</label>
          <input
            id="forward-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users or groups..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            autoFocus
          />
        </div>

        <div className="mt-5 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          <section>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
              {hasSearch ? 'Users' : 'Recent chats'}
            </h3>
            {hasSearch && searchingUsers && <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">Searching users...</p>}
            {hasSearch && !searchingUsers && !visiblePrivateTargets.length && !searchedUsers.length && (
              <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">No users found.</p>
            )}
            {!hasSearch && !privateTargets.length && <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">No recent chats. Search users above to forward anyway.</p>}
            <div className="space-y-2">
              {visiblePrivateTargets.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onForward?.({ type: 'chat', target: conversation })}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                    {(conversation.participant?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{conversation.participant?.name || 'Unknown user'}</p>
                    <p className="text-sm capitalize text-gray-500">{conversation.participant?.role || 'Chat'}</p>
                  </div>
                </button>
              ))}
              {searchedUsers.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => onForward?.({ type: 'user', target: user })}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                    {(user.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user.name || 'Unknown user'}</p>
                    <p className="text-sm capitalize text-gray-500">{user.role || 'User'}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Groups</h3>
            {!visibleGroups.length && (
              <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">
                {hasSearch ? 'No groups found.' : 'No groups available.'}
              </p>
            )}
            <div className="space-y-2">
              {visibleGroups.map((group) => (
                <button
                  key={group._id}
                  type="button"
                  onClick={() => onForward?.({ type: 'group', target: group })}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                    {(group.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{group.name || 'Unnamed group'}</p>
                    <p className="text-sm text-gray-500">{group.members?.length || 0} members</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
