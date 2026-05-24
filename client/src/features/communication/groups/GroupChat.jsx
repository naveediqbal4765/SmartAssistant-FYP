import { useState } from 'react';
import { Mic } from 'lucide-react';
import VoiceRecorder from '../chat/components/VoiceRecorder';
import GroupRequestsPanel from './GroupRequestsPanel';

const isAdmin = (group, userId) => {
  return group?.members?.some((member) => {
    const memberId = String(member.userId?._id || member.userId);
    return memberId === String(userId) && member.role === 'admin';
  });
};

export default function GroupChat({
  group,
  currentUserId,
  messages,
  requests,
  onSendMessage,
  onSendVoice,
  onDeleteMessage,
  onApproveRequest,
  onRejectRequest,
  onOpenAddMember
}) {
  const [text, setText] = useState('');
  const [showRecorder, setShowRecorder] = useState(false);

  if (!group) {
    return (
      <div className="flex h-[70vh] items-center justify-center rounded-xl bg-white text-gray-500 shadow">
        Select a group to start chatting.
      </div>
    );
  }

  const admin = isAdmin(group, currentUserId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <div className="flex h-[70vh] flex-col rounded-xl bg-white shadow">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{group.name}</h2>
            <p className="text-sm text-gray-500">{group.description}</p>
            <p className="text-sm text-gray-500">{group.members?.length || 0} members</p>
          </div>
          {admin && (
            <button onClick={onOpenAddMember} className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white">
              Add Member
            </button>
          )}
        </div>
        {admin && (
          <div className="mt-4">
            <GroupRequestsPanel
              requests={requests}
              onApprove={onApproveRequest}
              onReject={onRejectRequest}
            />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
        {!messages.length && <div className="text-gray-500">No group messages yet.</div>}
        {messages.map((message) => {
          const mine = String(message.senderId?._id || message.senderId) === String(currentUserId);
          const canDelete = mine || admin;
          const mediaSrc = message.mediaUrl?.startsWith('http') || message.mediaUrl?.startsWith('blob:')
            ? message.mediaUrl
            : `http://localhost:5000${message.mediaUrl}`;
          const sentAt = new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
          return (
            <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold opacity-80">
                  <span>{message.senderName || message.senderId?.name || 'Member'}</span>
                  <span>{sentAt}</span>
                </div>
                {message.messageType === 'voice' && message.mediaUrl ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold">Voice note</p>
                    <audio controls src={mediaSrc} className="max-w-full" />
                  </div>
                ) : (
                  <p>{message.message}</p>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDeleteMessage?.(message)}
                    className={`mt-1 text-xs font-semibold underline ${mine ? 'text-green-100 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t p-4">
        {showRecorder && (
          <div className="mb-3">
            <VoiceRecorder disabled={!group} onSendVoice={onSendVoice} />
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowRecorder((value) => !value)}
            aria-label="Record voice note"
            title="Record voice note"
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              showRecorder
                ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Mic size={22} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message group..."
            className="flex-1 rounded-xl border px-4 py-3"
          />
          <button disabled={!text.trim()} className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
