import { useRef, useState } from 'react';

const SWIPE_THRESHOLD_PX = 48;

const isMutedForUser = (group, currentUserId) => {
  return (group.mutedFor || []).some((id) => String(id?._id || id) === String(currentUserId));
};

function GroupListItem({
  group,
  active,
  currentUserId,
  onSelectGroup,
  onExitGroup,
  onMuteGroup
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const swipedRef = useRef(false);
  const muted = isMutedForUser(group, currentUserId);

  const handlePointerUp = (event) => {
    if (swipeStartX === null) return;

    const deltaX = event.clientX - swipeStartX;
    if (deltaX <= -SWIPE_THRESHOLD_PX) {
      setActionsOpen(true);
      swipedRef.current = true;
    } else if (deltaX >= SWIPE_THRESHOLD_PX / 2) {
      setActionsOpen(false);
      swipedRef.current = false;
    }

    setSwipeStartX(null);
  };

  const handleSelect = () => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }

    if (actionsOpen) {
      setActionsOpen(false);
      return;
    }

    onSelectGroup(group);
  };

  const handleAction = (event, action) => {
    event.stopPropagation();
    action(group);
    setActionsOpen(false);
  };

  return (
    <div className="motion-interactive relative overflow-visible border-b border-gray-100 last:border-b-0">
      <div className="absolute inset-y-1 right-0 flex w-48 overflow-hidden rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={(event) => handleAction(event, onMuteGroup)}
          className="h-full w-24 bg-gray-700 text-sm font-semibold text-white"
        >
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <button
          type="button"
          onClick={(event) => handleAction(event, onExitGroup)}
          className="h-full w-24 bg-red-600 text-sm font-semibold text-white"
        >
          Exit
        </button>
      </div>

      <button
        type="button"
        onPointerDown={(event) => setSwipeStartX(event.clientX)}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setSwipeStartX(null)}
        onClick={handleSelect}
        className={`relative w-full touch-pan-y rounded-2xl p-4 text-left transition-all duration-200 ease-in-out hover:bg-gray-50 hover:shadow-md ${
          actionsOpen ? '-translate-x-48' : 'translate-x-0'
        } ${active ? 'z-10 scale-[1.01] bg-gray-100 shadow-lg shadow-gray-200/70' : 'bg-white shadow-none'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">{group.name}</p>
            <p className="text-sm text-gray-500">{group.lastMessage?.message || group.description || 'No messages yet'}</p>
          </div>
          {muted && (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
              Muted
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

export default function GroupList({
  groups,
  discoverableGroups,
  activeGroupId,
  currentUserId,
  onSelectGroup,
  onRequestJoin,
  onCancelJoinRequest,
  onExitGroup,
  onMuteGroup
}) {
  const [activeMobileTab, setActiveMobileTab] = useState('my-groups');
  const renderMyGroups = () => (
    <div className="motion-card rounded-xl bg-white p-2">
      <div className="border-b border-gray-100 p-4 font-bold">My Groups</div>
      {!groups.length && <div className="p-4 text-gray-500">No groups yet.</div>}
      {groups.map((group) => (
        <GroupListItem
          key={group._id}
          group={group}
          active={activeGroupId === group._id}
          currentUserId={currentUserId}
          onSelectGroup={onSelectGroup}
          onExitGroup={onExitGroup}
          onMuteGroup={onMuteGroup}
        />
      ))}
    </div>
  );

  const renderDiscoverGroups = () => (
    <div className="motion-card rounded-xl bg-white">
      <div className="border-b p-4 font-bold">Discover Groups</div>
      {!discoverableGroups.length && <div className="p-4 text-gray-500">No groups to join.</div>}
      {discoverableGroups.map((group) => {
        const requested = group.joinRequestStatus === 'pending';

        return (
          <div key={group._id} className="border-b p-4 last:border-b-0">
            <p className="font-semibold">{group.name}</p>
            <p className="text-sm text-gray-500">{group.description || 'No description'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!requested) onRequestJoin(group._id);
                }}
                disabled={requested}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  requested
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {requested ? 'Requested' : 'Join Request'}
              </button>
              {requested && (
                <button
                  type="button"
                  onClick={() => onCancelJoinRequest(group._id)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <div className="mb-3 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveMobileTab('my-groups')}
            className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
              activeMobileTab === 'my-groups'
                ? 'bg-white text-brand-primary shadow-sm'
                : 'text-gray-600'
            }`}
          >
            My Groups
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('discover')}
            className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
              activeMobileTab === 'discover'
                ? 'bg-white text-brand-primary shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Discover Groups
          </button>
        </div>
        {activeMobileTab === 'my-groups' ? renderMyGroups() : renderDiscoverGroups()}
      </div>

      <div className="hidden space-y-4 lg:block">
        {renderMyGroups()}
        {renderDiscoverGroups()}
      </div>
    </div>
  );
}
