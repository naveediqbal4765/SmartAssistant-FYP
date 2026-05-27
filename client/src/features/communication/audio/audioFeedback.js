let audioContext = null;
let lastNotificationAt = 0;
let lastReminderAt = 0;
let callRingTimer = null;
let callRingActive = false;
const callRingNodes = new Set();

const NOTIFICATION_DEBOUNCE_MS = 900;
const REMINDER_DEBOUNCE_MS = 2500;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }

  return audioContext;
};

const unlockAudio = () => {
  const context = getAudioContext();
  if (context?.state === 'suspended') {
    context.resume().catch(() => {});
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

const playTone = ({ frequency, duration, startTime = 0, volume = 0.045, type = 'sine', context }) => {
  const audioContextForTone = context || getAudioContext();
  if (!audioContextForTone || audioContextForTone.state === 'suspended') return null;

  const oscillator = audioContextForTone.createOscillator();
  const gain = audioContextForTone.createGain();
  const start = audioContextForTone.currentTime + startTime;
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(audioContextForTone.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
  return { oscillator, gain };
};

const disconnectToneNode = ({ oscillator, gain }) => {
  try {
    oscillator.disconnect();
  } catch (err) {
    // The node may already be disconnected by a prior cleanup.
  }
  try {
    gain.disconnect();
  } catch (err) {
    // The node may already be disconnected by a prior cleanup.
  }
};

export const playNotificationSound = () => {
  const now = Date.now();
  if (now - lastNotificationAt < NOTIFICATION_DEBOUNCE_MS) return;
  lastNotificationAt = now;

  playTone({ frequency: 880, duration: 0.11, volume: 0.035 });
  playTone({ frequency: 1175, duration: 0.14, startTime: 0.08, volume: 0.028 });
};

export const playReminderSound = () => {
  const now = Date.now();
  if (now - lastReminderAt < REMINDER_DEBOUNCE_MS) return;
  lastReminderAt = now;

  const context = getAudioContext();
  if (!context) return;

  const playPhrase = () => {
    playTone({ context, frequency: 660, duration: 0.16, volume: 0.06, type: 'triangle' });
    playTone({ context, frequency: 880, duration: 0.16, startTime: 0.18, volume: 0.055, type: 'triangle' });
    playTone({ context, frequency: 660, duration: 0.2, startTime: 0.38, volume: 0.045, type: 'triangle' });
  };

  if (context.state === 'suspended') {
    context.resume().then(playPhrase).catch(() => {});
    return;
  }

  playPhrase();
};

const playCallRingPhrase = () => {
  [
    playTone({ frequency: 440, duration: 0.22, volume: 0.055 }),
    playTone({ frequency: 554, duration: 0.22, startTime: 0.28, volume: 0.05 })
  ].forEach((node) => {
    if (!node) return;
    callRingNodes.add(node);
    node.oscillator.addEventListener('ended', () => {
      disconnectToneNode(node);
      callRingNodes.delete(node);
    }, { once: true });
  });
};

export const startCallSound = () => {
  stopCallSound();
  callRingActive = true;
  playCallRingPhrase();
  callRingTimer = window.setInterval(playCallRingPhrase, 1700);
};

export const stopCallSound = () => {
  callRingActive = false;
  if (callRingTimer) {
    window.clearInterval(callRingTimer);
    callRingTimer = null;
  }
  callRingNodes.forEach((node) => {
    try {
      node.oscillator.stop();
    } catch (err) {
      // The oscillator may already have ended naturally.
    }
    disconnectToneNode(node);
  });
  callRingNodes.clear();
};
