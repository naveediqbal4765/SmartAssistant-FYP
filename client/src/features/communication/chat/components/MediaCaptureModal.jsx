import { useEffect, useRef, useState } from 'react';

const getVideoMimeType = () => {
  if (!window.MediaRecorder) return '';
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) return 'video/webm;codecs=vp8,opus';
  if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm';
  return '';
};

export default function MediaCaptureModal({
  open,
  mode,
  onClose,
  onCapture,
  onFallback
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const previewUrlRef = useRef('');
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [capturedFile, setCapturedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const cleanupPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setPreviewUrl('');
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const resetCapture = () => {
    cleanupPreview();
    setCapturedFile(null);
    setError('');
  };

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    resetCapture();

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera capture is not supported in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: mode === 'video'
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (!cancelled) {
          setError('Could not access camera. You can choose media from files instead.');
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      recorderRef.current?.state === 'recording' && recorderRef.current.stop();
      stopStream();
      cleanupPreview();
      setRecording(false);
      setCapturedFile(null);
    };
  }, [mode, open]);

  useEffect(() => {
    if (videoRef.current && streamRef.current && !capturedFile) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [capturedFile]);

  if (!open) return null;

  const isPhotoMode = mode === 'photo';

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setCapturedFile(file);
      setPreviewUrl(url);
    }, 'image/jpeg', 0.9);
  };

  const startRecording = () => {
    if (!streamRef.current || !window.MediaRecorder) {
      setError('Video recording is not supported in this browser.');
      return;
    }

    chunksRef.current = [];
    const mimeType = getVideoMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const type = mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type });
      const file = new File([blob], `video-${Date.now()}.webm`, { type });
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setCapturedFile(file);
      setPreviewUrl(url);
      setRecording(false);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  const sendCapture = () => {
    if (!capturedFile) return;
    onCapture?.(capturedFile);
    onClose?.();
  };

  const useFallback = () => {
    onClose?.();
    onFallback?.();
  };

  return (
    <div className="absolute inset-x-3 bottom-20 z-[90]">
      <div className="mx-auto flex max-h-[65vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-gray-900/20 ring-1 ring-black/10">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-gray-900">{isPhotoMode ? 'Take Photo' : 'Record Video'}</h2>
            <p className="truncate text-xs text-gray-600">
              {isPhotoMode ? 'Capture a photo before sending.' : 'Record and preview before sending.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-gray-500 transition hover:bg-gray-200">
            X
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-gray-950 p-3">
          <div className="flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl bg-black">
            {capturedFile && previewUrl ? (
              isPhotoMode ? (
                <img src={previewUrl} alt="Captured preview" className="max-h-[42vh] w-full object-contain" />
              ) : (
                <video src={previewUrl} controls className="max-h-[42vh] w-full object-contain" />
              )
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="max-h-[42vh] w-full object-contain" />
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
        {error && <p className="mx-4 mt-3 shrink-0 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-white px-4 py-3">
          {error && (
            <button type="button" onClick={useFallback} className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-300">
              Choose From Files
            </button>
          )}
          {capturedFile ? (
            <>
              <button type="button" onClick={resetCapture} className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-300">
                Retake
              </button>
              <button type="button" onClick={sendCapture} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700">
                Send
              </button>
            </>
          ) : isPhotoMode ? (
            <button type="button" onClick={capturePhoto} disabled={Boolean(error)} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50">
              Capture
            </button>
          ) : recording ? (
            <button type="button" onClick={stopRecording} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700">
              Stop Recording
            </button>
          ) : (
            <button type="button" onClick={startRecording} disabled={Boolean(error)} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50">
              Start Recording
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
