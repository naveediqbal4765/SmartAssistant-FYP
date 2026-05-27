import { useState } from 'react';
import { Mic } from 'lucide-react';
import ReplyPreview from './ReplyPreview';
import VoiceRecorder from './VoiceRecorder';

export default function ChatInput({ disabled, sending, onSend, onSendVoice, replyTo, onCancelReply }) {
  const [text, setText] = useState('');
  const [showRecorder, setShowRecorder] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = text.trim();
    if (!message || disabled) return;

    onSend(message);
    setText('');
  };

  return (
    <div className="border-t bg-white p-4">
      <ReplyPreview replyTo={replyTo} onCancel={onCancelReply} />

      {showRecorder && (
        <div className="mb-3">
          <VoiceRecorder disabled={disabled || sending} onSendVoice={onSendVoice} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowRecorder((value) => !value)}
          aria-label="Record voice note"
          title="Record voice note"
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all disabled:opacity-50 ${
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
          disabled={disabled}
          placeholder={disabled ? 'Select a conversation' : 'Type a message...'}
          className="flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-5 py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
