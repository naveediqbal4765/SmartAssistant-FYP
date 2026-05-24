import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acceptCall as emitCallAccepted,
  callUser,
  endCall as emitEndCall,
  getCallSocket,
  sendIceCandidate
} from './callSocket';

const peerConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export default function useWebRTC({ onCallEnded } = {}) {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const activePeerIdRef = useRef(null);
  const callTypeRef = useRef('audio');
  const callStartedAtRef = useRef(null);
  const durationTimerRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('audio');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState('');

  const stopTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (!callStartedAtRef.current) {
      return 0;
    }

    const elapsed = Math.max(1, Math.floor((Date.now() - callStartedAtRef.current) / 1000));
    callStartedAtRef.current = null;
    setDurationSeconds(elapsed);
    return elapsed;
  }, []);

  const startTimer = useCallback(() => {
    if (callStartedAtRef.current) return;

    callStartedAtRef.current = Date.now();
    setDurationSeconds(0);
    durationTimerRef.current = setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - callStartedAtRef.current) / 1000));
    }, 1000);
  }, []);

  const cleanup = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    activePeerIdRef.current = null;
    callTypeRef.current = 'audio';
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setMuted(false);
    setCameraOn(false);
    setCallType('audio');
    setCallState('idle');
    stopTimer();
    setDurationSeconds(0);
  }, [stopTimer]);

  const createPeer = useCallback((peerUserId) => {
    const peer = new RTCPeerConnection(peerConfig);
    const remote = new MediaStream();

    activePeerIdRef.current = peerUserId;
    remoteStreamRef.current = remote;
    setRemoteStream(remote);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendIceCandidate({ toUserId: peerUserId, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    peerRef.current = peer;
    return peer;
  }, []);

  const getLocalStream = async (withVideo = false) => {
    if (localStreamRef.current) return localStreamRef.current;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    } catch (err) {
      if (!withVideo) throw err;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    localStreamRef.current = stream;
    setLocalStream(stream);
    setCameraOn(stream.getVideoTracks().some((track) => track.enabled));
    return stream;
  };

  const addLocalTracks = (peer, stream) => {
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
  };

  const startCall = useCallback(async (toUserId, nextCallType = 'audio') => {
    if (!toUserId || callState !== 'idle') return;

    try {
      const isVideoCall = nextCallType === 'video';
      setError('');
      setCallType(nextCallType);
      callTypeRef.current = nextCallType;
      setCallState('calling');
      const stream = await getLocalStream(isVideoCall);
      const peer = createPeer(toUserId);
      addLocalTracks(peer, stream);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      callUser({ toUserId, offer, callType: nextCallType });
    } catch (err) {
      setError('Could not start call');
      cleanup();
    }
  }, [callState, cleanup, createPeer]);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      setError('');
      setCallState('connecting');
      const nextCallType = incomingCall.callType || 'audio';
      const isVideoCall = nextCallType === 'video';
      setCallType(nextCallType);
      callTypeRef.current = nextCallType;
      const stream = await getLocalStream(isVideoCall);
      const peer = createPeer(incomingCall.fromUserId);
      addLocalTracks(peer, stream);

      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      emitCallAccepted({ toUserId: incomingCall.fromUserId, answer });
      setIncomingCall(null);
      setCallState('in-call');
      startTimer();
    } catch (err) {
      setError('Could not accept call');
      cleanup();
    }
  }, [cleanup, createPeer, incomingCall, startTimer]);

  const rejectIncomingCall = useCallback(() => {
    if (incomingCall?.fromUserId) {
      emitEndCall({ toUserId: incomingCall.fromUserId });
    }
    setIncomingCall(null);
  }, [incomingCall]);

  const endCurrentCall = useCallback(() => {
    const peerUserId = activePeerIdRef.current;
    const wasConnected = callState === 'in-call';
    const elapsed = wasConnected ? stopTimer() : 0;
    const endedCallType = callTypeRef.current;

    if (activePeerIdRef.current) {
      emitEndCall({ toUserId: activePeerIdRef.current });
    }
    cleanup();

    if (wasConnected && peerUserId && elapsed > 0) {
      onCallEnded?.({ peerUserId, durationSeconds: elapsed, callType: endedCallType });
    }
  }, [callState, cleanup, onCallEnded, stopTimer]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    if (!videoTracks.length) return;

    const nextCameraOn = !cameraOn;
    videoTracks.forEach((track) => {
      track.enabled = nextCameraOn;
    });
    setCameraOn(nextCameraOn);
  }, [cameraOn]);

  useEffect(() => {
    const socket = getCallSocket();

    const handleIncomingCall = ({ fromUserId, fromName, offer, callType = 'audio' }) => {
      if (callState !== 'idle') {
        emitEndCall({ toUserId: fromUserId });
        return;
      }
      setIncomingCall({ fromUserId, fromName, offer, callType });
    };

    const handleCallAccepted = async ({ fromUserId, answer }) => {
      if (!peerRef.current || activePeerIdRef.current !== fromUserId) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setCallState('in-call');
      startTimer();
    };

    const handleIceCandidate = async ({ fromUserId, candidate }) => {
      if (!peerRef.current || activePeerIdRef.current !== fromUserId) return;
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const handleEndCall = () => {
      cleanup();
    };

    const handleCallError = ({ message }) => {
      setError(message || 'Call failed');
      cleanup();
    };

    socket.on('call-user', handleIncomingCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('end-call', handleEndCall);
    socket.on('call-error', handleCallError);

    return () => {
      socket.off('call-user', handleIncomingCall);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('end-call', handleEndCall);
      socket.off('call-error', handleCallError);
    };
  }, [callState, cleanup, startTimer]);

  return {
    incomingCall,
    localStream,
    remoteStream,
    callState,
    callType,
    durationSeconds,
    muted,
    cameraOn,
    error,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCurrentCall,
    toggleMute,
    toggleCamera
  };
}
