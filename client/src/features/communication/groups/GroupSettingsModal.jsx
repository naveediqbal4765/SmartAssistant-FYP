import { useEffect, useRef, useState } from 'react';
import ActionMenu from '../../../components/ui/ActionMenu';
import Button from '../../../components/ui/Button';
import { overlayLayers } from '../../../components/ui/overlayLayers';
import GroupRequestsPanel from './GroupRequestsPanel';

const getUserId = (value) => String(value?._id || value || '');

const getInitials = (name = '') => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
};

export default function GroupSettingsModal({
  open,
  group,
  currentUserId,
  isAdmin = false,
  requests,
  onClose,
  onSaveDetails,
  onOpenAddMember,
  onRemoveMember,
  onApproveRequest,
  onRejectRequest
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open || !group) return;
    setName(group.name || '');
    setDescription(group.description || '');
  }, [group, open]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      dialogRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    });
  }, [open]);

  if (!open || !group) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSaveDetails?.({
      name: name.trim(),
      description: description.trim()
    });
  };

  return (
    <div
      className={`motion-modal-backdrop fixed inset-0 ${overlayLayers.modal} flex items-center justify-center bg-black/40 px-4`}
      onPointerDown={onClose}
    >
      <div
        ref={dialogRef}
        className="motion-modal-in max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl shadow-gray-900/15"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Group Settings' : 'Group Members'}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {isAdmin ? 'Manage group details, members, and join requests.' : 'See who is part of this group.'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>

        {isAdmin && (
          <form onSubmit={handleSubmit} className="motion-card mt-6 rounded-2xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900">Group Details</h3>
            <label className="mt-4 block text-sm font-semibold text-gray-700">
              Group name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-gray-700">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border px-4 py-3 font-normal"
              />
            </label>
            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={!name.trim()}>Save Details</Button>
            </div>
          </form>
        )}

        <section className="motion-card mt-6 rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900">Members</h3>
            {isAdmin && <Button size="sm" onClick={onOpenAddMember}>Add Member</Button>}
          </div>
          <div className="mt-4 divide-y">
            {(group.members || []).map((member) => {
              const user = member.userId || {};
              const userId = getUserId(user);
              const isSelf = userId === String(currentUserId);

              return (
                <div key={userId} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-surface font-bold text-brand-primary">
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{user.name || 'Member'}</p>
                      <p className="text-sm capitalize text-gray-500">{user.role || 'user'} · {member.role}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <ActionMenu
                      label="Member actions"
                      items={[
                        !isSelf && {
                          label: 'Remove member',
                          danger: true,
                          onClick: () => onRemoveMember?.(userId)
                        }
                      ]}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {isAdmin && (
          <section className="motion-card mt-6 rounded-2xl border border-gray-200 p-4">
            <h3 className="mb-4 font-bold text-gray-900">Join Requests</h3>
            <GroupRequestsPanel
              requests={requests}
              onApprove={onApproveRequest}
              onReject={onRejectRequest}
            />
          </section>
        )}
      </div>
    </div>
  );
}
