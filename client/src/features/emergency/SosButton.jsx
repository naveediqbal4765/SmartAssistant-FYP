import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader, Siren } from 'lucide-react';
import Button from '../../components/ui/Button';
import StatusAlert from '../../components/ui/StatusAlert';
import { overlayLayers } from '../../components/ui/overlayLayers';
import { getEmergencyErrorMessage, triggerEmergency } from './emergencyApi';

const COUNTDOWN_SECONDS = 5;
const TICK_MS = 250;

const BUTTON_SIZE = 80; // matches the h-20 w-20 classes on the button
const EDGE_MARGIN = 8;
const DEFAULT_MARGIN = 24;
const DRAG_THRESHOLD_PX = 6; // smaller movements still count as a tap
const KEY_STEP_PX = 24;
const POSITION_STORAGE_KEY = 'sosButtonPosition';

// Keeps the whole button inside the visible window.
const clampPosition = ({ x, y }) => ({
  x: Math.min(
    Math.max(x, EDGE_MARGIN),
    Math.max(EDGE_MARGIN, window.innerWidth - BUTTON_SIZE - EDGE_MARGIN)
  ),
  y: Math.min(
    Math.max(y, EDGE_MARGIN),
    Math.max(EDGE_MARGIN, window.innerHeight - BUTTON_SIZE - EDGE_MARGIN)
  )
});

const getDefaultPosition = () => clampPosition({
  x: window.innerWidth - BUTTON_SIZE - DEFAULT_MARGIN,
  y: window.innerHeight - BUTTON_SIZE - DEFAULT_MARGIN
});

const loadPosition = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY) || 'null');
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
      return clampPosition(saved);
    }
  } catch {
    // Saved position is a convenience only; fall back to the default corner.
  }

  return getDefaultPosition();
};

const savePosition = (position) => {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Best effort only; the button still works without remembering its spot.
  }
};

const getBrowserPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }),
      // If the browser cannot give a position, the server falls back to the
      // location saved on the senior's profile, so the alert is still sent.
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });

const formatRadius = (radiusMeters) => (
  radiusMeters ? `${radiusMeters / 1000} km` : null
);

/**
 * Floating SOS button for seniors.
 * Tap -> 5 second countdown (cancellable) -> alert is routed to linked
 * caregivers and nearby volunteers by POST /api/emergency/trigger.
 */
