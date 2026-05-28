import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acceptCall as emitCallAccepted,
  callUser,
  endCall as emitEndCall,
  getCallSocket,
  sendIceCandidate
} from './callSocket';
import { useOptionalCallState } from './CallStateContext';

const peerConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export default function useWebRTC({ onCallEnded, useGlobalIncomingCall = false } = {}) {
  const globalCallState = useOptionalCallState();
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
  const globalIncomingCall = globalCallState?.incomingCall;
  const globalResetCallState = globalCallState?.resetCallState;
  const globalMarkCallConnecting = globalCallState?.markCallConnecting;
  const globalMarkCallInProgress = globalCallState?.markCallInProgress;
  const activeIncomingCall = useGlobalIncomingCall && globalCallState
    ? globalIncomingCall
    : incomingCall;

  const clearIncomingCall = useCallback(() => {
    if (useGlobalIncomingCall && globalResetCallState) {
      globalResetCallState();
      return;
    }

    setIncomingCall(null);
  }, [globalResetCallState, useGlobalIncomingCall]);

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
    clearIncomingCall();
    setMuted(false);
    setCameraOn(false);
    setCallType('audio');
    setCallState('idle');
    stopTimer();
    setDurationSeconds(0);
  }, [clearIncomingCall, stopTimer]);

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

  const ensureVideoSendCapability = useCallback((peer) => {
    if (!peer) return null;

    const videoTransceiver = peer.getTransceivers?.().find((transceiver) => (
      transceiver.receiver?.track?.kind === 'video' ||
      transceiver.sender?.track?.kind === 'video'
    ));

    if (videoTransceiver) {
      if (['inactive', 'recvonly'].includes(videoTransceiver.direction)) {
        videoTransceiver.direction = 'sendrecv';
      }
      return videoTransceiver;
    }

    return peer.addTransceiver?.('video', { direction: 'sendrecv' }) || null;
  }, []);

  const attachVideoTrackToPeer = useCallback(async (videoTrack, stream) => {
    const peer = peerRef.current;
    if (!peer || !videoTrack) return;

    const videoSender = peer.getSenders().find((sender) => sender.track?.kind === 'video');
    if (videoSender) {
      await videoSender.replaceTrack(videoTrack);
      return;
    }

    const videoTransceiver = ensureVideoSendCapability(peer);
    if (videoTransceiver?.sender) {
      await videoTransceiver.sender.replaceTrack(videoTrack);
      return;
    }

    peer.addTrack(videoTrack, stream);
  }, [ensureVideoSendCapability]);

  const requestVideoTrack = async () => {
    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    return videoStream.getVideoTracks()[0] || null;
  };

  const getLocalStream = async (withVideo = false) => {
    if (localStreamRef.current) {
      if (!withVideo || localStreamRef.current.getVideoTracks().length) {
        return localStreamRef.current;
      }

      const videoTrack = await requestVideoTrack();
      if (videoTrack) {
        const nextStream = new MediaStream([
          ...localStreamRef.current.getAudioTracks(),
          videoTrack
        ]);
        localStreamRef.current = nextStream;
        setLocalStream(nextStream);
        setCameraOn(videoTrack.enabled);
        await attachVideoTrackToPeer(videoTrack, nextStream);
      }
      return localStreamRef.current;
    }

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
      if (isVideoCall) {
        ensureVideoSendCapability(peer);
      }

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      callUser({ toUserId, offer, callType: nextCallType });
    } catch (err) {
      setError('Could not start call');
      cleanup();
    }
  }, [callState, cleanup, createPeer, ensureVideoSendCapability]);

  const acceptIncomingCall = useCallback(async () => {
    if (!activeIncomingCall) return;

    try {
      setError('');
      setCallState('connecting');
      globalMarkCallConnecting?.();
      const nextCallType = activeIncomingCall.callType || 'audio';
      const isVideoCall = nextCallType === 'video';
      setCallType(nextCallType);
      callTypeRef.current = nextCallType;
      const stream = await getLocalStream(isVideoCall);
      const peer = createPeer(activeIncomingCall.fromUserId);
      addLocalTracks(peer, stream);

      await peer.setRemoteDescription(new RTCSessionDescription(activeIncomingCall.offer));
      if (isVideoCall) {
        ensureVideoSendCapability(peer);
      }
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      emitCallAccepted({ toUserId: activeIncomingCall.fromUserId, answer, callType: nextCallType });
      if (useGlobalIncomingCall && globalMarkCallInProgress) {
        globalMarkCallInProgress();
      } else {
        setIncomingCall(null);
      }
      setCallState('in-call');
      startTimer();
    } catch (err) {
      setError('Could not accept call');
      cleanup();
    }
  }, [
    activeIncomingCall,
    cleanup,
    createPeer,
    globalMarkCallConnecting,
    globalMarkCallInProgress,
    startTimer,
    useGlobalIncomingCall
  ]);

  const rejectIncomingCall = useCallback(() => {
    if (activeIncomingCall?.fromUserId) {
      emitEndCall({ toUserId: activeIncomingCall.fromUserId });
    }
    clearIncomingCall();
  }, [activeIncomingCall, clearIncomingCall]);

  const endCurrentCall = useCallback(() => {
    const peerUserId = activePeerIdRef.current;
    const wasConnected = callState === 'in-call';
    const elapsed = wasConnected ? stopTimer() : 0;
    const endedCallType = callTypeRef.current;

    if (activePeerIdRef.current) {
      emitEndCall({
        toUserId: activePeerIdRef.current,
        callType: endedCallType,
        durationSeconds: elapsed
      });
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

  const toggleCamera = useCallback(async () => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    if (!videoTracks.length) {
      try {
        const videoTrack = await requestVideoTrack();
        if (!videoTrack) return;

        const nextStream = new MediaStream([
          ...(localStreamRef.current?.getAudioTracks() || []),
          videoTrack
        ]);
        localStreamRef.current = nextStream;
        setLocalStream(nextStream);
        await attachVideoTrackToPeer(videoTrack, nextStream);
        setCameraOn(videoTrack.enabled);
      } catch (err) {
        setError('Could not enable camera');
      }
      return;
    }

    const nextCameraOn = !cameraOn;
    videoTracks.forEach((track) => {
      track.enabled = nextCameraOn;
    });
    if (nextCameraOn) {
      await attachVideoTrackToPeer(videoTracks[0], localStreamRef.current);
    }
    setCameraOn(nextCameraOn);
  }, [attachVideoTrackToPeer, cameraOn]);

  useEffect(() => {
    const socket = getCallSocket();

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

    socket.on('call-accepted', handleCallAccepted);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('end-call', handleEndCall);
    socket.on('call-error', handleCallError);

    return () => {
      socket.off('call-accepted', handleCallAccepted);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('end-call', handleEndCall);
      socket.off('call-error', handleCallError);
    };
  }, [cleanup, startTimer]);

  return {
    incomingCall: activeIncomingCall,
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
