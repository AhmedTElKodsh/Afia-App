import { useState, useCallback } from "react";
import "./App.css";
import "./components/Navigation.css";
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
import { ScanHistory } from "./components/ScanHistory.tsx";
import { BottleSelector } from "./components/BottleSelector.tsx";
import { useIosInAppBrowser } from "./hooks/useIosInAppBrowser.ts";
import { analyzeBottle } from "./api/apiClient.ts";
import { calculateVolumes } from "./utils/volumeCalculator.ts";
import { createStoredScan } from "./hooks/useScanHistory.ts";

function getSkuFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("sku");
}

function isTestMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("test") === "true";
}

type CurrentView = "scan" | "history" | "test";

export default function App() {
  const [currentView, setCurrentView] = useState<CurrentView>("scan");
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(hasAcceptedPrivacy);
  const [selectedSku, setSelectedSku] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("sku") || "";
  });

  const isIosInApp = useIosInAppBrowser();

  // Test mode: Show test harness for PC-based testing
  if (isTestMode()) {
    return <TestHarness />;
  }

  const bottle = selectedSku ? getBottleBySku(selectedSku) : null;

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
    if (!capturedImage || !selectedSku) return;

    setAppState("API_PENDING");
    setError(null);

    try {
      const analysisResult = await analyzeBottle(selectedSku, capturedImage);
      setResult(analysisResult);
      
      // Add to scan history
      const volumes = calculateVolumes(
        analysisResult.fillPercentage,
        bottle!.totalVolumeMl,
        bottle!.geometry
      );
      const storedScan = createStoredScan(
        analysisResult.scanId,
        selectedSku,
        bottle!.name,
        bottle!.totalVolumeMl,
        analysisResult,
        volumes.remaining.ml
      );
      // Store in localStorage for history
      const STORAGE_KEY = "afia_scan_history";
      const stored = localStorage.getItem(STORAGE_KEY);
      const scans = stored ? JSON.parse(stored) : [];
      scans.unshift(storedScan);
      if (scans.length > 500) scans.length = 500;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
      
      setAppState(
        analysisResult.confidence === "low"
          ? "API_LOW_CONFIDENCE"
          : "API_SUCCESS",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setAppState("API_ERROR");
    }
  }, [capturedImage, selectedSku, bottle]);

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
        <div className="app-with-nav">
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
          <BottleSelector onBottleChange={setSelectedSku} />
          <QrLanding bottle={bottleContext!} onStartScan={handleStartScan} />
          {!privacyAccepted && (
            <PrivacyNotice onAccepted={() => setPrivacyAccepted(true)} />
          )}
        </div>
      );

    case "CAMERA_ACTIVE":
      return (
        <div className="app-with-nav">
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
          <CameraCapture onCapture={handleCapture} />
        </div>
      );

    case "PHOTO_CAPTURED":
      return (
        <div className="app-with-nav">
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
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
        </div>
      );

    case "API_PENDING":
      return (
        <div className="app-with-nav">
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
          <ApiStatus state="loading" />
        </div>
      );

    case "API_ERROR":
      return (
        <div className="app-with-nav">
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
          <ApiStatus
            state="error"
            errorMessage={error ?? "Analysis failed"}
            onRetry={handleRetry}
            onRetake={handleRetake}
          />
        </div>
      );

    case "API_SUCCESS":
    case "API_LOW_CONFIDENCE":
      return result ? (
        <div className="app-with-nav">
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
          <ResultDisplay
            result={result}
            bottle={bottle!}
            onRetake={handleRetake}
          />
        </div>
      ) : null;

    default:
      return null;
  }
}

// Navigation Component
interface NavigationProps {
  currentView: CurrentView;
  onViewChange: (view: CurrentView) => void;
}

function Navigation({ currentView, onViewChange }: NavigationProps) {
  return (
    <nav className="main-navigation">
      <button
        className={`nav-item ${currentView === "scan" ? "active" : ""}`}
        onClick={() => onViewChange("scan")}
        aria-label="Scan"
      >
        <span className="nav-icon">📷</span>
        <span className="nav-label">Scan</span>
      </button>
      <button
        className={`nav-item ${currentView === "history" ? "active" : ""}`}
        onClick={() => onViewChange("history")}
        aria-label="History"
      >
        <span className="nav-icon">📊</span>
        <span className="nav-label">History</span>
      </button>
      <button
        className={`nav-item ${currentView === "test" ? "active" : ""}`}
        onClick={() => onViewChange("test")}
        aria-label="Test"
      >
        <span className="nav-icon">🧪</span>
        <span className="nav-label">Test</span>
      </button>
    </nav>
  );
}
