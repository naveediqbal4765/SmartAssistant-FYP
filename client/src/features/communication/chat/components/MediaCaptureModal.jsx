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
  onFallback,
  fillContainer = false
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

  const wrapperClassName = fillContainer
    ? 'h-full w-full'
    : 'absolute inset-x-0 bottom-full z-[90] px-3 pb-3';
  const panelClassName = fillContainer
    ? 'flex h-full w-full flex-col overflow-hidden bg-gray-950'
    : 'mx-auto flex h-[calc(70vh-10rem)] min-h-[260px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-gray-950 shadow-2xl shadow-gray-900/20 ring-1 ring-black/10';

  return (
    <div className={wrapperClassName}>
      <div className={panelClassName}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-gray-950/90 px-4 py-3 text-white">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold">{isPhotoMode ? 'Take Photo' : 'Record Video'}</h2>
            <p className="truncate text-xs text-white/70">
              {isPhotoMode ? 'Capture a photo before sending.' : 'Record and preview before sending.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white/80 transition hover:bg-white/15">
            X
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
            {capturedFile && previewUrl ? (
              isPhotoMode ? (
                <img src={previewUrl} alt="Captured preview" className="h-full w-full object-cover" />
              ) : (
                <video src={previewUrl} controls className="h-full w-full object-cover" />
              )
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            )}
          </div>
          {error && <p className="absolute inset-x-4 top-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 shadow-lg">{error}</p>}
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-end gap-2 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-4 pt-10">
            {error && (
              <button type="button" onClick={useFallback} className="rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white">
                Choose From Files
              </button>
            )}
            {capturedFile ? (
              <>
                <button type="button" onClick={resetCapture} className="rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white">
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

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
