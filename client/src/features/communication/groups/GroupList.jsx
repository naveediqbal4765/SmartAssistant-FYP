export default function GroupList({
  groups,
  discoverableGroups,
  activeGroupId,
  currentUserId,
  onSelectGroup,
  onRequestJoin,
  onDeleteGroup
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white shadow">
        <div className="border-b p-4 font-bold">My Groups</div>
        {!groups.length && <div className="p-4 text-gray-500">No groups yet.</div>}
        {groups.map((group) => {
          const isAdmin = group.members?.some((member) => (
            String(member.userId?._id || member.userId) === String(currentUserId) && member.role === 'admin'
          ));

          return (
            <div
              key={group._id}
              className={`w-full border-b p-4 text-left last:border-b-0 hover:bg-gray-50 ${
                activeGroupId === group._id ? 'bg-green-50 ring-2 ring-inset ring-green-500' : ''
              }`}
            >
              <button type="button" onClick={() => onSelectGroup(group)} className="w-full text-left">
                <p className="font-semibold">{group.name}</p>
                <p className="text-sm text-gray-500">{group.lastMessage?.message || group.description || 'No messages yet'}</p>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onDeleteGroup?.(group)}
                  className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Delete conversation
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-white shadow">
        <div className="border-b p-4 font-bold">Discover Groups</div>
        {!discoverableGroups.length && <div className="p-4 text-gray-500">No groups to join.</div>}
        {discoverableGroups.map((group) => (
          <div key={group._id} className="border-b p-4 last:border-b-0">
            <p className="font-semibold">{group.name}</p>
            <p className="text-sm text-gray-500">{group.description || 'No description'}</p>
            <button
              type="button"
              onClick={() => onRequestJoin(group._id)}
              className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Request to join
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
