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

/** Oil bottle silhouette guide — colour reflects distance / quality state:
 *  green  = bottle fills the outline (optimal distance, good quality)
 *  yellow = bottle detected but wrong distance (too far or too close)
 *  red    = no bottle detected in centre region
 */
function BottleGuide({
  isReady,
  distance,
  isCentered,
  holdProgress = 0,
  isHolding = false,
  sku,
  manualMode = false,
}: {
  isReady: boolean;
  distance: 'good' | 'too-far' | 'too-close' | 'not-detected';
  isCentered: boolean;
  holdProgress?: number;
  isHolding?: boolean;
  sku?: string;
  manualMode?: boolean;
}) {
  const { t } = useTranslation();
  
  if (sku === 'afia-corn-2.5l') {
    return (
      <div className="bottle-guide-wrapper manual-only">
        <div className="bottle-guide-hint manual-hint">
          {t('camera.advancedGuidanceSoon')}
          <br />
          <small>{t('camera.captureManuallyPrompt')}</small>
        </div>
        <div className="generic-guide-frame" />
      </div>
    );
  }

  let color: string;
  if (distance === 'good') {
    color = '#10b981'; // green
  } else if (distance === 'too-far' || distance === 'too-close') {
    color = '#f59e0b'; // amber
  } else {
    color = '#ef4444'; // red — no bottle
  }
  const opacity = distance === 'good' ? 0.95 : 0.78;

  return (
    <div className={`bottle-guide-wrapper${isReady ? ' ready' : ''}${manualMode ? ' manual-mode' : ''}`}>
      {!isReady && distance === 'too-far' && (
        <div className="bottle-guide-hint">
          {isCentered ? t('camera.moveCloser') : t('camera.centreBottle')}
        </div>
      )}
      {!isReady && distance === 'too-close' && (
        <div className="bottle-guide-hint">{t('camera.moveBack')}</div>
      )}
      {!isReady && distance === 'not-detected' && (
        <div className="bottle-guide-hint">{t('camera.alignBottle')}</div>
      )}
      <svg
        className="bottle-guide-svg"
        viewBox="0 0 130 210"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Cap Outline */}
        <rect x="47" y="2" width="36" height="11" rx="4"
          stroke={color} strokeWidth="2.5" opacity={opacity} />
        
        {/* Main Body Path — Refined for Afia 1.5L Proportions */}
        <path
          d="M 52 13 Q 50 18 42 28 Q 32 38 30 48
             L 30 174 Q 30 190 65 190 Q 100 190 100 174
             L 100 48 Q 98 38 88 28 Q 80 18 78 13 Z"
          stroke={color}
          strokeWidth="3.5"
          strokeLinejoin="round"
          opacity={opacity}
        />

        {/* Handle Arch (Afia specific) */}
        <path
          d="M 100 78 Q 124 78 124 108 Q 124 138 100 138"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          opacity={opacity * 0.85}
        />

        {/* Label Target Region */}
        <rect
          x="34" y="68" width="62" height="88" rx="5"
          stroke={color} strokeWidth="1.5" strokeDasharray="6 3"
          opacity={opacity * 0.50}
        />

        {/* Fill Line Visual Hint */}
        <line
          x1="34" y1="112" x2="96" y2="112"
          stroke={color} strokeWidth="1" strokeDasharray="4 4"
          opacity={opacity * 0.35}
        />

        {isHolding && !manualMode && (
          <>
            <circle cx="65" cy="105" r="96" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="6" strokeLinecap="round" />
            <circle
              cx="65" cy="105" r="96" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${holdProgress * 603} 603`}
              transform="rotate(-90 65 105)"
              opacity="0.95"
            />
          </>
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
  sku,
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
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isManualMode, setIsManualMode] = useState(forceManual);

  const isStartingRef = useRef(false);
  const isCapturingRef = useRef(false);
  const hasFiredRef = useRef(false);

  const guidanceConfig = useMemo(() => ({
    minBlurScore: CAMERA_CONFIG.minQuality.blurScore,
    requireGoodLighting: true,
  }), []);

  const guidance = useCameraGuidance(guidanceConfig);

  useEffect(() => {
    const timer = setTimeout(() => setShowOnboarding(false), 3000);
    return () => clearTimeout(timer);
  }, []);

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
      const base64Only = imageBase64.replace(/^data:image\/jpeg;base64,/, '');
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

          {showOnboarding && (
            <div className="onboarding-toast frontside-toast">
              {t('camera.shootFrontside')}
            </div>
          )}

          <div className="guidance-center">
            <BottleGuide
              isReady={guidance.state.isReady}
              distance={guidance.state.assessment?.composition.distance ?? 'not-detected'}
              isCentered={guidance.state.assessment?.composition.isCentered ?? true}
              holdProgress={guidance.state.holdProgress}
              isHolding={guidance.state.isHolding}
              sku={sku}
              manualMode={isManualMode}
            />
            
            {guidance.state.orientationPermission === 'granted' && !guidance.state.isReady && sku !== 'afia-corn-2.5l' && (
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
                    : guidance.state.assessment?.lighting.status === 'too-dark'
                      ? t('camera.tooDark')
                      : guidance.state.assessment?.lighting.status === 'too-bright'
                        ? t('camera.tooBright')
                      : !guidance.state.brandDetected && guidance.state.assessment?.composition.bottleDetected
                        ? t('camera.ensureLogoVisible')
                        : guidance.state.assessment?.composition.distance === 'too-far' || guidance.state.assessment?.composition.distance === 'too-close'
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
          disabled={!isManualMode && !guidance.state.isReady && enableLiveGuidance && sku !== 'afia-corn-2.5l'}
        >
          {enableLiveGuidance ? <span className="capture-btn-label">{t('camera.captureManually')}</span> : <span className="capture-btn-inner" />}
        </button>
      )}
    </div>
  );
}
