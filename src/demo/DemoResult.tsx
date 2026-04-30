import { useState, useRef, useCallback } from 'react';

interface AnalysisResult {
  fillPercentage: number;
  remainingMl: number;
  consumedMl: number;
  confidence: string;
  redLineYNormalized: number | null;
}

interface Props {
  capturedImage: string;
  result: AnalysisResult;
  onRetake: () => void;
}

const CUP_ML = 220;
const STEP_ML = 55;

function formatCups(ml: number): string {
  if (ml <= 0) return '0';
  const full = Math.floor(ml / CUP_ML);
  const rem = ml % CUP_ML;
  const frac = rem < STEP_ML ? '' : rem < STEP_ML * 2 ? '¼' : rem < STEP_ML * 3 ? '½' : '¾';
  if (full === 0) return frac || '¼';
  return frac ? `${full} ${frac}` : `${full}`;
}

function CupSVG({ fraction }: { fraction: 0 | 0.25 | 0.5 | 0.75 | 1 }) {
  const fillHeight = fraction * 44; // cup interior height ~44px
  const fillY = 54 - fillHeight; // bottom of cup interior at y=54
  return (
    <svg viewBox="0 0 60 64" width={48} height={52} style={{ display: 'block' }}>
      {/* Cup body */}
      <path d="M8,10 L6,58 Q6,62 10,62 L50,62 Q54,62 54,58 L52,10 Z" fill="none" stroke="#fff" strokeWidth="2.5" />
      {/* Handle */}
      <path d="M54,20 Q66,20 66,35 Q66,50 54,50" fill="none" stroke="#fff" strokeWidth="2.5" />
      {/* Fill */}
      {fraction > 0 && (
        <clipPath id="cup-clip">
          <path d="M8,10 L6,58 Q6,62 10,62 L50,62 Q54,62 54,58 L52,10 Z" />
        </clipPath>
      )}
      {fraction > 0 && (
        <rect x="6" y={fillY} width="48" height={fillHeight} fill="#f59e0b" clipPath="url(#cup-clip)" />
      )}
    </svg>
  );
}

export function DemoResult({ capturedImage, result, onRetake }: Props) {
  const maxStep = Math.floor(result.remainingMl / STEP_ML);
  const [stepCount, setStepCount] = useState(0); // steps poured from bottle
  const pourMl = stepCount * STEP_ML;

  const sliderRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const redLineY = result.redLineYNormalized ?? (1 - result.fillPercentage);

  const calcStep = useCallback((clientY: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height; // 0=bottom, 1=top
    const clamped = Math.max(0, Math.min(1, ratio));
    const step = Math.round(clamped * maxStep);
    setStepCount(step);
  }, [maxStep]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    calcStep(e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    calcStep(e.clientY);
  };
  const onPointerUp = () => { dragging.current = false; };

  const thumbPct = maxStep > 0 ? (stepCount / maxStep) * 100 : 0;

  const fullCups = Math.floor(pourMl / CUP_ML);
  const fracMl = pourMl % CUP_ML;
  const frac = fracMl < STEP_ML ? 0 : fracMl < STEP_ML * 2 ? 0.25 : fracMl < STEP_ML * 3 ? 0.5 : 0.75;
  const displayFrac = pourMl > 0 && frac === 0 ? 1 : frac;
  const cupsForDisplay: Array<0 | 0.25 | 0.5 | 0.75 | 1> = [
    ...Array(fullCups).fill(1 as const),
    ...(pourMl > 0 && (fullCups === 0 || fracMl > 0) ? [displayFrac as 0 | 0.25 | 0.5 | 0.75 | 1] : []),
  ];

  return (
    <div className="demo-result-root">
      {/* Header */}
      <div className="demo-result-header">
        <div className="demo-result-stat">
          <span className="demo-stat-label">Remaining</span>
          <span className="demo-stat-value">{result.remainingMl} ml</span>
        </div>
        <div className="demo-result-stat">
          <span className="demo-stat-label">Already used</span>
          <span className="demo-stat-value">{result.consumedMl} ml</span>
        </div>
      </div>

      {/* Bottle image + slider side by side */}
      <div className="demo-result-body">
        {/* Vertical slider — LEFT of bottle */}
        <div
          ref={sliderRef}
          className="demo-slider-track"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Tick marks every step */}
          {Array.from({ length: maxStep + 1 }, (_, i) => (
            <div
              key={i}
              className="demo-slider-tick"
              style={{ bottom: `${(i / Math.max(maxStep, 1)) * 100}%` }}
            />
          ))}
          {/* Fill bar */}
          <div className="demo-slider-fill" style={{ height: `${thumbPct}%` }} />
          {/* Thumb */}
          <div
            className="demo-slider-thumb"
            style={{ bottom: `${thumbPct}%` }}
          >
            <span className="demo-slider-thumb-label">{pourMl > 0 ? `${pourMl}ml` : 'pour'}</span>
          </div>
        </div>

        {/* Bottle image with red oil level line */}
        <div className="demo-bottle-img-wrapper">
          <img
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="captured bottle"
            className="demo-bottle-img"
          />
          {/* Red oil level line */}
          <div
            className="demo-oil-line"
            style={{ top: `${redLineY * 100}%` }}
          />
        </div>
      </div>

      {/* Cup visualization */}
      <div className="demo-cup-section">
        <p className="demo-cup-label">
          {pourMl === 0
            ? 'Drag slider to measure pour'
            : `Pouring: ${formatCups(pourMl)} ${pourMl >= CUP_ML ? 'cups' : 'cup'}`}
        </p>
        {pourMl > 0 && (
          <div className="demo-cup-row">
            {cupsForDisplay.map((f, i) => (
              <CupSVG key={i} fraction={f} />
            ))}
          </div>
        )}
      </div>

      {/* Retake button */}
      <button className="demo-retake-btn" onClick={onRetake}>
        📷 Scan Again
      </button>
    </div>
  );
}
