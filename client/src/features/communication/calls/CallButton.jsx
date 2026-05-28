import { Phone, Video } from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function CallButton({ disabled, onStartAudioCall, onStartVideoCall }) {
  return (
    <div className="flex gap-2">
      <Button
        variant="success"
        disabled={disabled}
        onClick={onStartAudioCall}
        className="transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Phone size={18} />
        Audio
      </Button>
      <Button
        disabled={disabled}
        onClick={onStartVideoCall}
        className="transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Video size={18} />
        Video
      </Button>
    </div>
  );
}
