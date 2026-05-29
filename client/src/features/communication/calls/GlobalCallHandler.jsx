import { useEffect, useState } from 'react';
import CallScreen from './CallScreen';
import IncomingCallModal from './IncomingCallModal';
import useWebRTC from './useWebRTC';

export default function GlobalCallHandler() {
  const [callDisplayName, setCallDisplayName] = useState('');
  const {
    incomingCall,
    localStream,
    remoteStream,
    callState,
    callType,
    durationSeconds,
    muted,
    cameraOn,
    error,
    acceptIncomingCall,
    rejectIncomingCall,
    endCurrentCall,
    toggleMute,
    toggleCamera
  } = useWebRTC({ useGlobalIncomingCall: true });

  useEffect(() => {
    if (incomingCall?.fromName) {
      setCallDisplayName(incomingCall.fromName);
    }
  }, [incomingCall]);

  useEffect(() => {
    if (callState === 'idle') {
      setCallDisplayName('');
    }
  }, [callState]);

  return (
    <>
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />
      <CallScreen
        callState={callState}
        callType={callType}
        localStream={localStream}
        remoteStream={remoteStream}
        durationSeconds={durationSeconds}
        muted={muted}
        cameraOn={cameraOn}
        error={error}
        displayName={callDisplayName}
        onMute={toggleMute}
        onToggleCamera={toggleCamera}
        onEnd={endCurrentCall}
      />
    </>
  );
}