export default function SosButton({ enabled = false }) {
  const [phase, setPhase] = useState('idle'); // idle | countdown | sending | sent | error
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [routing, setRouting] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const phaseRef = useRef('idle');
  const deadlineRef = useRef(0);

  // Top-left corner of the floating button, in pixels.
  const [position, setPosition] = useState(loadPosition);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const updatePhase = useCallback((nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const sendAlert = useCallback(async () => {
    // Guard against double submits (tap on "Send now" + timer finishing).
    if (phaseRef.current === 'sending' || phaseRef.current === 'sent') return;

    updatePhase('sending');
    setErrorMessage('');

    try {
      const location = await getBrowserPosition();
      const result = await triggerEmergency({ location });
      setRouting(result.routing || null);
      updatePhase('sent');
    } catch (err) {
      setErrorMessage(getEmergencyErrorMessage(err));
      updatePhase('error');
    }
  }, [updatePhase]);

  const startCountdown = () => {
    deadlineRef.current = Date.now() + COUNTDOWN_SECONDS * 1000;
    setSecondsLeft(COUNTDOWN_SECONDS);
    setRouting(null);
    setErrorMessage('');
    updatePhase('countdown');
  };

  const close = useCallback(() => {
    updatePhase('idle');
  }, [updatePhase]);

  // Drives the countdown from a fixed deadline so it stays accurate even if
  // the browser throttles timers in a background tab.
  useEffect(() => {
    if (phase !== 'countdown') return undefined;

    const intervalId = setInterval(() => {
      const remainingMs = deadlineRef.current - Date.now();

      if (remainingMs <= 0) {
        clearInterval(intervalId);
        sendAlert();
        return;
      }

      setSecondsLeft(Math.ceil(remainingMs / 1000));
    }, TICK_MS);

    return () => clearInterval(intervalId);
  }, [phase, sendAlert]);

  // Escape cancels while the countdown is running.
  useEffect(() => {
    if (phase !== 'countdown') return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, close]);

  // Keep the button on screen when the window is resized or rotated.
  useEffect(() => {
    const handleResize = () => setPosition((current) => clampPosition(current));

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
      latest: position
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;

    drag.moved = true;
    drag.latest = clampPosition({ x: drag.originX + deltaX, y: drag.originY + deltaY });
    setPosition(drag.latest);
  };

  const handlePointerEnd = (event, { cancelled = false } = {}) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (drag.moved && !cancelled) {
      // The click that follows a drag must not open the countdown.
      suppressClickRef.current = true;
      savePosition(drag.latest);
    }
  };

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    startCountdown();
  };

  // Arrow keys move the button for people who cannot drag.
  const handleButtonKeyDown = (event) => {
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    };
    const direction = directions[event.key];
    if (!direction) return;

    event.preventDefault();
    const next = clampPosition({
      x: position.x + direction[0] * KEY_STEP_PX,
      y: position.y + direction[1] * KEY_STEP_PX
    });
    setPosition(next);
    savePosition(next);
  };

  if (!enabled) return null;

  const radiusLabel = formatRadius(routing?.radiusMeters);

  return (
    <>
      <div
        className={`fixed ${overlayLayers.popover}`}
        style={{ left: position.x, top: position.y }}
      >
        <Button
          variant="danger"
          size="lg"
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={(event) => handlePointerEnd(event, { cancelled: true })}
          onKeyDown={handleButtonKeyDown}
          disabled={phase !== 'idle'}
          title="Tap to send an SOS. Drag to move this button."
          aria-label="Send emergency SOS alert. Drag, or use the arrow keys, to move this button."
          className="h-20 w-20 cursor-grab touch-none select-none flex-col rounded-full text-xl shadow-lg active:cursor-grabbing"
        >
          <Siren size={28} aria-hidden="true" />
          SOS
        </Button>
      </div>

      {phase !== 'idle' && (
        <div
          className={`fixed inset-0 flex items-center justify-center bg-black/50 p-4 ${overlayLayers.modal}`}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="sos-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            {phase === 'countdown' && (
              <>
                <h2 id="sos-dialog-title" className="text-2xl font-bold text-gray-900">
                  Sending emergency alert
                </h2>
                <p className="mt-2 text-gray-700">
                  Your caregivers and nearby volunteers will be alerted in
                </p>
                <p
                  className="my-4 text-5xl font-bold text-red-700"
                  aria-live="assertive"
                  aria-atomic="true"
                >
                  {secondsLeft}
                </p>
                <div className="flex flex-col gap-3">
                  <Button variant="secondary" size="lg" onClick={close}>
                    Cancel - I am okay
                  </Button>
                  <Button variant="danger" size="lg" onClick={sendAlert}>
                    Send now
                  </Button>
                </div>
              </>
            )}

            {phase === 'sending' && (
              <>
                <h2 id="sos-dialog-title" className="text-2xl font-bold text-gray-900">
                  Sending alert...
                </h2>
                <div className="mt-4 flex justify-center text-red-700">
                  <Loader size={36} className="animate-spin" aria-hidden="true" />
                </div>
              </>
            )}

            {phase === 'sent' && (
              <>
                <h2 id="sos-dialog-title" className="text-2xl font-bold text-gray-900">
                  Help is on the way
                </h2>
                <StatusAlert variant="success" className="mt-4 text-left">
                  <p className="font-semibold">Your emergency alert was sent.</p>
                  <p className="mt-1 text-sm">
                    {routing
                      ? `${routing.caregiverCount} caregiver(s) and ${routing.volunteerCount} volunteer(s)${radiusLabel ? ` within ${radiusLabel}` : ''} were notified.`
                      : 'Your caregivers and nearby volunteers were notified.'}
                  </p>
                </StatusAlert>
                <Button variant="primary" size="lg" onClick={close} className="w-full">
                  Close
                </Button>
              </>
            )}

            {phase === 'error' && (
              <>
                <h2 id="sos-dialog-title" className="text-2xl font-bold text-gray-900">
                  Alert not sent
                </h2>
                <StatusAlert variant="error" className="mt-4 text-left">
                  {errorMessage}
                </StatusAlert>
                <div className="flex flex-col gap-3">
                  <Button variant="danger" size="lg" onClick={sendAlert}>
                    Try again
                  </Button>
                  <Button variant="secondary" size="lg" onClick={close}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
