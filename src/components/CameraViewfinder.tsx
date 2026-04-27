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
import jsQR from "jsqr";
import { runQualityGate } from "../utils/imageQualityGate";

interface CameraViewfinderProps {
  onCapture: (base64: string, qrData: string | null) => void;
  onError: (message: string) => void;
  onPermissionDenied: () => void;
  onCancel?: () => void;
  preferBackCamera?: boolean;
  testImage?: string | null;
  sku?: string;
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
          {/* Cap — 38mm neck finish */}
          <path
            d="M 33 3 L 67 3 C 68.5 3 69 4.5 69 6 L 69 16 L 31 16 L 31 6 C 31 4.5 31.5 3 33 3 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Neck — tall narrow section, Ø37.3mm spec (~22% of total height) */}
          <path
            d="M 33 16 L 67 16 L 66 44 C 66 49 63.5 52 61 53 L 39 53 C 36.5 52 34 49 34 44 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Shoulder — steep flare from narrow neck to wide upper body */}
          <path
            d="M 39 53 L 61 53 C 72 55 84 62 90 68 C 92 70 92 71 92 72 L 8 72 C 8 71 8 70 10 68 C 16 62 28 55 39 53 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Body — inverted pear: widest at ~25% into body, tapers to 78.1mm base */}
          <path
            d="M 8 72 L 92 72 C 95 82 96 100 95 117 C 93 138 91 162 89 190 C 87 212 86 232 85 252 L 15 252 C 14 232 13 212 11 190 C 9 162 7 138 5 117 C 4 100 5 82 8 72 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Base — 78.1mm wide, tapered rounded bottom */}
          <path
            d="M 15 252 L 85 252 C 86 264 86 274 84 282 C 82 290 78 294 73 297 L 27 297 C 22 294 18 290 16 282 C 14 274 14 264 15 252 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Handle — SIPA D-handle loop on right side, upper body */}
          <path
            d="M 93 100 C 97 100 99 107 99 128 C 99 148 97 158 93 158 C 89 158 87 155 87 150 L 87 113 C 87 106 90 100 93 100 Z"
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
  const [qualityRejectMsg, setQualityRejectMsg] = useState<string | null>(null);
  const qualityRejectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      const qualityResult = runQualityGate(canvas);
      if (!qualityResult.passed) {
        const msgKey = qualityResult.issues[0]?.message ?? 'camera.captureError';
        if (qualityRejectTimerRef.current) clearTimeout(qualityRejectTimerRef.current);
        setQualityRejectMsg(t(msgKey));
        qualityRejectTimerRef.current = setTimeout(() => setQualityRejectMsg(null), 2500);
        return;
      }

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

            <div className="guidance-header-hint">
              <span>{t('camera.guidanceHint')}</span>
              <span>{t('camera.guidanceHint2')}</span>
            </div>

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

          <div className="guidance-center">
            <StaticBottleOutline />
          </div>
        </div>
      )}

      {qualityRejectMsg && (
        <div className="quality-reject-toast" role="alert" aria-live="assertive">
          {qualityRejectMsg}
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
