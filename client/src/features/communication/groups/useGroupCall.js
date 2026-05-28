import { useCallback, useEffect, useRef, useState } from 'react';
import { getChatSocket } from '../chat/services/socket';

const peerConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const getUserId = (value) => String(value?._id || value || '');

export default function useGroupCall({ group, currentUserId, currentUserName }) {
  const groupId = String(group?._id || '');
  const peersRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const callTypeRef = useRef('audio');
  const groupIdRef = useRef(groupId);
  const callStateRef = useRef('idle');
  const startedAtRef = useRef(null);
  const durationTimerRef = useRef(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('audio');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    groupIdRef.current = groupId;
  }, [groupId]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const publishRemoteStreams = useCallback(() => {
    setRemoteStreams(Array.from(remoteStreamsRef.current.values()).map((entry) => ({
      userId: entry.userId,
      name: entry.name,
      stream: new MediaStream(entry.stream.getTracks())
    })));
  }, []);

  const stopTimer = useCallback(() => {
    if (durationTimerRef.current) {
      window.clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    startedAtRef.current = null;
    setDurationSeconds(0);
  }, []);

  const startTimer = useCallback(() => {
    if (startedAtRef.current) return;
    startedAtRef.current = Date.now();
    durationTimerRef.current = window.setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
  }, []);

  const closePeer = useCallback((peerUserId) => {
    const normalizedPeerId = String(peerUserId);
    peersRef.current.get(normalizedPeerId)?.close();
    peersRef.current.delete(normalizedPeerId);
    remoteStreamsRef.current.delete(normalizedPeerId);
    publishRemoteStreams();
  }, [publishRemoteStreams]);

  const cleanup = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    remoteStreamsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams([]);
    setMuted(false);
    setCameraOn(false);
    setCallState('idle');
    setError('');
    stopTimer();
  }, [stopTimer]);

  const getLocalStream = useCallback(async (nextCallType = 'audio') => {
    if (localStreamRef.current) return localStreamRef.current;

    const isVideoCall = nextCallType === 'video';
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoCall });
    } catch (err) {
      if (!isVideoCall) throw err;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    setCameraOn(stream.getVideoTracks().some((track) => track.enabled));
    return stream;
  }, []);

  const createPeer = useCallback((peerUserId, peerName = 'Member') => {
    const normalizedPeerId = String(peerUserId);
    const existingPeer = peersRef.current.get(normalizedPeerId);
    if (existingPeer) return existingPeer;

    const peer = new RTCPeerConnection(peerConfig);
    const remote = new MediaStream();
    remoteStreamsRef.current.set(normalizedPeerId, {
      userId: normalizedPeerId,
      name: peerName,
      stream: remote
    });
    publishRemoteStreams();

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current);
    });

    peer.onicecandidate = (event) => {
      if (!event.candidate || !groupId) return;
      getChatSocket().emit('group-call:ice-candidate', {
        groupId,
        targetUserId: normalizedPeerId,
        candidate: event.candidate
      });
    };

    peer.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remote.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
          remote.addTrack(track);
        }
      });
      publishRemoteStreams();
    };

    peer.onconnectionstatechange = () => {
      if (['closed', 'failed', 'disconnected'].includes(peer.connectionState)) {
        closePeer(normalizedPeerId);
      }
    };

    peersRef.current.set(normalizedPeerId, peer);
    return peer;
  }, [closePeer, groupId, publishRemoteStreams]);

  const createOfferForPeer = useCallback(async (participant) => {
    const peerUserId = getUserId(participant.userId);
    if (!peerUserId || peerUserId === String(currentUserId)) return;

    const peer = createPeer(peerUserId, participant.name);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    getChatSocket().emit('group-call:offer', {
      groupId,
      targetUserId: peerUserId,
      offer
    });
  }, [createPeer, currentUserId, groupId]);

  const replaceVideoTrackForAllPeers = useCallback(async (videoTrack) => {
    if (!videoTrack) return;

    await Promise.all(Array.from(peersRef.current.values()).map(async (peer) => {
      const videoSender = peer.getSenders().find((sender) => sender.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(videoTrack);
        return;
      }

      if (localStreamRef.current) {
        peer.addTrack(videoTrack, localStreamRef.current);
      }
    }));
  }, []);

  const startGroupCall = useCallback(async (nextCallType = 'audio') => {
    if (!groupId || callState !== 'idle') return;

    try {
      setError('');
      callTypeRef.current = nextCallType;
      setCallType(nextCallType);
      setCallState('joining');
      await getLocalStream(nextCallType);

      getChatSocket().emit('group-call:start', { groupId, callType: nextCallType }, (response) => {
        if (!response?.success) {
          setError(response?.msg || 'Failed to start group call');
          cleanup();
          return;
        }
        setActiveCall(response.call);
        setCallState('in-call');
        startTimer();
      });
    } catch (err) {
      setError('Could not start group call');
      cleanup();
    }
  }, [callState, cleanup, getLocalStream, groupId, startTimer]);

  const joinGroupCall = useCallback(async () => {
    if (!groupId || callState !== 'idle') return;

    try {
      const nextCallType = activeCall?.callType || 'audio';
      setError('');
      callTypeRef.current = nextCallType;
      setCallType(nextCallType);
      setCallState('joining');
      await getLocalStream(nextCallType);

      getChatSocket().emit('group-call:join-existing', { groupId, callId: activeCall?.callId }, (response) => {
        if (!response?.success) {
          setError(response?.msg || 'Failed to join group call');
          cleanup();
          return;
        }
        setActiveCall(response.call);
        setCallState('in-call');
        startTimer();
      });
    } catch (err) {
      setError('Could not join group call');
      cleanup();
    }
  }, [activeCall?.callId, activeCall?.callType, callState, cleanup, getLocalStream, groupId, startTimer]);

  const syncActiveCall = useCallback((call) => {
    setActiveCall(call || null);
  }, []);

  const leaveGroupCall = useCallback(() => {
    if (groupId && callState !== 'idle') {
      getChatSocket().emit('group-call:user-left', { groupId });
    }
    cleanup();
  }, [callState, cleanup, groupId]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }, [muted]);

  const toggleCamera = useCallback(async () => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    if (!videoTracks.length) return;

    const nextCameraOn = !cameraOn;
    videoTracks.forEach((track) => {
      track.enabled = nextCameraOn;
    });
    if (nextCameraOn) {
      await replaceVideoTrackForAllPeers(videoTracks[0]);
    }
    setCameraOn(nextCameraOn);
  }, [cameraOn, replaceVideoTrackForAllPeers]);

  useEffect(() => {
    const socket = getChatSocket();

    const isCurrentGroup = (payload) => String(payload?.groupId || '') === groupId;

    const handleCallStarted = (payload) => {
      if (!isCurrentGroup(payload)) return;
      setActiveCall(payload);
    };

    const handleUserJoined = async ({ groupId: eventGroupId, participant }) => {
      if (String(eventGroupId || '') !== groupId || callState !== 'in-call') return;
      await createOfferForPeer(participant);
    };

    const handleOffer = async ({ groupId: eventGroupId, fromUserId, fromName, offer }) => {
      if (String(eventGroupId || '') !== groupId || !offer) return;
      if (callState === 'idle') return;

      const peer = createPeer(fromUserId, fromName);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('group-call:answer', {
        groupId,
        targetUserId: fromUserId,
        answer
      });
    };

    const handleAnswer = async ({ groupId: eventGroupId, fromUserId, answer }) => {
      if (String(eventGroupId || '') !== groupId || !answer) return;
      const peer = peersRef.current.get(String(fromUserId));
      if (!peer) return;
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIceCandidate = async ({ groupId: eventGroupId, fromUserId, candidate }) => {
      if (String(eventGroupId || '') !== groupId || !candidate) return;
      const peer = peersRef.current.get(String(fromUserId));
      if (!peer) return;
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const handleUserLeft = ({ groupId: eventGroupId, userId }) => {
      if (String(eventGroupId || '') !== groupId) return;
      closePeer(userId);
      setActiveCall((current) => current ? {
        ...current,
        participants: (current.participants || []).filter((participant) => getUserId(participant.userId) !== String(userId))
      } : current);
    };

    const handleCallEnded = (payload) => {
      if (!isCurrentGroup(payload)) return;
      setActiveCall(null);
      cleanup();
    };

    socket.on('group-call:start', handleCallStarted);
    socket.on('group-call:user-joined', handleUserJoined);
    socket.on('group-call:offer', handleOffer);
    socket.on('group-call:answer', handleAnswer);
    socket.on('group-call:ice-candidate', handleIceCandidate);
    socket.on('group-call:user-left', handleUserLeft);
    socket.on('group-call:end', handleCallEnded);

    return () => {
      socket.off('group-call:start', handleCallStarted);
      socket.off('group-call:user-joined', handleUserJoined);
      socket.off('group-call:offer', handleOffer);
      socket.off('group-call:answer', handleAnswer);
      socket.off('group-call:ice-candidate', handleIceCandidate);
      socket.off('group-call:user-left', handleUserLeft);
      socket.off('group-call:end', handleCallEnded);
    };
  }, [callState, cleanup, closePeer, createOfferForPeer, createPeer, groupId]);

  useEffect(() => {
    cleanup();
    setActiveCall(null);
    return () => {
      if (groupIdRef.current && callStateRef.current !== 'idle') {
        getChatSocket().emit('group-call:user-left', { groupId: groupIdRef.current });
      }
    };
  }, [cleanup, groupId]);

  return {
    activeCall,
    callState,
    callType,
    localStream,
    localParticipant: {
      userId: currentUserId,
      name: currentUserName || 'You',
      stream: localStream
    },
    remoteStreams,
    muted,
    cameraOn,
    durationSeconds,
    error,
    startGroupCall,
    joinGroupCall,
    syncActiveCall,
    leaveGroupCall,
    toggleMute,
    toggleCamera
  };
}
