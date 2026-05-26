import CallScreen from './CallScreen';
import IncomingCallModal from './IncomingCallModal';
import useWebRTC from './useWebRTC';

export default function GlobalCallHandler() {
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
        onMute={toggleMute}
        onToggleCamera={toggleCamera}
        onEnd={endCurrentCall}
      />
    </>
  );
}
