import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { startCallSound, stopCallSound } from '../audio/audioFeedback';
import { endCall as emitEndCall, getCallSocket } from './callSocket';

const CallStateContext = createContext(null);

export function CallStateProvider({ children }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle');
  const callStatusRef = useRef('idle');

  const updateCallStatus = useCallback((nextStatus) => {
    callStatusRef.current = nextStatus;
    setCallStatus(nextStatus);
  }, []);

  const resetCallState = useCallback(() => {
    setIncomingCall(null);
    updateCallStatus('idle');
  }, [updateCallStatus]);

  const markCallConnecting = useCallback(() => {
    updateCallStatus('connecting');
  }, [updateCallStatus]);

  const markCallInProgress = useCallback(() => {
    setIncomingCall(null);
    updateCallStatus('in-call');
  }, [updateCallStatus]);

  useEffect(() => {
    const shouldRing = Boolean(incomingCall) && callStatus === 'ringing';

    if (shouldRing) {
      startCallSound();
      return () => stopCallSound();
    }

    stopCallSound();
    return undefined;
  }, [callStatus, incomingCall]);

  useEffect(() => {
    const socket = getCallSocket();

    const handleIncomingCall = ({ fromUserId, fromName, offer, callType = 'audio' }) => {
      if (callStatusRef.current !== 'idle') {
        emitEndCall({ toUserId: fromUserId });
        return;
      }

      setIncomingCall({ fromUserId, fromName, offer, callType });
      updateCallStatus('ringing');
    };

    const handleTerminalCallEvent = () => {
      resetCallState();
    };

    socket.on('call-user', handleIncomingCall);
    socket.on('call-accepted', handleTerminalCallEvent);
    socket.on('end-call', handleTerminalCallEvent);
    socket.on('call-error', handleTerminalCallEvent);
    socket.on('disconnect', handleTerminalCallEvent);

    return () => {
      stopCallSound();
      socket.off('call-user', handleIncomingCall);
      socket.off('call-accepted', handleTerminalCallEvent);
      socket.off('end-call', handleTerminalCallEvent);
      socket.off('call-error', handleTerminalCallEvent);
      socket.off('disconnect', handleTerminalCallEvent);
    };
  }, [resetCallState, updateCallStatus]);

  const value = useMemo(() => ({
    incomingCall,
    isIncomingCall: Boolean(incomingCall),
    callStatus,
    resetCallState,
    markCallConnecting,
    markCallInProgress
  }), [callStatus, incomingCall, markCallConnecting, markCallInProgress, resetCallState]);

  return (
    <CallStateContext.Provider value={value}>
      {children}
    </CallStateContext.Provider>
  );
}

export function useCallState() {
  const context = useContext(CallStateContext);
  if (!context) {
    throw new Error('useCallState must be used within CallStateProvider');
  }
  return context;
}

export function useOptionalCallState() {
  return useContext(CallStateContext);
}
