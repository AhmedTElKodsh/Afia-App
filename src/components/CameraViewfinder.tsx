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
import { OrientationGuide } from "./OrientationGuide";

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
          strokeWidth="2"
          fill="none"
        >
          {/* Cap */}
          <path
            d="M 48.5 96 L 42.8 98.2 L 41.7 106.7 L 42.6 112.5 L 57.4 112.5 L 59.6 106.7 L 59.6 97.3 Z"
            vectorEffect="non-scaling-stroke"
          />
          {/* Neck */}
          <path
            d="M 42.6 112.5 L 32.2 124 L 29.8 128.7 L 28 135.3 L 29.8 149.6 L 43 113.4 L 43.7 110.2 L 42.4 108.5 L 43.3 99 L 50 97.3 L 57.4 97.8 L 60.2 101 L 59.6 113.8 L 68.7 125.9 L 72.8 137.3 L 73 140.2 L 70.7 146.1"
            vectorEffect="non-scaling-stroke"
          />
          {/* Shoulder */}
          <path
            d="M 29.8 149.6 L 29.6 166 L 27.8 177.8 L 30 168.4 L 30.7 151.1 L 28.9 134.6 L 32.8 124.6 L 70.7 146.1 L 64.8 151.4 L 62 157.2 L 60.7 179.9"
            vectorEffect="non-scaling-stroke"
          />
          {/* Body */}
          <path
            d="M 27.8 177.8 L 21.7 204 L 21.3 224.3 L 23.9 243.7 L 22.6 202.5 L 60.7 179.9 L 61.3 187.6 L 63.5 192 L 74.8 198.1 L 77.8 204.6 L 76.9 230.4 L 78.7 196.3 L 78.9 179.3 L 76.1 146.4"
            vectorEffect="non-scaling-stroke"
          />
          {/* Handle */}
          <path
            d="M 70.2 127 L 76.1 146.4 L 78.9 179.3 L 78.7 196.3 L 76.5 199.9 L 78.7 205.7 L 77.8 228 L 73.3 252.2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Base */}
          <path
            d="M 23.9 243.7 L 28.3 260.6 L 31.1 265.4 L 36.5 268.1 L 56.5 268.4 L 64.8 267.4 L 67.8 265.4 L 70.4 261.3 L 73.3 252.2 L 70.8 257.5 L 67 264.9 L 58.7 267.2 L 36.3 266.9 L 31.1 264 L 28.9 259.8 L 24.3 242.5"
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
              <span className="hint-main">{t('camera.shootFrontside')}</span>
              <span className="hint-sub">{t('camera.guidanceHint')}</span>
              <span className="hint-sub">{t('camera.guidanceHint2')}</span>
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
            <OrientationGuide visible={true} />
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
          className="camera-capture-btn"
          onClick={handleCapture}
          type="button"
          aria-label={t('camera.capturePhotoAriaLabel')}
        >
          <div className="capture-btn-inner">
            <Camera size={32} color="black" fill="black" />
          </div>
        </button>
      )}
    </div>
  );
}
