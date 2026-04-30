import { useState, useRef, useCallback, useEffect } from 'react';

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

const STEP_ML = 55;
const STEPS_PER_CUP = 4; // 4 × 55ml = 220ml

function cupLabel(fullCups: number, fracSteps: number, stepCount: number): string {
  if (stepCount === 0) return 'Drag slider to measure pour';
  const fracNames = ['', '¼', '½', '¾'];
  const frac = fracSteps === 0 ? '' : fracNames[fracSteps];
  if (fullCups === 0) return `${frac} Cup`;
  if (fracSteps === 0) return `${fullCups} Cup${fullCups > 1 ? 's' : ''}`;
  return `${fullCups}${frac} Cups`;
}

function CupSVG({ fraction }: { fraction: 0 | 0.25 | 0.5 | 0.75 | 1 }) {
  const fillHeight = fraction * 44;
  const fillY = 54 - fillHeight;
  return (
    <svg viewBox="0 0 70 64" width={56} height={52} style={{ display: 'block', overflow: 'visible' }}>
      <path d="M8,10 L6,58 Q6,62 10,62 L50,62 Q54,62 54,58 L52,10 Z" fill="none" stroke="#fff" strokeWidth="2.5" />
      <path d="M54,20 Q66,20 66,35 Q66,50 54,50" fill="none" stroke="#fff" strokeWidth="2.5" />
      {fraction > 0 && (
        <>
          <clipPath id="cup-clip">
            <path d="M8,10 L6,58 Q6,62 10,62 L50,62 Q54,62 54,58 L52,10 Z" />
          </clipPath>
          <rect x="6" y={fillY} width="48" height={fillHeight} fill="#f59e0b" clipPath="url(#cup-clip)" />
        </>
      )}
    </svg>
  );
}

export function DemoResult({ capturedImage, result, onRetake }: Props) {
  const maxStep = Math.floor(result.remainingMl / STEP_ML);
  const [stepCount, setStepCount] = useState(0);

  const sliderRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const bottleImgRef = useRef<HTMLImageElement>(null);
  const [bottleImgH, setBottleImgH] = useState(0);

  useEffect(() => {
    const img = bottleImgRef.current;
    if (!img) return;
    const obs = new ResizeObserver(([e]) => setBottleImgH(e.contentRect.height));
    obs.observe(img);
    return () => obs.disconnect();
  }, []);

  const redLineY = result.redLineYNormalized ?? (1 - result.fillPercentage);

  // 0=top (nothing poured, aligned with red line), 1=bottom (all poured)
  const calcStep = useCallback((clientY: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientY - rect.top) / rect.height;
    const clamped = Math.max(0, Math.min(1, ratio));
    setStepCount(Math.round(clamped * maxStep));
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

  // Thumb at top (step=0, red line) → moves down as more is poured
  const thumbTopPct = maxStep > 0 ? (stepCount / maxStep) * 100 : 0;

  const pourMl = stepCount * STEP_ML;
  const fullCups = Math.floor(stepCount / STEPS_PER_CUP);
  const fracSteps = stepCount % STEPS_PER_CUP;

  const cupFrac: 0 | 0.25 | 0.5 | 0.75 | 1 =
    stepCount === 0 ? 0 :
    fracSteps === 0 ? 1 :
    fracSteps === 1 ? 0.25 :
    fracSteps === 2 ? 0.5 : 0.75;

  const displayNumber = fullCups > 0 ? fullCups : null;

  const sliderHeight = Math.max(80, (1 - redLineY) * bottleImgH);
  const sliderMarginTop = redLineY * bottleImgH;

  return (
    <div className="demo-result-root">
      {/* Header stats */}
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

      {/* Bottle + slider row */}
      <div className="demo-result-body">
        {/* Slider: left of bottle, top aligned to red line */}
        <div
          ref={sliderRef}
          className="demo-slider-track"
          style={{
            marginTop: `${sliderMarginTop}px`,
            height: `${sliderHeight}px`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Tick marks from top */}
          {Array.from({ length: maxStep + 1 }, (_, i) => (
            <div
              key={i}
              className="demo-slider-tick"
              style={{ top: `${(i / Math.max(maxStep, 1)) * 100}%` }}
            />
          ))}
          {/* Amber fill: poured amount from top down */}
          <div className="demo-slider-fill" style={{ height: `${thumbTopPct}%` }} />
          {/* Thumb */}
          <div className="demo-slider-thumb" style={{ top: `${thumbTopPct}%` }}>
            <span className="demo-slider-thumb-label">
              {pourMl > 0 ? `${pourMl}ml` : '0ml'}
            </span>
          </div>
        </div>

        {/* Bottle image with red oil level line */}
        <div className="demo-bottle-img-wrapper">
          <img
            ref={bottleImgRef}
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="captured bottle"
            className="demo-bottle-img"
          />
          <div className="demo-oil-line" style={{ top: `${redLineY * 100}%` }} />
        </div>
      </div>

      {/* Cup visualization */}
      <div className="demo-cup-section">
        <p className="demo-cup-label">{cupLabel(fullCups, fracSteps, stepCount)}</p>
        {stepCount > 0 && (
          <div className="demo-cup-display">
            {displayNumber !== null && (
              <span className="demo-cup-number">{displayNumber}</span>
            )}
            <CupSVG fraction={cupFrac} />
          </div>
        )}
      </div>

      <button className="demo-retake-btn" onClick={onRetake}>
        📷 Scan Again
      </button>
    </div>
  );
}
