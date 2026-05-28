import { useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { overlayLayers } from '../../../components/ui/overlayLayers';

function ParticipantTile({ participant, muted = false, cameraOn = true, isLocal = false, isVideoCall = false }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const hasVideo = isVideoCall && participant.stream?.getVideoTracks?.().length > 0;

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
    if (audioRef.current && participant.stream) {
      audioRef.current.srcObject = participant.stream;
    }
  }, [cameraOn, isVideoCall, participant.stream]);

  return (
    <div className="relative min-h-40 overflow-hidden rounded-2xl bg-gray-800">
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      {hasVideo && cameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full min-h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-full min-h-40 items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700 text-2xl font-bold">
            {(participant.name || '?').charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/45 px-3 py-2 text-sm">
        <span className="font-semibold">{isLocal ? 'You' : participant.name || 'Member'}</span>
        {isLocal && <span>{muted ? 'Muted' : 'Live'}</span>}
      </div>
    </div>
  );
}

export default function GroupCallScreen({
  group,
  callState,
  callType,
  localParticipant,
  remoteStreams,
  muted,
  cameraOn,
  durationSeconds,
  error,
  onMute,
  onToggleCamera,
  onLeave
}) {
  if (callState === 'idle') return null;

  const isVideoCall = callType === 'video';
  const minutes = Math.floor((durationSeconds || 0) / 60);
  const seconds = (durationSeconds || 0) % 60;
  const durationLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const participants = [
    localParticipant,
    ...remoteStreams
  ].filter((participant) => participant?.userId);

  return (
    <div className={`fixed inset-4 ${overlayLayers.call} z-[999] flex items-center justify-center`}>
      <div className="motion-panel-in flex max-h-full w-full max-w-5xl flex-col rounded-3xl bg-gray-950 p-5 text-white shadow-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xl font-bold">{group?.name || 'Group'} {isVideoCall ? 'video' : 'audio'} call</p>
            <p className="text-sm text-white/70">
              {callState === 'joining' ? 'Connecting...' : `${participants.length} participant${participants.length === 1 ? '' : 's'} · ${durationLabel}`}
            </p>
            {error && <p className="mt-1 text-sm text-red-300">{error}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onMute}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2 font-semibold hover:bg-gray-700"
            >
              {muted ? <MicOff size={18} /> : <Mic size={18} />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
            {isVideoCall && (
              <button
                type="button"
                onClick={onToggleCamera}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2 font-semibold hover:bg-gray-700"
              >
                {cameraOn ? <VideoOff size={18} /> : <Video size={18} />}
                {cameraOn ? 'Video off' : 'Video on'}
              </button>
            )}
            <button
              type="button"
              onClick={onLeave}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold hover:bg-red-700"
            >
              <PhoneOff size={18} />
              Leave
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {participants.map((participant) => (
            <ParticipantTile
              key={participant.userId}
              participant={participant}
              isLocal={String(participant.userId) === String(localParticipant?.userId)}
              muted={muted}
              cameraOn={String(participant.userId) === String(localParticipant?.userId) ? cameraOn : true}
              isVideoCall={isVideoCall}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
