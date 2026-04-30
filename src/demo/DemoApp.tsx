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

interface WorkerError {
  error?: string;
  code?: string;
  details?: { retryAfter?: number };
  debug_providerErrors?: string[];
}

function parseWorkerError(body: WorkerError, httpStatus: number): string {
  const { code, details, debug_providerErrors } = body;

  if (code === 'RATE_LIMIT_EXCEEDED') {
    const wait = details?.retryAfter ?? 60;
    return `Rate limit reached — wait ${wait}s then retry`;
  }
  if (code === 'IMAGE_TOO_LARGE') {
    return 'Image too large (max 4MB) — retake with less zoom';
  }
  if (code === 'INVALID_REQUEST') {
    return `Invalid request — ${body.error ?? 'check image and retry'}`;
  }
  if (code === 'SERVICE_UNAVAILABLE') {
    if (debug_providerErrors && debug_providerErrors.length > 0) {
      const providerLines = debug_providerErrors.map(e => {
        if (/gemini/i.test(e)) return `• Gemini: ${extractReason(e)}`;
        if (/groq/i.test(e)) return `• Groq: ${extractReason(e)}`;
        if (/openrouter/i.test(e)) return `• OpenRouter: ${extractReason(e)}`;
        if (/mistral/i.test(e)) return `• Mistral: ${extractReason(e)}`;
        return `• ${e}`;
      });
      return `All AI providers failed:\n${providerLines.join('\n')}`;
    }
    return 'All AI providers unavailable — check API keys in GitHub Secrets';
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return 'API key rejected (401/403) — verify keys in GitHub Secrets';
  }
  if (httpStatus === 429) {
    return 'API quota exhausted — add more Gemini keys or wait';
  }
  if (httpStatus >= 500) {
    return `Server error (${httpStatus}) — worker may be down`;
  }

  return body.error ?? `Request failed (HTTP ${httpStatus})`;
}

function extractReason(providerError: string): string {
  if (/401|unauthorized|api.?key|invalid.?key/i.test(providerError)) return 'Invalid or missing API key';
  if (/429|quota|rate.?limit/i.test(providerError)) return 'Quota / rate limit exceeded';
  if (/timeout|timed.?out/i.test(providerError)) return 'Request timed out';
  if (/network|fetch|ECONNREFUSED/i.test(providerError)) return 'Network error';
  if (/500|503|service.?unavailable/i.test(providerError)) return 'Provider service down';
  // Trim to keep UI readable
  return providerError.length > 80 ? `${providerError.slice(0, 80)}…` : providerError;
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
        const body: WorkerError = await response.json().catch(() => ({}));
        throw new Error(parseWorkerError(body, response.status));
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
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setError(msg);
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
