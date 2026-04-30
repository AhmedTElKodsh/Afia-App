import { useState } from 'react';
import { DemoCamera } from './DemoCamera.tsx';
import { DemoResult } from './DemoResult.tsx';
import './demo.css';

const WORKER_URL = import.meta.env.VITE_PROXY_URL || 'https://afia-worker.savola.workers.dev';
const SKU = 'afia-corn-1.5l';
const CAPACITY_ML = 1500;

type Screen = 'CAMERA' | 'ANALYZING' | 'RESULT';

interface AnalysisResult {
  fillPercentage: number;
  remainingMl: number;
  consumedMl: number;
  confidence: string;
  redLineYNormalized: number | null;
}

export function DemoApp() {
  const [screen, setScreen] = useState<Screen>('CAMERA');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (imageBase64: string) => {
    setCapturedImage(imageBase64);
    setScreen('ANALYZING');
    setError(null);

    try {
      const response = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: SKU, imageBase64 }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
      }

      const data = await response.json() as {
        fillPercentage: number;
        remainingMl: number;
        confidence: string;
        red_line_y_normalized?: number;
      };

      const remainingMl = data.remainingMl ?? Math.round(CAPACITY_ML * data.fillPercentage);
      const consumedMl = CAPACITY_ML - remainingMl;

      setResult({
        fillPercentage: data.fillPercentage,
        remainingMl,
        consumedMl,
        confidence: data.confidence,
        redLineYNormalized: data.red_line_y_normalized ?? (1 - data.fillPercentage),
      });
      setScreen('RESULT');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setScreen('CAMERA');
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setScreen('CAMERA');
  };

  if (screen === 'CAMERA' || screen === 'ANALYZING') {
    return (
      <div className="demo-root">
        <DemoCamera
          onCapture={handleCapture}
          disabled={screen === 'ANALYZING'}
        />
        {screen === 'ANALYZING' && (
          <div className="demo-analyzing-overlay">
            <div className="demo-spinner" />
            <p className="demo-analyzing-text">Analyzing...</p>
          </div>
        )}
        {error && (
          <div className="demo-error-banner">
            {error} — tap camera button to retry
          </div>
        )}
      </div>
    );
  }

  if (screen === 'RESULT' && result && capturedImage) {
    return (
      <div className="demo-root">
        <DemoResult
          capturedImage={capturedImage}
          result={result}
          onRetake={handleRetake}
        />
      </div>
    );
  }

  return null;
}
