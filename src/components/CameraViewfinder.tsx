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
      
      {/* Precision-Calibrated SVG Outline - Based on Engineering Drawing Refined */}
      <svg
        className="bottle-guide-svg"
        viewBox="0 0 460 1024"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g stroke={color} strokeWidth={strokeWidth * 2.5} strokeLinejoin="round" strokeLinecap="round" opacity={opacity}>
          {/* Main Bottle Silhouette */}
          <path d="
            M 195 70
            C 195 66 198 64 202 64
            L 258 64
            C 262 64 265 66 265 70
            L 265 132
            C 265 138 268 142 272 146
            C 278 152 282 160 282 170
            L 282 200
            C 282 214 288 226 298 236
            C 330 266 360 290 390 320
            C 410 344 422 376 422 410
            C 422 470 410 510 405 560
            C 400 620 400 680 405 740
            C 410 790 415 830 412 870
            C 408 920 396 950 380 968
            C 376 972 372 974 366 974
            L 94 974
            C 88 974 84 972 80 968
            C 64 950 52 920 48 870
            C 45 830 50 790 55 740
            C 60 680 60 620 55 560
            C 50 510 38 470 38 410
            C 38 376 50 344 70 320
            C 100 290 130 266 162 236
            C 172 226 178 214 178 200
            L 178 170
            C 178 160 182 152 188 146
            C 192 142 195 138 195 132 Z
          "/>

          {/* Handle - small rounded hole on right side, upper-mid body */}
          <path d="
            M 388 360
            C 398 360 404 370 404 384
            L 404 446
            C 404 460 398 470 388 470
            C 378 470 372 460 372 446
            L 372 384
            C 372 370 378 360 388 360 Z
          "/>
        </g>
        
        {/* Label Region Indicator (Diagonal band area) */}
        <rect
          x="120" y="300" width="220" height="400" rx="20"
          stroke={color} strokeWidth="4" strokeDasharray="20 10"
          opacity={0.5}
        />
        
        {/* Auto-Capture Progress Ring (1 second hold timer) */}
        {isHolding && !manualMode && (
          <g transform="translate(230, 500)">
            <circle 
              r="180" 
              fill="none" 
              stroke="rgba(255,255,255,0.15)" 
              strokeWidth="15" 
            />
            <circle
              r="180" 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="15" 
              strokeLinecap="round"
              strokeDasharray={`${holdProgress * 1131} 1131`}
              transform="rotate(-90)"
              opacity="0.95"
            />
            <text 
              y="15" 
              fill="#10b981" 
              fontSize="80" 
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
  const [isManualMode, setIsManualMode] = useState(forceManual || (typeof window !== 'undefined' && (window as any).__AFIA_FORCE_MANUAL__));
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
      if (typeof window !== 'undefined' && (window as any).__AFIA_PREVENT_CAPTURE__) return;
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
      let capabilities: any = null;
      try { capabilities = track.getCapabilities(); } catch { return; }
      if (!capabilities?.torch) return;
      const newTorchState = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: newTorchState } as any] });
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
