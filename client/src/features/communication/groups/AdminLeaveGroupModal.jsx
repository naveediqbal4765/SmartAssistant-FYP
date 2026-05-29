import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../../components/ui/Button';

const getUserId = (value) => String(value?._id || value || '');

const getInitials = (name = '') => (
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'
);

export default function AdminLeaveGroupModal({
  open,
  group,
  currentUserId,
  submitting = false,
  onClose,
  onTransferAndLeave,
  onDeleteGroup
}) {
  const [step, setStep] = useState('choice');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const dialogRef = useRef(null);

  const transferMembers = useMemo(() => {
    const currentMember = (group?.members || []).find((member) => getUserId(member.userId) === String(currentUserId));
    const linkedCaregiverIds = new Set((currentMember?.userId?.linkedCaregivers || []).map(getUserId));

    return (group?.members || []).filter((member) => {
      const userId = getUserId(member.userId);
      return userId && userId !== String(currentUserId) && !linkedCaregiverIds.has(userId);
    });
  }, [currentUserId, group]);

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

  const handleClose = () => {
    setStep('choice');
    setSelectedMemberId('');
    onClose?.();
  };

  const handleTransferSubmit = (event) => {
    event.preventDefault();
    if (!selectedMemberId || submitting) return;
    onTransferAndLeave?.(selectedMemberId);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-leave-title"
        className="motion-dropdown-in max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-green-100 bg-white p-5 shadow-2xl"
      >
        <h2 id="admin-leave-title" className="text-xl font-bold text-brand-primary">
          You are the group admin
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-700">
          You must either transfer admin to another member or delete the group before leaving.
        </p>

        {step === 'choice' ? (
          <div className="mt-5 flex flex-col gap-2">
            <Button type="button" onClick={() => setStep('transfer')} disabled={submitting}>
              Transfer Admin & Leave
            </Button>
            <Button type="button" variant="danger" onClick={onDeleteGroup} disabled={submitting}>
              Delete Group
            </Button>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
          </div>
        ) : (
          <form onSubmit={handleTransferSubmit} className="mt-5">
            <p className="text-sm font-semibold text-gray-900">Choose the new admin</p>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {!transferMembers.length && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  There is no eligible member to transfer admin to. Delete the group instead.
                </div>
              )}
              {transferMembers.map((member) => {
                const user = member.userId || {};
                const userId = getUserId(user);
                const selected = selectedMemberId === userId;

                return (
                  <button
                    key={userId}
                    type="button"
                    onClick={() => setSelectedMemberId(userId)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-surface font-bold text-brand-primary">
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{user.name || 'Member'}</p>
                      <p className="text-sm capitalize text-gray-500">{user.role || 'user'} · {member.role}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep('choice')} disabled={submitting}>
                Back
              </Button>
              <Button type="submit" disabled={!selectedMemberId || submitting}>
                Confirm Transfer
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
