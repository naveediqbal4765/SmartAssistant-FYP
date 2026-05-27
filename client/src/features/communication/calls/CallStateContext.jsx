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
    stopCallSound();
    setIncomingCall(null);
    updateCallStatus('idle');
  }, [updateCallStatus]);

  const markCallConnecting = useCallback(() => {
    stopCallSound();
    updateCallStatus('connecting');
  }, [updateCallStatus]);

  const markCallInProgress = useCallback(() => {
    stopCallSound();
    setIncomingCall(null);
    updateCallStatus('in-call');
  }, [updateCallStatus]);

  useEffect(() => {
    const socket = getCallSocket();

    const handleIncomingCall = ({ fromUserId, fromName, offer, callType = 'audio' }) => {
      if (callStatusRef.current !== 'idle') {
        emitEndCall({ toUserId: fromUserId });
        return;
      }

      setIncomingCall({ fromUserId, fromName, offer, callType });
      startCallSound();
      updateCallStatus('ringing');
    };

    socket.on('call-user', handleIncomingCall);

    return () => {
      stopCallSound();
      socket.off('call-user', handleIncomingCall);
    };
  }, [updateCallStatus]);

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
