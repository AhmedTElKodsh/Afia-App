import { useState, useCallback } from "react";
import "./App.css";
import type {
  AppState,
  AnalysisResult,
  BottleContext,
} from "./state/appState.ts";
import { getBottleBySku } from "./data/bottleRegistry.ts";
import { QrLanding } from "./components/QrLanding.tsx";
import { UnknownBottle } from "./components/UnknownBottle.tsx";
import { CameraCapture } from "./components/CameraCapture.tsx";
import { ApiStatus } from "./components/ApiStatus.tsx";
import { ResultDisplay } from "./components/ResultDisplay.tsx";
import { IosWarning } from "./components/IosWarning.tsx";
import {
  PrivacyNotice,
  hasAcceptedPrivacy,
} from "./components/PrivacyNotice.tsx";
import { TestHarness } from "./components/TestHarness.tsx";
import { useIosInAppBrowser } from "./hooks/useIosInAppBrowser.ts";
import { analyzeBottle } from "./api/apiClient.ts";

function getSkuFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("sku");
}

function isTestMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("test") === "true";
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(hasAcceptedPrivacy);

  const isIosInApp = useIosInAppBrowser();

  // Test mode: Show test harness for PC-based testing
  if (isTestMode()) {
    return <TestHarness />;
  }

  const sku = getSkuFromUrl();
  const bottle = sku ? getBottleBySku(sku) : null;

  // Show iOS in-app browser warning before anything else
  if (isIosInApp) {
    return <IosWarning />;
  }

  const bottleContext: BottleContext | null = bottle
    ? {
        sku: bottle.sku,
        name: bottle.name,
        oilType: bottle.oilType,
        totalVolumeMl: bottle.totalVolumeMl,
      }
    : null;

  const handleStartScan = useCallback(() => {
    setAppState("CAMERA_ACTIVE");
  }, []);

  const handleCapture = useCallback((imageBase64: string) => {
    setCapturedImage(imageBase64);
    setAppState("PHOTO_CAPTURED");
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setAppState("CAMERA_ACTIVE");
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!capturedImage || !sku) return;

    setAppState("API_PENDING");
    setError(null);

    try {
      const analysisResult = await analyzeBottle(sku, capturedImage);
      setResult(analysisResult);
      setAppState(
        analysisResult.confidence === "low"
          ? "API_LOW_CONFIDENCE"
          : "API_SUCCESS",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setAppState("API_ERROR");
    }
  }, [capturedImage, sku]);

  const handleRetry = useCallback(() => {
    handleAnalyze();
  }, [handleAnalyze]);

  // No SKU in URL
  if (!sku) {
    return <UnknownBottle sku={null} />;
  }

  // Unknown SKU
  if (!bottle || !bottleContext) {
    return <UnknownBottle sku={sku} />;
  }

  switch (appState) {
    case "IDLE":
      return (
        <>
          <QrLanding bottle={bottleContext} onStartScan={handleStartScan} />
          {!privacyAccepted && (
            <PrivacyNotice onAccepted={() => setPrivacyAccepted(true)} />
          )}
        </>
      );

    case "CAMERA_ACTIVE":
      return <CameraCapture onCapture={handleCapture} />;

    case "PHOTO_CAPTURED":
      return (
        <div className="photo-preview-screen">
          <div className="preview-image-container">
            <img
              src={`data:image/jpeg;base64,${capturedImage}`}
              alt="Captured bottle photo"
              className="preview-image"
            />
          </div>
          <div className="preview-actions">
            <button className="btn btn-outline" onClick={handleRetake}>
              Retake
            </button>
            <button className="btn btn-primary" onClick={handleAnalyze}>
              Use Photo
            </button>
          </div>
        </div>
      );

    case "API_PENDING":
      return <ApiStatus state="loading" />;

    case "API_ERROR":
      return (
        <ApiStatus
          state="error"
          errorMessage={error ?? "Analysis failed"}
          onRetry={handleRetry}
          onRetake={handleRetake}
        />
      );

    case "API_SUCCESS":
    case "API_LOW_CONFIDENCE":
      return result ? (
        <ResultDisplay
          result={result}
          bottle={bottle}
          onRetake={handleRetake}
        />
      ) : null;

    default:
      return null;
  }
}
