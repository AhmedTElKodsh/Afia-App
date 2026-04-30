import { useEffect, useRef, useState } from 'react';

interface Props {
  onCapture: (imageBase64: string) => void;
  disabled: boolean;
}

export function CameraScreen({ onCapture, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        setCameraError(err.name === 'NotAllowedError' ? 'Camera permission denied' : 'Camera unavailable');
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = () => {
    if (disabled || !videoRef.current || !ready) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const maxW = 1280;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85).replace(/^data:image\/jpeg;base64,/, '');
    onCapture(base64);
  };

  if (cameraError) {
    return (
      <div className="demo-camera-error">
        <p>{cameraError}</p>
        <p style={{ fontSize: 14, color: '#999', marginTop: 8 }}>Allow camera access and reload</p>
      </div>
    );
  }

  return (
    <div className="demo-camera-container">
      {/* Live camera feed */}
      <video
        ref={videoRef}
        className="demo-camera-video"
        autoPlay
        playsInline
        muted
      />

      {/* Top instruction banner */}
      <div className="demo-camera-banner">
        <div className="demo-camera-banner-main">Shoot the frontside with handle on the right →</div>
        <div className="demo-camera-banner-sub">Align the outline to the bottle as best you can</div>
        <div className="demo-camera-banner-sub">Ensure Afia logo is visible</div>
      </div>

      {/* Bottle outline overlay — static guidance only */}
      <div className="demo-bottle-outline-wrapper">
        <img
          src="/afia-bottle-outline.svg"
          alt="bottle guide"
          className="demo-bottle-outline"
          draggable={false}
        />
      </div>

      {/* Capture button */}
      <button
        className={`demo-capture-btn${disabled ? ' demo-capture-btn--disabled' : ''}`}
        onClick={capture}
        disabled={disabled}
        aria-label="Capture photo"
      >
        <span className="demo-capture-btn-inner" />
      </button>
    </div>
  );
}
