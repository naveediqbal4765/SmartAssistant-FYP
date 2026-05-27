import { useEffect, useRef } from 'react';
import { overlayLayers } from '../../../components/ui/overlayLayers';

export default function CallScreen({
  callState,
  callType,
  localStream,
  remoteStream,
  durationSeconds,
  muted,
  cameraOn,
  error,
  onMute,
  onToggleCamera,
  onEnd
}) {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const isVideoCall = callType === 'video';

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (callState === 'idle') return null;

  const minutes = Math.floor((durationSeconds || 0) / 60);
  const seconds = (durationSeconds || 0) % 60;
  const durationLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className={`motion-panel-in fixed inset-x-4 bottom-6 ${overlayLayers.call} mx-auto max-w-3xl rounded-2xl bg-gray-900 p-5 text-white shadow-2xl`}>
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {isVideoCall && (
        <div className="relative mb-4 h-72 overflow-hidden rounded-2xl bg-black">
          <video ref={remoteVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          <div className="absolute bottom-4 right-4 h-28 w-36 overflow-hidden rounded-xl border-2 border-white bg-gray-800">
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-sm">
                Camera off
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-bold">{isVideoCall ? 'Video call' : 'Audio call'}</p>
          <p className="text-sm text-white/70">
            {callState === 'calling' ? 'Calling...' : callState === 'connecting' ? 'Connecting...' : 'In call'}
          </p>
          {callState === 'in-call' && (
            <p className="mt-1 text-sm font-semibold text-green-300">{durationLabel}</p>
          )}
          {error && <p className="mt-1 text-sm text-red-300">{error}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMute}
            className="rounded-xl bg-gray-700 px-4 py-2 font-semibold"
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          {isVideoCall && (
            <button
              type="button"
              onClick={onToggleCamera}
              className="rounded-xl bg-gray-700 px-4 py-2 font-semibold"
            >
              {cameraOn ? 'Camera off' : 'Camera on'}
            </button>
          )}
          <button
            type="button"
            onClick={onEnd}
            className="rounded-xl bg-red-600 px-4 py-2 font-semibold"
          >
            End
          </button>
        </div>
      </div>
    </div>
  );
}
