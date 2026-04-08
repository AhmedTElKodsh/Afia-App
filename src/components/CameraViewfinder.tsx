import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo
} from "react";
import { useTranslation } from "react-i18next";
import { Camera, AlertTriangle, RotateCcw, Flashlight, FlashlightOff, X } from "lucide-react";
import "./CameraViewfinder.css";
import {
  CAMERA_CONFIG,
  getVideoConstraints,
  checkTorchSupport,
} from "../config/camera";
import { useCameraGuidance } from "../hooks/useCameraGuidance";
import jsQR from "jsqr";

/**
 * CameraViewfinder Component
 * 
 * High-performance mobile-first camera interface.
 * Handles permission requests, video stream lifecycle, and image capture.
 */

interface CameraViewfinderProps {
  /** Callback triggered when a photo is captured */
  onCapture: (base64: string, qrData: string | null) => void;
  /** Callback triggered on camera error */
  onError: (message: string) => void;
  /** Callback triggered when permission is denied */
  onPermissionDenied: () => void;
  /** Callback to exit camera view (back button) */
  onCancel?: () => void;
  /** Prefer back/environment camera if true */
  preferBackCamera?: boolean;
  /** Enable real-time quality guidance overlay */
  enableLiveGuidance?: boolean;
}

type CameraState = 'idle' | 'requesting' | 'active' | 'permission-denied' | 'error';

