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
        viewBox="0 0 460 1024"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g
          stroke="rgba(255,255,255,0.85)"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeWidth="8"
          fill="none"
        >
          <path
            d="M 223 327 L 197 334 L 192 363 L 196 383 L 148 422 L 137 438 L 129 460 L 137 509 L 136 565 L 128 605 L 100 694 L 98 763 L 110 829 L 130 887 L 143 903 L 168 912 L 260 913 L 298 910 L 312 903 L 324 889 L 337 858 L 358 776 L 362 700 L 352 680 L 362 668 L 363 610 L 350 498 L 323 432 L 277 384 L 280 339 L 274 331 Z"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M 264 333 L 277 343 L 274 387 L 316 428 L 335 467 L 336 477 L 325 497 L 298 515 L 285 535 L 279 612 L 282 638 L 292 653 L 344 674 L 358 696 L 354 784 L 326 876 L 308 901 L 270 909 L 167 908 L 143 898 L 133 884 L 112 825 L 100 753 L 104 689 L 138 573 L 141 514 L 133 458 L 151 424 L 198 386 L 201 375 L 195 369 L 199 337 L 230 331 Z"
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
