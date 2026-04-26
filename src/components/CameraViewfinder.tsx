import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo
} from "react";
import { useTranslation } from "react-i18next";
import { Camera, AlertTriangle, RotateCcw, Flashlight, FlashlightOff, X, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";
import "./CameraViewfinder.css";
import {
  CAMERA_CONFIG,
  getVideoConstraints,
  checkTorchSupport,
} from "../config/camera";
import { useCameraGuidance } from "../hooks/useCameraGuidance";
import { OrientationGuide } from "./OrientationGuide";
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
  /** Force manual capture mode? */
  forceManual?: boolean;
  /** Current bottle SKU */
  sku?: string;
  /** Initial image to overlay (for testing/geometry validation) */
  testImage?: string | null;
}

type CameraState = 'idle' | 'requesting' | 'active' | 'permission-denied' | 'error' | 'test-overlay';

/** 
 * Afia 1.5L Bottle Guide - Precision Calibrated Outline
 * 
 * Based on engineering drawing specifications:
 * - Total height: 301mm (±12mm)
 * - Neck diameter: Ø 37.3mm (±0.5mm)
 * - Body width: 78.1mm at base
 * - Body depth: 52.5mm (side profile)
 * - Capacity: 1500cc (+21/-0)
 * 
 * Color coding guides user to optimal capture position:
 * - RED (not-detected): No bottle detected in frame - align bottle with outline
 * - YELLOW (too-far/too-close): Bottle detected but wrong distance - move closer/back
 * - GREEN (good): Perfect alignment - auto-capture will trigger in 1 second
 */