/** Oil bottle silhouette guide — changes colour by quality score */
function BottleGuide({ isReady, score }: { isReady: boolean; score: number }) {
  const color = isReady ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const opacity = isReady ? 0.95 : 0.75;
  return (
    <div className={`bottle-guide-wrapper${isReady ? ' ready' : ''}`}>
      <svg
        className="bottle-guide-svg"
        viewBox="0 0 120 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Bottle body */}
        <path
          d="M 44 2 H 76 V 15 L 85 28 L 90 46 V 168 Q 90 182 60 182 Q 30 182 30 168 V 46 L 35 28 L 44 15 Z"
          stroke={color}
          strokeWidth="3.5"
          strokeLinejoin="round"
          opacity={opacity}
        />
        {/* Handle (right side) */}
        <path
          d="M 90 64 Q 112 64 112 94 Q 112 124 90 124"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          opacity={opacity * 0.85}
        />
        {/* Label area — dashed */}
        <rect
          x="33" y="62" width="54" height="78" rx="4"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="6 3"
          opacity={opacity * 0.55}
        />
        {/* Fill-level guide line */}
        <line
          x1="33" y1="100" x2="87" y2="100"
          stroke={color}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity={opacity * 0.35}
        />
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
  enableLiveGuidance = true,
}: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { t } = useTranslation();
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Prevent concurrent startCamera calls without depending on cameraState in the callback
  const isStartingRef = useRef(false);

  // Stable guidance config — avoids recreating guidance on every render
  const guidanceConfig = useMemo(() => ({
    minBlurScore: CAMERA_CONFIG.minQuality.blurScore,
    requireGoodLighting: true,
  }), []);

  const guidance = useCameraGuidance(guidanceConfig);

  /**
   * Initialize and start the camera stream
   */
  const startCamera = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setCameraState('requesting');

    try {
      // Clean up existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = getVideoConstraints(preferBackCamera);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = stream;

      // Attach stream — videoRef is always in the DOM now (see render below)
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check if hardware features (like torch) are supported
      const hasTorch = await checkTorchSupport(stream);
      setTorchSupported(hasTorch);

      setCameraState('active');
    } catch (error) {
      console.error('Camera initialization error:', error);
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

  /**
   * Toggle torch/flashlight with error handling
   */
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !videoRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;

      // Check capabilities with error handling
      let capabilities: MediaTrackCapabilities | null = null;
      try {
        capabilities = track.getCapabilities();
      } catch {
        console.warn('Unable to get track capabilities');
        return;
      }

      if (!(capabilities as MediaTrackCapabilities & { torch?: boolean })?.torch) return;

      const newTorchState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: newTorchState } as MediaTrackConstraintSet],
      });

      setTorchOn(newTorchState);
    } catch (error) {
      console.error('Torch error:', error);
    }
  }, [torchOn]);

  /**
   * Capture image from video
   */
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (!context) {
        onError(t('camera.captureError'));
        return;
      }

      // Set canvas size from config
      canvas.width = CAMERA_CONFIG.capture.width;
      canvas.height = CAMERA_CONFIG.capture.height;

      // Draw video frame to canvas
      context.drawImage(
        video,
        0, 0,
        CAMERA_CONFIG.capture.width,
        CAMERA_CONFIG.capture.height
      );

      // Convert to base64 JPEG
      const imageBase64 = canvas.toDataURL(
        'image/jpeg',
        CAMERA_CONFIG.jpegQuality
      );
      const base64Only = imageBase64.replace(/^data:image\/jpeg;base64,/, '');

      // Attempt QR detection synchronously using imported jsQR
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
    }
  }, [onCapture, onError, t]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Start guidance analysis once camera is active
   */
  useEffect(() => {
    if (cameraState === 'active' && enableLiveGuidance && videoRef.current) {
      guidance.startGuidance(videoRef.current);
      isStartingRef.current = false;
    }
  }, [cameraState, enableLiveGuidance, guidance]);

  /**
   * Start camera on mount — runs only once (startCamera is stable, no cameraState dep)
   */
  useEffect(() => {
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNonActive = cameraState === 'requesting' || cameraState === 'permission-denied' || cameraState === 'error' || cameraState === 'idle';

  return (
    // Video and canvas are always in the DOM so videoRef is available when the stream arrives
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

      {/* Loading overlay */}
      {(cameraState === 'requesting' || cameraState === 'idle') && (
        <div className="camera-state-overlay camera-loading" role="status" aria-live="polite">
          <div className="camera-loading-spinner" aria-hidden="true" />
          <p className="camera-loading-text">{t('camera.starting')}</p>
        </div>
      )}

      {/* Permission denied overlay */}
      {cameraState === 'permission-denied' && (
        <div className="camera-state-overlay camera-error" role="alert">
          <div className="camera-error-badge" aria-hidden="true">
            <Camera size={28} strokeWidth={2} className="camera-error-badge-icon" />
          </div>
          <h3 className="camera-error-title">{t('camera.accessRequired')}</h3>
          <p className="camera-error-text">{t('camera.permissionMessage')}</p>
          <button
            className="btn btn-primary"
            onClick={startCamera}
            type="button"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <RotateCcw size={18} />
            {t('camera.tryAgain')}
          </button>
        </div>
      )}

      {/* Error overlay */}
      {cameraState === 'error' && (
        <div className="camera-state-overlay camera-error" role="alert">
          <div className="camera-error-badge" aria-hidden="true">
            <AlertTriangle size={28} strokeWidth={2} className="camera-error-badge-icon" />
          </div>
          <h3 className="camera-error-title">{t('camera.unavailable')}</h3>
          <p className="camera-error-text">{t('camera.permissionMessage')}</p>
          <button
            className="btn btn-secondary"
            onClick={startCamera}
            type="button"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Guidance Overlay — only when active */}
      {cameraState === 'active' && enableLiveGuidance && (
        <div className="camera-guidance-overlay">
          {/* Header: back button · status pill · torch */}
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

            <div className={`guidance-status-pill${guidance.state.isReady ? ' ready' : ''}`}>
              <div className="status-dot" />
              <span className="status-text">
                {guidance.state.isReady ? t('camera.ready') : t('camera.alignBottle')}
              </span>
            </div>

            {torchSupported ? (
              <button
                className={`camera-control-btn torch-btn${torchOn ? ' active' : ''}`}
                onClick={toggleTorch}
                type="button"
                aria-label={torchOn ? t('camera.flashlightOff') : t('camera.flashlightOn')}
              >
                {torchOn ? <FlashlightOff size={22} /> : <Flashlight size={22} />}
              </button>
            ) : <div style={{ width: 44 }} />}
          </div>

          {/* Centre: bottle silhouette guide */}
          <div className="guidance-center">
            <BottleGuide
              isReady={guidance.state.isReady}
              score={guidance.state.assessment?.overallScore ?? 0}
            />
          </div>

          {/* Footer: contextual hint pill above capture button */}
          <div className="guidance-footer">
            <div className={`guidance-hint-pill${guidance.state.isReady ? ' ready' : ` ${guidance.state.assessment?.guidanceType ?? 'warning'}`}`}>
              <span className="guidance-hint-text">
                {guidance.state.isReady
                  ? t('camera.ready')
                  : guidance.state.assessment && guidance.state.assessment.overallScore < 60
                    ? guidance.state.assessment.guidanceMessage
                    : t('camera.showFrontLabel')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Capture Button — only when active */}
      {cameraState === 'active' && (
        <button
          key="stable-capture-btn"
          className="camera-capture-btn"
          onClick={handleCapture}
          type="button"
          aria-label={t('camera.capturePhotoAriaLabel')}
          disabled={!guidance.state.isReady && enableLiveGuidance}
          aria-disabled={!guidance.state.isReady && enableLiveGuidance}
        >
          <span className="capture-btn-inner" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
