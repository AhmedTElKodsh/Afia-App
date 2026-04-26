import {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { Camera, AlertTriangle, RotateCcw, Flashlight, FlashlightOff, X } from "lucide-react";
import "./CameraViewfinder.css";
import {
  CAMERA_CONFIG,
  getVideoConstraints,
  checkTorchSupport,
} from "../config/camera";
import { OrientationGuide } from "./OrientationGuide";
import jsQR from "jsqr";

interface CameraViewfinderProps {
  onCapture: (base64: string, qrData: string | null) => void;
  onError: (message: string) => void;
  onPermissionDenied: () => void;
  onCancel?: () => void;
  preferBackCamera?: boolean;
}

type CameraState = 'idle' | 'requesting' | 'active' | 'permission-denied' | 'error';

function StaticBottleOutline() {
  return (
    <div className="bottle-guide-wrapper">
      <svg
        className="bottle-guide-svg"
        viewBox="0 0 100 301"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g
          stroke="rgba(255,255,255,0.85)"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeWidth="2.5"
          fill="none"
        >
          {/* Cap */}
          <path
            d="M 43 4 L 57 4 C 58.5 4 59 5 59 6 L 59 19 L 41 19 L 41 6 C 41 5 41.5 4 43 4 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Neck */}
          <path
            d="M 41.5 19 L 58.5 19 L 58.5 36 C 58.5 38 58 39 57.5 40 L 42.5 40 C 42 39 41.5 38 41.5 36 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Shoulder */}
          <path
            d="M 42.5 40 L 57.5 40 C 60 42 64 45 70 50 C 78 56 84 62 88 70 L 12 70 C 16 62 22 56 30 50 C 36 45 40 42 42.5 40 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Body */}
          <path
            d="M 12 70 L 88 70 C 90 80 90.5 92 90 105 C 89 130 86 155 86 180 C 86 215 87 240 86 260 L 14 260 C 13 240 14 215 14 180 C 14 155 11 130 10 105 C 9.5 92 10 80 12 70 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Base */}
          <path
            d="M 14 260 L 86 260 C 86.5 270 86 280 84 288 C 82 294 78 297 73 297 L 27 297 C 22 297 18 294 16 288 C 14 280 13.5 270 14 260 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Handle */}
          <path
            d="M 84 102 C 86.5 102 88 105 88 109 L 88 132 C 88 136 86.5 139 84 139 C 81.5 139 80 136 80 132 L 80 109 C 80 105 81.5 102 84 102 Z"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
}

export function CameraViewfinder({
  onCapture,
  onError,
  onPermissionDenied,
  onCancel,
  preferBackCamera = true,
}: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCapturingRef = useRef(false);
  const isStartingRef = useRef(false);

  const { t } = useTranslation();
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        onError(t('camera.captureError'));
        return;
      }
      canvas.width = CAMERA_CONFIG.capture.width;
      canvas.height = CAMERA_CONFIG.capture.height;
      context.drawImage(video, 0, 0, CAMERA_CONFIG.capture.width, CAMERA_CONFIG.capture.height);
      const imageBase64 = canvas.toDataURL('image/jpeg', CAMERA_CONFIG.jpegQuality);
      const base64Only = (imageBase64 || '').replace(/^data:image\/jpeg;base64,/, '');
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 200);
      let detectedQrData: string | null = null;
      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        detectedQrData = code ? code.data : null;
      } catch (qrErr) {
        console.warn("QR detection failed:", qrErr);
      }
      onCapture(base64Only, detectedQrData);
    } catch (error) {
      console.error('Capture error:', error);
      onError(t('camera.captureFailed'));
    } finally {
      isCapturingRef.current = false;
    }
  }, [onCapture, onError, t]);

  const startCamera = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setCameraState('requesting');
    try {
      setTorchOn(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const constraints = getVideoConstraints(preferBackCamera);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const hasTorch = await checkTorchSupport(stream);
      setTorchSupported(hasTorch);
      setCameraState('active');
      isStartingRef.current = false;
    } catch (error) {
      isStartingRef.current = false;
      const err = error as Error;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('permission-denied');
        onPermissionDenied();
      } else {
        setCameraState('error');
        onError(t('camera.captureError'));
      }
    }
  }, [onError, onPermissionDenied, preferBackCamera, t]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;
      let capabilities: (MediaTrackCapabilities & { torch?: boolean }) | null = null;
      try { capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }; } catch { return; }
      if (!capabilities?.torch) return;
      const newTorchState = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: newTorchState } as MediaTrackConstraintSet & { torch?: boolean }] });
      setTorchOn(newTorchState);
    } catch (error) { console.error('Torch error:', error); }
  }, [torchOn]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const isNonActive = cameraState === 'requesting' || cameraState === 'permission-denied' || cameraState === 'error' || cameraState === 'idle';

  return (
    <div className={`camera-viewfinder camera-container ${cameraState === 'active' ? 'camera-active' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-video"
        style={isNonActive ? { visibility: 'hidden', position: 'absolute' } : undefined}
        aria-label={t('camera.liveFeedAriaLabel')}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {shutterFlash && <div className="shutter-flash" aria-hidden="true" />}

      {(cameraState === 'requesting' || cameraState === 'idle') && (
        <div className="camera-state-overlay camera-loading" role="status" aria-live="polite">
          <div className="camera-loading-spinner" aria-hidden="true" />
          <p className="camera-loading-text">{t('camera.starting')}</p>
        </div>
      )}

      {cameraState === 'permission-denied' && (
        <div className="camera-state-overlay camera-error" role="alert">
          <div className="camera-error-badge"><Camera size={28} className="camera-error-badge-icon" /></div>
          <h3 className="camera-error-title">{t('camera.accessRequired')}</h3>
          <p className="camera-error-text">{t('camera.permissionMessage')}</p>
          <button className="btn btn-primary" onClick={startCamera} type="button">
            <RotateCcw size={18} /> {t('camera.tryAgain')}
          </button>
        </div>
      )}

      {cameraState === 'error' && (
        <div className="camera-state-overlay camera-error" role="alert">
          <div className="camera-error-badge"><AlertTriangle size={28} className="camera-error-badge-icon" /></div>
          <h3 className="camera-error-title">{t('camera.unavailable')}</h3>
          <p className="camera-error-text">{t('camera.permissionMessage')}</p>
          <button className="btn btn-secondary" onClick={startCamera} type="button">
            {t('common.retry')}
          </button>
        </div>
      )}

      {cameraState === 'active' && (
        <div className="camera-guidance-overlay">
          <div className="guidance-header">
            {onCancel ? (
              <button
                className="camera-back-btn"
                onClick={onCancel}
                type="button"
                aria-label={t('common.back')}
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            ) : <div style={{ width: 44 }} />}

            <div style={{ width: 44, display: 'flex', justifyContent: 'flex-end' }}>
              {torchSupported && (
                <button
                  className={`camera-control-btn torch-btn${torchOn ? ' active' : ''}`}
                  onClick={toggleTorch}
                  type="button"
                  aria-label={torchOn ? t('camera.flashlightOff') : t('camera.flashlightOn')}
                >
                  {torchOn ? <FlashlightOff size={22} /> : <Flashlight size={22} />}
                </button>
              )}
            </div>
          </div>

          <OrientationGuide visible={true} />

          <div className="guidance-center">
            <StaticBottleOutline />
          </div>

          <div className="guidance-footer">
            <div className="guidance-hint-pill">
              <span className="guidance-hint-text">{t('camera.ensureLogoVisible')}</span>
            </div>
          </div>
        </div>
      )}

      {cameraState === 'active' && (
        <button
          className="camera-capture-btn secondary"
          onClick={handleCapture}
          type="button"
          aria-label={t('camera.capturePhotoAriaLabel')}
        >
          <span className="capture-btn-label">{t('camera.captureManually')}</span>
        </button>
      )}
    </div>
  );
}