function BottleGuide({
  isReady,
  distance,
  isCentered,
  holdProgress = 0,
  isHolding = false,
  manualMode = false,
}: {
  isReady: boolean;
  distance: 'good' | 'too-far' | 'too-close' | 'not-detected';
  isCentered: boolean;
  holdProgress?: number;
  isHolding?: boolean;
  manualMode?: boolean;
}) {
  const { t } = useTranslation();

  // Color transitions: RED → YELLOW → GREEN
  let color: string;
  let strokeWidth: number;
  
  if (isReady && distance === 'good') {
    color = '#10b981'; // Green - perfect alignment
    strokeWidth = 4.0; // Thicker stroke when ready
  } else if (distance === 'good') {
    color = '#10b981'; // Green - good distance but not fully ready
    strokeWidth = 3.5;
  } else if (distance === 'too-far' || distance === 'too-close') {
    color = '#f59e0b'; // Yellow/Amber - adjust distance
    strokeWidth = 3.5;
  } else {
    color = '#ef4444'; // Red - no bottle detected
    strokeWidth = 3.0;
  }
  
  const opacity = (isReady && distance === 'good') ? 1.0 : 0.75;
  const pulseAnimation = distance === 'good' ? 'bottle-guide-pulse' : '';

  return (
    <div className={`bottle-guide-wrapper${isReady ? ' ready' : ''}${manualMode ? ' manual-mode' : ''} ${pulseAnimation}`}>
      {/* Directional Hints */}
      {!isReady && distance === 'not-detected' && (
        <div className="bottle-guide-hint hint-align">
          {t('camera.alignBottle')}
        </div>
      )}
      {!isReady && distance === 'too-far' && (
        <div className="bottle-guide-hint hint-move-closer">
          {isCentered ? t('camera.moveCloser') : t('camera.centreBottle')}
        </div>
      )}
      {!isReady && distance === 'too-close' && (
        <div className="bottle-guide-hint hint-move-back">{t('camera.moveBack')}</div>
      )}
      {isReady && (
        <div className="bottle-guide-hint hint-ready">
          ✓ {t('camera.ready')}
        </div>
      )}

      {/*
        Precision-Calibrated SVG Outline.
        viewBox 100 × 301 maps directly to Afia 1.5L engineering spec
        (78.1mm body width, 301mm total height — drawn in mm units, centered
        on x=50). Silhouette split into 6 component paths (cap, neck,
        shoulder, body, base, handle) so each region can be addressed
        individually for future per-region animation.
      */}
      <svg
        className="bottle-guide-svg"
        viewBox="0 0 100 301"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g stroke={color} strokeLinejoin="round" strokeLinecap="round" opacity={opacity} fill="none">
          {/* Cap (top closure) */}
          <path
            d="M 43 4 L 57 4 C 58.5 4 59 5 59 6 L 59 19 L 41 19 L 41 6 C 41 5 41.5 4 43 4 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />

          {/* Neck (cylindrical, ~Ø 37.3mm scaled) */}
          <path
            d="M 41.5 19 L 58.5 19 L 58.5 36 C 58.5 38 58 39 57.5 40 L 42.5 40 C 42 39 41.5 38 41.5 36 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />

          {/* Shoulder (transition neck → body) */}
          <path
            d="M 42.5 40 L 57.5 40 C 60 42 64 45 70 50 C 78 56 84 62 88 70 L 12 70 C 16 62 22 56 30 50 C 36 45 40 42 42.5 40 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />

          {/* Body (bulbous main, with subtle waist near base) */}
          <path
            d="M 12 70 L 88 70 C 90 80 90.5 92 90 105 C 89 130 86 155 86 180 C 86 215 87 240 86 260 L 14 260 C 13 240 14 215 14 180 C 14 155 11 130 10 105 C 9.5 92 10 80 12 70 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />

          {/* Base (slight flare to bottom) */}
          <path
            d="M 14 260 L 86 260 C 86.5 270 86 280 84 288 C 82 294 78 297 73 297 L 27 297 C 22 297 18 294 16 288 C 14 280 13.5 270 14 260 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />

          {/* Handle (right-side vertical capsule loop) */}
          <path
            d="M 84 102 C 86.5 102 88 105 88 109 L 88 132 C 88 136 86.5 139 84 139 C 81.5 139 80 136 80 132 L 80 109 C 80 105 81.5 102 84 102 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* Label Region Indicator (dashed rectangle over body) */}
        <rect
          x="22" y="115" width="56" height="120" rx="6"
          stroke={color} strokeWidth="0.8" strokeDasharray="3 1.5"
          opacity={0.6}
          fill="none"
        />

        {/* Brand Marker — Green Band Position (rect with dashed stroke).
            Stroke is white (not #10b981) so it does not collide with the
            auto-capture progress-ring selector `circle/rect[stroke="#10b981"]`. */}
        <rect
          x="20" y="165" width="60" height="18" rx="2"
          stroke="#ffffff" strokeWidth="0.6" strokeDasharray="2 1"
          opacity={0.55}
          fill="none"
        />

        {/* Brand Marker — Heart Logo Position (circle with dashed stroke).
            Stroke is white for the same reason as the green band marker above. */}
        <circle
          cx="50" cy="200" r="6"
          stroke="#ffffff" strokeWidth="0.6" strokeDasharray="1.2 0.8"
          opacity={0.55}
          fill="none"
        />

        {/* Fill Level Reference Marker — 50% of bottle interior */}
        <line
          x1="14" y1="183" x2="86" y2="183"
          stroke={color} strokeWidth="0.5" strokeDasharray="2 1.5"
          opacity={0.5}
        />
        <text
          x="92" y="186"
          fill={color}
          fontSize="6"
          fontWeight="bold"
          textAnchor="end"
          opacity={0.7}
        >
          50%
        </text>

        {/* Auto-Capture Progress Ring (1 second hold timer) */}
        {isHolding && !manualMode && (
          <g transform="translate(50, 175)">
            <circle
              r="34"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="3"
            />
            <circle
              r="34"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${holdProgress * 213.6} 213.6`}
              transform="rotate(-90)"
              opacity="0.95"
            />
            <text
              y="4"
              fill="#10b981"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
              opacity="0.9"
            >
              {Math.ceil((1 - holdProgress) * 1)}
            </text>
          </g>
        )}
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
  forceManual = false,
  testImage = null,
}: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imageOverlayRef = useRef<HTMLImageElement | null>(null);
  
  const { t } = useTranslation();
  const [cameraState, setCameraState] = useState<CameraState>(testImage ? 'test-overlay' : 'idle');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  // Force manual mode in test environment to prevent auto-capture from hiding orientation guide
  const [isManualMode, setIsManualMode] = useState(forceManual || (typeof window !== 'undefined' && (window as Window & { __AFIA_FORCE_MANUAL__?: boolean }).__AFIA_FORCE_MANUAL__));
  const [photoCaptured, setPhotoCaptured] = useState(false);

  const isStartingRef = useRef(false);
  const isCapturingRef = useRef(false);
  const hasFiredRef = useRef(false);

  const guidanceConfig = useMemo(() => ({
    minBlurScore: CAMERA_CONFIG.minQuality.blurScore,
    requireGoodLighting: true,
  }), []);

  const guidance = useCameraGuidance(guidanceConfig);

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
      setPhotoCaptured(true);
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

  useEffect(() => {
    if (!isManualMode && guidance.state.isReady && !hasFiredRef.current && cameraState === 'active' && videoRef.current) {
      if (typeof window !== 'undefined' && (window as Window & { __AFIA_PREVENT_CAPTURE__?: boolean }).__AFIA_PREVENT_CAPTURE__) return;
      hasFiredRef.current = true;
      if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
      handleCapture();
    }
  }, [guidance.state.isReady, cameraState, handleCapture, isManualMode]);

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

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !videoRef.current) return;
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
    if (cameraState === 'active' && enableLiveGuidance && videoRef.current) {
      guidance.startGuidance(videoRef.current);
    } else if (cameraState === 'test-overlay' && enableLiveGuidance && imageOverlayRef.current) {
      guidance.startGuidance(imageOverlayRef.current);
    }
    return () => {
      if (enableLiveGuidance) guidance.stopGuidance();
    };
  }, [cameraState, enableLiveGuidance, guidance]);

  useEffect(() => {
    if (!testImage) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera, testImage]);

  const isNonActive = cameraState === 'requesting' || cameraState === 'permission-denied' || cameraState === 'error' || cameraState === 'idle';

  return (
    <div className={`camera-viewfinder camera-container ${cameraState === 'active' ? 'camera-active' : ''} ${cameraState === 'test-overlay' ? 'test-mode' : ''}`}>
      {cameraState === 'test-overlay' && testImage && (
        <img
          ref={imageOverlayRef}
          src={testImage}
          className="camera-video"
          alt="Test Geometry"
        />
      )}
      <video
        ref={videoRef} autoPlay playsInline muted className="camera-video"
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
          <button className="btn btn-primary" onClick={startCamera} type="button"><RotateCcw size={18} /> {t('camera.tryAgain')}</button>
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

      {cameraState === 'active' && enableLiveGuidance && (
        <div className="camera-guidance-overlay">
          <div className="guidance-header">
            {onCancel ? (
              <button className="camera-back-btn" onClick={onCancel} type="button" aria-label={t('common.back')}><X size={22} strokeWidth={2.5} /></button>
            ) : <div style={{ width: 44 }} />}

            <div className={`guidance-status-pill${guidance.state.isReady ? ' ready' : ''}`}>
              <div className="status-dot" />
              <span className="status-text">
                {guidance.state.isReady ? t('camera.ready') : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {guidance.state.brandDetected && <CheckCircle2 size={14} style={{ color: '#10b981' }} />}
                    {t('camera.alignBottle')}
                  </span>
                )}
              </span>
            </div>

            <div className="header-actions">
              {torchSupported && (
                <button className={`camera-control-btn torch-btn${torchOn ? ' active' : ''}`} onClick={toggleTorch} type="button" aria-label={torchOn ? t('camera.flashlightOff') : t('camera.flashlightOn')}>
                  {torchOn ? <FlashlightOff size={22} /> : <Flashlight size={22} />}
                </button>
              )}
              <button 
                className={`camera-control-btn manual-toggle-btn${isManualMode ? ' active' : ''}`} 
                onClick={() => setIsManualMode(!isManualMode)} 
                type="button"
                aria-label={t('camera.captureManually')}
              >
                <Camera size={22} />
              </button>
            </div>
          </div>

          {/* Story 10.1: Orientation Guide - Shows "Handle on Right" instruction */}
          <OrientationGuide visible={cameraState === 'active' && !photoCaptured} />

          <div className="guidance-center">
            <BottleGuide
              isReady={guidance.state.isReady}
              distance={guidance.state.assessment?.composition.distance ?? 'not-detected'}
              isCentered={guidance.state.assessment?.composition.isCentered ?? true}
              holdProgress={guidance.state.holdProgress}
              isHolding={guidance.state.isHolding}
              manualMode={isManualMode}
            />
            
            {guidance.state.orientationPermission === 'granted' && !guidance.state.isReady && (
              <div className="tilt-guidance-container">
                {guidance.state.angleStatus === 'tilt-up' && (
                  <div className="tilt-arrow tilt-up"><ChevronUp size={48} /><span>{t('camera.tiltUp')}</span></div>
                )}
                {guidance.state.angleStatus === 'tilt-down' && (
                  <div className="tilt-arrow tilt-down"><ChevronDown size={48} /><span>{t('camera.tiltDown')}</span></div>
                )}
              </div>
            )}
          </div>

          <div className="guidance-footer">
            {guidance.state.orientationPermission === 'prompt' && (
              <button className="motion-permission-btn" onClick={guidance.requestOrientation}>
                {t('camera.enableMotion')}
              </button>
            )}
            <div className={`guidance-hint-pill${guidance.state.isReady ? ' ready' : ` ${guidance.state.assessment?.guidanceType ?? 'warning'}`}`}>
              <span className="guidance-hint-text">
                {guidance.state.isReady
                  ? t('camera.ready')
                  : isManualMode
                    ? t('camera.captureManually')
                    : guidance.state.assessment?.lighting?.status === 'too-dark'
                      ? t('camera.tooDark')
                      : guidance.state.assessment?.lighting?.status === 'too-bright'
                        ? t('camera.tooBright')
                      : !guidance.state.brandDetected && guidance.state.assessment?.composition?.bottleDetected
                        ? t('camera.ensureLogoVisible')
                        : guidance.state.assessment?.composition?.distance === 'too-far' || guidance.state.assessment?.composition?.distance === 'too-close'
                          ? t('camera.adjustPosition')
                          : guidance.state.assessment
                            ? t(guidance.state.assessment.guidanceMessage)
                            : t('camera.showFrontLabel')}
              </span>
            </div>
          </div>
        </div>
      )}

      {cameraState === 'active' && (
        <button
          className={`camera-capture-btn${enableLiveGuidance ? ' secondary' : ''}`}
          onClick={handleCapture}
          type="button"
          aria-label={t('camera.capturePhotoAriaLabel')}
          disabled={!isManualMode && !guidance.state.isReady && enableLiveGuidance && !(window as any).__AFIA_TEST_MODE__}
        >
          {enableLiveGuidance ? <span className="capture-btn-label">{t('camera.captureManually')}</span> : <span className="capture-btn-inner" />}
        </button>
      )}
    </div>
  );
}
