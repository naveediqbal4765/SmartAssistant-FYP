// Module: Wellness & Rehabilitation | Phase 6 — Audio Coaching
// Uses Web Speech API (SpeechSynthesis) for real-time voice feedback.
// No external libraries required.
import { useCallback, useEffect, useState } from 'react';

const VOICE_ENABLED_KEY = 'wellness_voice_enabled';
const SPEECH_RATE_KEY = 'wellness_speech_rate';

const clampRate = (rate) => Math.max(0.5, Math.min(1.5, Number(rate) || 0.85));

const getStoredVoiceEnabled = () => {
  const stored = localStorage.getItem(VOICE_ENABLED_KEY);
  return stored === null ? true : stored === 'true';
};

const getStoredSpeechRate = () => clampRate(localStorage.getItem(SPEECH_RATE_KEY) || 0.85);

export default function useAudioCoach() {
  const [voiceEnabled, setVoiceEnabled] = useState(getStoredVoiceEnabled);
  const [speechRate, setSpeechRate] = useState(getStoredSpeechRate);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((message, shouldSpeak) => {
    if (!voiceEnabled || !shouldSpeak || !message) return;
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(message);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [speechRate, voiceEnabled]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((current) => {
      const next = !current;
      localStorage.setItem(VOICE_ENABLED_KEY, String(next));
      if (!next && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      return next;
    });
  }, []);

  const setRate = useCallback((rate) => {
    const nextRate = clampRate(rate);
    localStorage.setItem(SPEECH_RATE_KEY, String(nextRate));
    setSpeechRate(nextRate);
  }, []);

  useEffect(() => (
    () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  ), []);

  return { voiceEnabled, speechRate, isSpeaking, speak, toggleVoice, setRate };
}
