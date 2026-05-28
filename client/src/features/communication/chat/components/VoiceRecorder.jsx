import { useEffect, useRef, useState } from 'react';

const formatDuration = (value) => {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function VoiceRecorder({ disabled, onSendVoice, onClose }) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const durationRef = useRef(0);
  const shouldSendRef = useRef(false);
  const startedRef = useRef(false);
  const [recordingState, setRecordingState] = useState('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      shouldSendRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const resetRecording = () => {
    setDuration(0);
    durationRef.current = 0;
    shouldSendRef.current = false;
    setError('');
  };

  const startRecording = async () => {
    if (disabled || startedRef.current) return;
    startedRef.current = true;
    resetRecording();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecordingState('idle');

        if (shouldSendRef.current && blob.size > 0) {
          onSendVoice(blob, durationRef.current);
        }

        resetRecording();
        onClose?.();
      };

      recorder.start();
      setRecordingState('recording');
      timerRef.current = setInterval(() => {
        setDuration((value) => {
          const nextValue = value + 1;
          durationRef.current = nextValue;
          return nextValue;
        });
      }, 1000);
    } catch (err) {
      setError('Microphone access failed');
      startedRef.current = false;
    }
  };

  useEffect(() => {
    startRecording();
  }, []);

  const stopRecording = (send = true) => {
    shouldSendRef.current = send;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      onClose?.();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCancel = () => {
    stopRecording(false);
  };

  return (
    <div className="rounded-2xl border border-green-100 bg-white p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
        >
          Cancel
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-green-50 px-4 py-2">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
          <span className="w-12 shrink-0 text-sm font-bold text-green-800">{formatDuration(duration)}</span>
          <div className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1">
            {Array.from({ length: 24 }, (_, index) => (
              <span
                key={index}
                className="w-1 animate-pulse rounded-full bg-green-500"
                style={{
                  height: `${18 + ((index * 17) % 52)}%`,
                  animationDelay: `${index * 45}ms`
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => stopRecording(true)}
          disabled={recordingState !== 'recording'}
          className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
