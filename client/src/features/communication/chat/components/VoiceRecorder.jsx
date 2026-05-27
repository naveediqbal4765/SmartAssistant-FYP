import { useEffect, useRef, useState } from 'react';

export default function VoiceRecorder({ disabled, onSendVoice }) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [audioUrl]);

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl('');
    setDuration(0);
    setError('');
  };

  const startRecording = async () => {
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
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => {
        setDuration((value) => value + 1);
      }, 1000);
    } catch (err) {
      setError('Microphone access failed');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSend = () => {
    if (!audioBlob) return;
    onSendVoice(audioBlob, duration);
    resetRecording();
  };

  return (
    <div className="rounded-xl border bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button
            type="button"
            disabled={disabled}
            onClick={startRecording}
            className="rounded-xl bg-gray-800 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Record
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"
          >
            Stop
          </button>
        )}

        <span className="text-sm text-gray-700">{duration}s</span>

        {audioUrl && (
          <>
            <audio controls src={audioUrl} className="h-10 flex-1" />
            <button
              type="button"
              onClick={handleSend}
              className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white"
            >
              Send voice
            </button>
            <button
              type="button"
              onClick={resetRecording}
              className="rounded-xl bg-gray-200 px-4 py-2 font-semibold"
            >
              Discard
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
