/**
 * CameraGuidanceOverlay Component
 * 
 * Real-time visual feedback overlay for camera guidance.
 * Shows quality indicators, guidance messages, and framing assistance.
 * 
 * Features:
 * - Quality score indicator
 * - Real-time guidance messages
 * - Visual framing aids
 * - Lighting and blur indicators
 */

import { memo } from 'react';
import { Sun, Lightbulb, Target, Cloud, Check, AlertTriangle, X } from 'lucide-react';
import type { QualityAssessment } from '../utils/cameraQualityAssessment';
import { getQualityColor } from '../hooks/useCameraGuidance';
import './CameraGuidanceOverlay.css';

/**
 * Component props
 */
export interface CameraGuidanceOverlayProps {
  /** Current quality assessment */
  assessment: QualityAssessment | null;
  /** Is guidance system active? */
  isActive: boolean;
  /** Is camera ready for capture? */
  isReady: boolean;
  /** Hide overlay (for testing) */
  hidden?: boolean;
}

/**
 * Quality Score Ring Component
 */
const QualityScoreRing = memo(function QualityScoreRing({ 
  score, 
  size = 60 
}: { 
  score: number; 
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getQualityColor(score);
  
  return (
    <div 
      className="quality-score-ring"
      style={{ width: size, height: size }}
      aria-label={`Quality score: ${score}%`}
      role="img"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          className="quality-score-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="6"
        />
        
        {/* Progress circle */}
        <circle
          className="quality-score-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' }}
        />
      </svg>
      
      {/* Score text */}
      <span 
        className="quality-score-text"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
});

/**
 * Lighting Indicator Component
 */
const LightingIndicator = memo(function LightingIndicator({
  brightness,
  contrast,
  status
}: {
  brightness: number;
  contrast: number;
  status: string;
}) {
  const isGood = status === 'good';
  
  return (
    <div 
      className="lighting-indicator"
      aria-label={`Lighting: ${status}`}
    >
      <div className="lighting-icon" aria-hidden="true">
        {isGood ? (
          <Sun size={18} strokeWidth={2.5} style={{ color: getQualityColor(brightness) }} />
        ) : (
          <Lightbulb size={18} strokeWidth={2.5} style={{ color: getQualityColor(brightness) }} />
        )}
      </div>
      <div className="lighting-info">
        <div className="lighting-bars">
          <div 
            className="lighting-bar brightness"
            style={{ 
              width: `${brightness}%`,
              backgroundColor: getQualityColor(brightness)
            }}
            aria-label={`Brightness: ${brightness}%`}
          />
          <div 
            className="lighting-bar contrast"
            style={{ 
              width: `${contrast}%`,
              backgroundColor: getQualityColor(contrast)
            }}
            aria-label={`Contrast: ${contrast}%`}
          />
        </div>
        <span className="lighting-status">
          {isGood ? 'Good lighting' : status.replace('-', ' ')}
        </span>
      </div>
    </div>
  );
});

/**
 * Blur Indicator Component
 */
const BlurIndicator = memo(function BlurIndicator({
  blurScore
}: {
  blurScore: number;
}) {
  const isSharp = blurScore >= 60;
  
  return (
    <div 
      className="blur-indicator"
      aria-label={`Sharpness: ${blurScore}%`}
    >
      <div className="blur-icon" aria-hidden="true">
        {isSharp ? (
          <Target size={18} strokeWidth={2.5} style={{ color: getQualityColor(blurScore) }} />
        ) : (
          <Cloud size={18} strokeWidth={2.5} style={{ color: getQualityColor(blurScore) }} />
        )}
      </div>
      <div className="blur-info">
        <div className="blur-bar-container">
          <div 
            className="blur-bar"
            style={{ 
              width: `${blurScore}%`,
              backgroundColor: getQualityColor(blurScore)
            }}
            aria-label={`Sharpness: ${blurScore}%`}
          />
        </div>
        <span className="blur-status">
          {isSharp ? 'Sharp' : blurScore >= 40 ? 'Hold steady' : 'Blurry'}
        </span>
      </div>
    </div>
  );
});

/**
 * Main Overlay Component
 */
export function CameraGuidanceOverlay({
  assessment,
  isActive,
  isReady,
  hidden = false,
}: CameraGuidanceOverlayProps) {
  if (hidden || !isActive || !assessment) {
    return null;
  }
  
  const { blurScore, lighting, guidanceMessage, guidanceType, overallScore } = assessment;
  
  return (
    <div 
      className="camera-guidance-overlay"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Top Bar - Quality Score */}
      <div className="guidance-top-bar">
        <QualityScoreRing score={overallScore} size={60} />
        <span className="guidance-title">Quality</span>
      </div>
      
      {/* Center - Framing Guide Enhancement */}
      <div className="guidance-center-overlay">
        {/* Corner brackets for framing assistance */}
        <div className={`framing-corners ${isReady ? 'ready' : ''}`} aria-hidden="true">
          <div className="corner top-left" />
          <div className="corner top-right" />
          <div className="corner bottom-left" />
          <div className="corner bottom-right" />
        </div>
        
        {/* Center point indicator */}
        <div className="center-point" aria-hidden="true" />
      </div>
      
      {/* Bottom - Guidance Message */}
      <div className={`guidance-message-container ${guidanceType}`}>
        <div className="guidance-message-icon" aria-hidden="true">
          {guidanceType === 'success' ? (
            <Check size={20} strokeWidth={3} />
          ) : guidanceType === 'warning' ? (
            <AlertTriangle size={20} strokeWidth={2.5} />
          ) : (
            <X size={20} strokeWidth={2.5} />
          )}
        </div>
        <p className="guidance-message-text">
          {guidanceMessage}
        </p>
        {isReady && (
          <div className="ready-indicator" aria-hidden="true">
            <Check size={16} strokeWidth={3} />
          </div>
        )}
      </div>
      
      {/* Details Panel - Lighting & Blur */}
      <div className="guidance-details-panel">
        <LightingIndicator
          brightness={lighting.brightness}
          contrast={lighting.contrast}
          status={lighting.status}
        />
        <BlurIndicator blurScore={blurScore} />
      </div>
      
      {/* Progress Ring Animation when ready */}
      {isReady && (
        <div className="ready-animation" aria-hidden="true">
          <div className="ready-pulse-ring" />
        </div>
      )}
    </div>
  );
}

/**
 * Simplified overlay for minimal UI
 */
export function CameraGuidanceOverlayMinimal({
  assessment,
  isActive,
  isReady,
  hidden = false,
}: CameraGuidanceOverlayProps) {
  if (hidden || !isActive || !assessment) {
    return null;
  }
  
  const { guidanceMessage, guidanceType, overallScore } = assessment;
  
  return (
    <div className="camera-guidance-overlay-minimal">
      {/* Simple quality indicator */}
      <div 
        className={`minimal-quality-dot ${guidanceType}`}
        style={{ backgroundColor: getQualityColor(overallScore) }}
        aria-label={`Quality: ${overallScore}%`}
      />
      
      {/* Guidance message */}
      <p className={`minimal-guidance-text ${guidanceType}`}>
        {guidanceMessage}
      </p>
      
      {/* Ready indicator */}
      {isReady && (
        <div className="minimal-ready-check" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

// Export memoized versions
export const MemoizedCameraGuidanceOverlay = memo(CameraGuidanceOverlay);
export const MemoizedCameraGuidanceOverlayMinimal = memo(CameraGuidanceOverlayMinimal);
