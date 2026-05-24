import { Phone, Video } from 'lucide-react';

export default function CallButton({ disabled, onStartAudioCall, onStartVideoCall }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onStartAudioCall}
        className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        <Phone size={18} />
        Audio
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onStartVideoCall}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        <Video size={18} />
        Video
      </button>
    </div>
  );
}
