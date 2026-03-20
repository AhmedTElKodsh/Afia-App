import {
  useRef,
  useState,
  useEffect,
  useCallback
} from "react";
import { useTranslation } from "react-i18next";
import { Camera, AlertTriangle, RotateCcw, Flashlight, FlashlightOff } from "lucide-react";
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
  /** Prefer back/environment camera if true */
  preferBackCamera?: boolean;
  /** Enable real-time quality guidance overlay */
  enableLiveGuidance?: boolean;
}

type CameraState = 'idle' | 'requesting' | 'active' | 'permission-denied' | 'error';

export function CameraViewfinder({
  onCapture,
  onError,
  onPermissionDenied,
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

  // Live guidance hook
  const guidance = useCameraGuidance({
    minBlurScore: CAMERA_CONFIG.minQuality.blurScore,
    requireGoodLighting: true,
  });

  /**
   * Initialize and start the camera stream
   */
  const startCamera = useCallback(async () => {
    if (cameraState === 'requesting') return;
    setCameraState('requesting');

    try {
      // Clean up existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = getVideoConstraints(preferBackCamera);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Start guidance if enabled
        if (enableLiveGuidance) {
          guidance.startGuidance(videoRef.current);
        }
      }

      // Check if hardware features (like torch) are supported
      const hasTorch = await checkTorchSupport(stream);
      setTorchSupported(hasTorch);
      
      setCameraState('active');
    } catch (error) {
      console.error('Camera initialization error:', error);
      
      const err = error as Error;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('permission-denied');
        onPermissionDenied();
      } else {
        setCameraState('error');
        onError(t('camera.captureError'));
      }
    }
  }, [cameraState, onError, onPermissionDenied, preferBackCamera, enableLiveGuidance, guidance]);

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
   * Start camera on mount
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startCamera();
  }, [startCamera]);

  // Render based on camera state
  if (cameraState === 'requesting') {
    return (
      <div className="camera-viewfinder camera-loading" role="status" aria-live="polite">
        <div className="camera-loading-spinner" aria-hidden="true" />
        <p className="camera-loading-text">{t('camera.starting')}</p>
      </div>
    );
  }

  if (cameraState === 'permission-denied') {
    return (
      <div className="camera-viewfinder camera-error" role="alert">
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
    );
  }

  if (cameraState === 'error') {
    return (
      <div className="camera-viewfinder camera-error" role="alert">
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
    );
  }

  return (
    <div className={`camera-viewfinder camera-container ${cameraState === 'active' ? 'camera-active' : ''}`}>
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="camera-video"
        aria-label={t('camera.liveFeedAriaLabel')}
      />

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Guidance Overlay */}
      {enableLiveGuidance && (
        <div className="camera-guidance-overlay">
          {/* Top Info */}
          <div className="guidance-header">
            <div className={`guidance-status-pill ${guidance.state.isReady ? 'ready' : ''}`}>
              <div className="status-dot" />
              <span className="status-text">
                {guidance.state.isReady ? t('camera.ready') : t('camera.alignBottle')}
              </span>
            </div>
          </div>

          {/* Framing Guide */}
          <div className="guidance-center">
            <div className={`framing-box ${guidance.state.isReady ? 'ready' : ''}`}>
              <div className="corner corner-tl" />
              <div className="corner corner-tr" />
              <div className="corner corner-bl" />
              <div className="corner corner-br" />
            </div>
            
            {guidance.state.assessment && !guidance.state.isReady && (
              <p className="guidance-hint">
                {guidance.state.assessment.guidanceMessage}
              </p>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="guidance-footer">
            {torchSupported && (
              <button
                className={`camera-control-btn torch-btn ${torchOn ? 'active' : ''}`}
                onClick={toggleTorch}
                aria-label={torchOn ? t('camera.flashlightOff') : t('camera.flashlightOn')}
              >
                {torchOn ? <FlashlightOff size={24} /> : <Flashlight size={24} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Capture Button */}
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
    </div>
  );
}
