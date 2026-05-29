import { useEffect, useRef, useState } from 'react';
import { Camera, File, Image, Mic, Paperclip, Video } from 'lucide-react';
import MediaCaptureModal from './MediaCaptureModal';
import ReplyPreview from './ReplyPreview';
import VoiceRecorder from './VoiceRecorder';

export default function ChatInput({
  disabled,
  sending,
  onSend,
  onSendVoice,
  onSendMedia,
  onTypingStart,
  onTypingStop,
  replyTo,
  onCancelReply,
  onOpenCapture
}) {
  const [text, setText] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [captureMode, setCaptureMode] = useState('');
  const panelRef = useRef(null);
  const attachmentButtonRef = useRef(null);
  const micButtonRef = useRef(null);
  const mediaInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const showRecorder = activePanel === 'mic';
  const showAttachments = activePanel === 'attachments';

  useEffect(() => {
    if (!text.trim()) return undefined;

    const timerId = window.setTimeout(() => {
      onTypingStop?.();
    }, 2500);

    return () => window.clearTimeout(timerId);
  }, [onTypingStop, text]);

  useEffect(() => {
    if (!activePanel) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (
        panelRef.current?.contains(target)
        || attachmentButtonRef.current?.contains(target)
        || micButtonRef.current?.contains(target)
      ) {
        return;
      }

      setActivePanel(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [activePanel]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = text.trim();
    if (!message || disabled) return;

    onSend(message);
    onTypingStop?.();
    setText('');
  };

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled) return;
    setActivePanel(null);
    onSendMedia?.(file);
  };

  const openCapture = (mode) => {
    if (!navigator.mediaDevices?.getUserMedia || (mode === 'video' && !window.MediaRecorder)) {
      mediaInputRef.current?.click();
      return;
    }
    setActivePanel(null);
    if (onOpenCapture) {
      onOpenCapture(mode);
      return;
    }
    setCaptureMode(mode);
  };

  const handleCapturedMedia = (file) => {
    setActivePanel(null);
    onSendMedia?.(file);
  };

  return (
    <div className="relative border-t border-gray-100 bg-white p-4 shadow-[inset_0_10px_16px_-18px_rgba(15,23,42,0.45)]">
      <ReplyPreview replyTo={replyTo} onCancel={onCancelReply} />

      {showRecorder && (
        <div ref={panelRef} className="mb-3">
          <VoiceRecorder
            disabled={disabled || sending}
            onSendVoice={onSendVoice}
            onClose={() => setActivePanel(null)}
          />
        </div>
      )}

      <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaChange} />
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={handleMediaChange} />

      <div
        ref={showAttachments ? panelRef : null}
        className={`absolute bottom-20 left-4 z-[80] w-64 origin-bottom-left rounded-2xl bg-white p-2 shadow-2xl shadow-gray-900/15 ring-1 ring-black/5 transition-all duration-200 ease-out ${
          showAttachments
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-2 scale-95 opacity-0'
        }`}
      >
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => mediaInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">
            <Image size={16} /> Media
          </button>
          <button type="button" onClick={() => openCapture('photo')} className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">
            <Camera size={16} /> Take Photo
          </button>
          <button type="button" onClick={() => openCapture('video')} className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">
            <Video size={16} /> Record Video
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">
            <File size={16} /> File
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <button
          ref={attachmentButtonRef}
          type="button"
          disabled={disabled || sending}
          onClick={() => setActivePanel((panel) => (panel === 'attachments' ? null : 'attachments'))}
          aria-label="Attach media or file"
          title="Attach"
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all disabled:opacity-50 ${
            showAttachments
              ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
          }`}
        >
          <Paperclip size={22} />
        </button>
        <button
          ref={micButtonRef}
          type="button"
          disabled={disabled}
          onClick={() => setActivePanel((panel) => (panel === 'mic' ? null : 'mic'))}
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
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim()) {
              onTypingStart?.();
            } else {
              onTypingStop?.();
            }
          }}
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
      {!onOpenCapture && (
        <MediaCaptureModal
          open={Boolean(captureMode)}
          mode={captureMode}
          onClose={() => setCaptureMode('')}
          onCapture={handleCapturedMedia}
          onFallback={() => mediaInputRef.current?.click()}
        />
      )}
    </div>
  );
}
