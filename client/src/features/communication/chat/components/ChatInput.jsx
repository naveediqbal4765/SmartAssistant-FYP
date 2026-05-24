import { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';

export default function ChatInput({ disabled, sending, onSend, onSendVoice }) {
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
          className="rounded-xl bg-gray-200 px-4 py-3 font-semibold disabled:opacity-50"
        >
          Mic
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
