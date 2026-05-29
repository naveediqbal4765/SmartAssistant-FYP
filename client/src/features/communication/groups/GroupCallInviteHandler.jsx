import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';
import { startCallSound, stopCallSound } from '../audio/audioFeedback';
import { getChatSocket } from '../chat/services/socket';

export default function GroupCallInviteHandler() {
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    const socket = getChatSocket();

    const handleInvite = (payload = {}) => {
      if (!payload.groupId || !payload.callId) return;
      setDismissing(false);
      setInvite(payload);
    };

    const dismissInvite = (payload = {}) => {
      setInvite((current) => {
        if (!current || String(current.groupId) !== String(payload.groupId)) return current;

        setDismissing(true);
        window.setTimeout(() => {
          setInvite((latest) => (
            latest && String(latest.groupId) === String(payload.groupId) ? null : latest
          ));
          setDismissing(false);
        }, 180);
        return current;
      });
    };

    socket.on('group-call:invite', handleInvite);
    socket.on('group-call:end', dismissInvite);
    socket.on('group-call:cancelled', dismissInvite);

    return () => {
      socket.off('group-call:invite', handleInvite);
      socket.off('group-call:end', dismissInvite);
      socket.off('group-call:cancelled', dismissInvite);
    };
  }, []);

  useEffect(() => {
    if (!invite) {
      stopCallSound();
      return undefined;
    }

    startCallSound();
    return () => stopCallSound();
  }, [invite]);

  if (!invite) return null;

  const handleAccept = () => {
    getChatSocket().emit('group-call:accept', {
      groupId: invite.groupId,
      callId: invite.callId,
      fromUserId: invite.fromUserId
    });
    const nextInvite = invite;
    setInvite(null);
    navigate(`/groups/${nextInvite.groupId}`, {
      state: {
        acceptGroupCall: true,
        callId: nextInvite.callId
      }
    });
  };

  const handleIgnore = () => {
    getChatSocket().emit('group-call:ignore', {
      groupId: invite.groupId,
      callId: invite.callId,
      fromUserId: invite.fromUserId
    });
    setInvite(null);
  };

  return (
    <div className={`fixed right-6 top-24 z-[1000] w-80 rounded-2xl border border-green-100 bg-white p-4 shadow-2xl transition-all duration-200 ${
      dismissing ? 'translate-x-4 opacity-0' : 'translate-x-0 opacity-100'
    }`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Group Call Started</p>
      <h3 className="mt-1 text-lg font-bold text-gray-900">{invite.groupName || 'Group call'}</h3>
      <p className="mt-1 text-sm text-gray-600">
        {invite.fromName || 'A group member'} started a {invite.callType === 'video' ? 'video' : 'audio'} call.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleAccept}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
        >
          <Phone size={16} />
          Accept
        </button>
        <button
          type="button"
          onClick={handleIgnore}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-200 px-4 py-2 font-semibold text-gray-900 hover:bg-gray-300"
        >
          <PhoneOff size={16} />
          Ignore
        </button>
      </div>
    </div>
  );
}
