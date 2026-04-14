import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Camera, History, LayoutDashboard, FlaskConical } from "lucide-react";

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
import { CameraViewfinder } from "./components/CameraViewfinder.tsx";
import { ApiStatus } from "./components/ApiStatus.tsx";
import { FillConfirm } from "./components/FillConfirm.tsx";
import { ResultDisplay } from "./components/ResultDisplay.tsx";
import { IosWarning } from "./components/IosWarning.tsx";
import { useIosInAppBrowser } from "./hooks/useIosInAppBrowser.ts";
import { analyzeBottle, reportScanError } from "./api/apiClient.ts";
import { calculateVolumes } from "./utils/volumeCalculator.ts";
import { useScanHistory, createStoredScan } from "./hooks/useScanHistory.ts";
import { useLocalAnalysis } from "./hooks/useLocalAnalysis.ts";
import { AppControls } from "./components/AppControls.tsx";
import { AnalyzingOverlay } from "./components/AnalyzingOverlay.tsx";
import { SkeletonHistory, SkeletonAdmin } from "./components/Skeleton.tsx";
import { hapticFeedback } from "./utils/haptics.ts";

// Lazy load non-critical components
const ScanHistory = lazy(() => import("./components/ScanHistory.tsx").then(m => ({ default: m.ScanHistory })));
const BottleSelector = lazy(() => import("./components/BottleSelector.tsx").then(m => ({ default: m.BottleSelector })));
const AdminDashboard = lazy(() => import("./components/AdminDashboard.tsx").then(m => ({ default: m.AdminDashboard })));
const TestLab = lazy(() => import("./components/TestLab.tsx").then(m => ({ default: m.TestLab })));

const ADMIN_SESSION_KEY = "afia_admin_session";
const ADMIN_SESSION_EXPIRES_KEY = "afia_admin_session_expires";

function hasValidAdminSession(): boolean {
  const token = sessionStorage.getItem(ADMIN_SESSION_KEY);
  const expiresAt = Number(sessionStorage.getItem(ADMIN_SESSION_EXPIRES_KEY) || "0");
  return !!(token && expiresAt > Date.now());
}

type CurrentView = "scan" | "history" | "admin";

export default function App() {
  const [isAdminUrlParam] = useState(() => window.location.search.includes("mode=admin"));

  const [currentView, setCurrentView] = useState<CurrentView>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    if (viewParam === "scan" || viewParam === "history" || viewParam === "admin") {
      return viewParam as CurrentView;
    }
    return isAdminUrlParam ? "admin" : "scan";
  });
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSku, setSelectedSku] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("sku") || "";
  });

  const { addScan } = useScanHistory();
  const { runAnalysis, loadModel, isModelReady } = useLocalAnalysis();

  // Load local model on mount (Stage 2 Prep)
  useEffect(() => {
    loadModel();
  }, [loadModel]);

  // Admin mode: URL param AND valid session token required
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(hasValidAdminSession);
  const isAdminMode = isAdminUrlParam && isAdminAuthenticated;

  const isIosInApp = useIosInAppBrowser();

  // All callbacks must be declared before any early returns (Rules of Hooks)
  const bottle = selectedSku ? getBottleBySku(selectedSku) : null;

  const handleAnalyze = useCallback(async (base64Override?: string) => {
    const img = typeof base64Override === "string" ? base64Override : capturedImage;
    if (!img || !selectedSku) return;

    setAppState("API_PENDING");
    setError(null);

    try {
      // Stage 2: Attempt local analysis with LLM fallback
      const analysisResult = await runAnalysis(img, selectedSku);
      setResult(analysisResult);

      if (analysisResult.isUnsupportedSku) {
        // Increment local contribution counter
        const count = Number(localStorage.getItem('afia_contributions') || '0');
        localStorage.setItem('afia_contributions', String(count + 1));
        setAppState("API_SUCCESS");
        return;
      }

      setAppState("FILL_CONFIRM");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setError(msg);
      setAppState("API_ERROR");
      reportScanError(selectedSku, msg, navigator.userAgent);
    }
  }, [capturedImage, selectedSku, bottle]);

  const handleConfirmFill = useCallback((finalPercentage: number) => {
    if (!result || !bottle) return;

    // Update result with user-confirmed value
    const confirmedResult = {
      ...result,
      fillPercentage: finalPercentage
    };
    setResult(confirmedResult);

    // Add to scan history via hook
    const volumes = calculateVolumes(
      finalPercentage,
      bottle.totalVolumeMl,
      bottle.geometry
    );
    const storedScan = createStoredScan(
      result.scanId,
      selectedSku,
      bottle.name,
      bottle.totalVolumeMl,
      confirmedResult,
      volumes.remaining.ml
    );
    addScan(storedScan);

    setAppState(
      result.confidence === "low"
        ? "API_LOW_CONFIDENCE"
        : "API_SUCCESS",
    );
  }, [result, bottle, selectedSku, addScan]);

  const handleCapture = useCallback((imageBase64: string) => {
    // Trigger haptic feedback for camera capture
    hapticFeedback.shutter();

    // Play shutter sound via Web Audio API
    try {
      // @ts-expect-error - Vendor prefix
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) {
        const audioCtx = new AudioContextCtor();

        // Shutter open
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
        gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.05);

        // Shutter close
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(audioCtx.currentTime + 0.1);
        osc2.stop(audioCtx.currentTime + 0.15);
      }
    } catch(e) {
      console.error('Audio failed', e);
    }

    setCapturedImage(imageBase64);
    // Immediately trigger analysis
    handleAnalyze(imageBase64);
  }, [handleAnalyze]);

  const handleStartScan = useCallback(() => {
    setAppState("CAMERA_ACTIVE");
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setAppState("CAMERA_ACTIVE");
  }, []);

  const handleRetry = useCallback(() => {
    handleAnalyze();
  }, [handleAnalyze]);

  // E2E test hook: allows tests to programmatically trigger analysis without camera capture
  useEffect(() => {
    if (window.__AFIA_TEST_MODE__) {
      // Minimal 1×1 blank JPEG for test
      const blankJpeg = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAFCAABAAEEAQD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABgB/9k=';
      window.__AFIA_TRIGGER_ANALYZE__ = () => handleAnalyze(blankJpeg);
    }
    return () => {
      delete window.__AFIA_TRIGGER_ANALYZE__;
    };
  }, [handleAnalyze]);

  // ── Early returns AFTER all hooks ──

  // Show iOS in-app browser warning before anything else
  if (isIosInApp) {
    return <IosWarning />;
  }

  // Admin URL param present but not yet authenticated → show login gate only
  if (isAdminUrlParam && !isAdminAuthenticated) {
    return (
      <Suspense fallback={<SkeletonAdmin />}>
        <AdminDashboard
          onAuthSuccess={() => setIsAdminAuthenticated(true)}
        />
      </Suspense>
    );
  }

  const bottleContext: BottleContext | null = bottle
    ? {
        sku: bottle.sku,
        name: bottle.name,
        oilType: bottle.oilType,
        totalVolumeMl: bottle.totalVolumeMl,
      }
    : null;

  // Render non-scan views (history, test, admin) regardless of scan state
  if (currentView === "history") {
    return (
      <div className="app-with-nav">
        <AppControls isAdminMode={isAdminMode} />
        <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
        <Suspense fallback={<SkeletonHistory />}>
          <ScanHistory onNavigateToScan={() => setCurrentView("scan")} />
        </Suspense>
      </div>
    );
  }

  if (currentView === "admin") {
    return (
      <div className="app-with-nav">
        <AppControls isAdminMode={isAdminMode} />
        <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
        <Suspense fallback={<SkeletonAdmin />}>
          <AdminDashboard
            onLogout={() => setIsAdminAuthenticated(false)}
          />
        </Suspense>
      </div>
    );
  }

  // Scan view — check bottle validity
  // No SKU selected
  if (!selectedSku) {
    return (
      <div className="app-with-nav">
        <AppControls isAdminMode={isAdminMode} />
        <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
        {isAdminMode && (
          <Suspense fallback={null}>
            <BottleSelector onBottleChange={setSelectedSku} />
          </Suspense>
        )}
        <UnknownBottle sku={null} />
      </div>
    );
  }

  // Unknown SKU
  if (!bottle || !bottleContext) {
    return (
      <div className="app-with-nav">
        <AppControls isAdminMode={isAdminMode} />
        <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
        <UnknownBottle sku={selectedSku} onStartContribution={handleStartScan} />
      </div>
    );
  }

  switch (appState) {
    case "IDLE":
      return (
        <div className="app-with-nav">
        <AppControls isAdminMode={isAdminMode} />
          <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
          {isAdminMode ? (
            <Suspense fallback={<div className="app-loading" />}>
              <TestLab
                isAdmin={true}
              />
            </Suspense>
          ) : (
            <>
              {isAdminMode && <BottleSelector onBottleChange={setSelectedSku} />}
              <QrLanding bottle={bottleContext} onStartScan={handleStartScan} />
            </>
          )}
        </div>
      );

    case "CAMERA_ACTIVE":
      return (
        <div className="camera-fullscreen-view">
          <AppControls isAdminMode={isAdminMode} />
          <CameraViewfinder
            onCapture={handleCapture}
            onError={setError}
            onPermissionDenied={() => setError('Camera permission denied')}
            onCancel={() => setAppState("IDLE")}
            sku={selectedSku}
          />
        </div>
      );

    case "PHOTO_CAPTURED":
      // We skip PHOTO_CAPTURED now as we auto-analyze, but keep for fallback
      return null;

    case "API_PENDING":
      return (
        <div className="app-with-nav">
          <AppControls isAdminMode={isAdminMode} />
          <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
          <AnalyzingOverlay capturedImage={capturedImage} onCancel={handleRetake} />
        </div>
      );

    case "FILL_CONFIRM":
      return result && capturedImage ? (
        <div className="app-with-nav">
          <AppControls isAdminMode={isAdminMode} />
          <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
          <FillConfirm
            capturedImage={capturedImage}
            result={result}
            onConfirm={handleConfirmFill}
            onRetake={handleRetake}
          />
        </div>
      ) : null;

    case "API_ERROR":
      return (
        <div className="app-with-nav">
          <AppControls isAdminMode={isAdminMode} />
          <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
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
          <AppControls isAdminMode={isAdminMode} />
          <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
          <ResultDisplay
            result={result}
            bottle={bottle}
            capturedImage={capturedImage ?? undefined}
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
  isAdminMode: boolean;
}

function Navigation({ currentView, onViewChange, isAdminMode }: NavigationProps) {
  const { t } = useTranslation();
  return (
    <nav className={`main-navigation${isAdminMode ? " main-navigation--admin" : ""}`}>
      {isAdminMode ? (
        // Admin Mode Navigation: Test Lab | History | Dashboard
        <>
          <button
            className={`nav-item ${currentView === "scan" ? "active" : ""}`}
            onClick={() => onViewChange("scan")}
            aria-label={t('nav.testLab')}
          >
            <span className="nav-icon"><FlaskConical size={20} strokeWidth={2} /></span>
            <span className="nav-label">{t('nav.testLab')}</span>
          </button>
          <button
            className={`nav-item ${currentView === "history" ? "active" : ""}`}
            onClick={() => onViewChange("history")}
            aria-label={t('nav.history')}
          >
            <span className="nav-icon"><History size={20} strokeWidth={2} /></span>
            <span className="nav-label">{t('nav.history')}</span>
          </button>
          <button
            className={`nav-item ${currentView === "admin" ? "active" : ""}`}
            onClick={() => onViewChange("admin")}
            aria-label={t('nav.dashboard')}
          >
            <span className="nav-icon"><LayoutDashboard size={20} strokeWidth={2} /></span>
            <span className="nav-label">{t('nav.dashboard')}</span>
          </button>
        </>
      ) : (
        // User Mode Navigation: Scan | History
        <>
          <button
            className={`nav-item ${currentView === "scan" ? "active" : ""}`}
            onClick={() => onViewChange("scan")}
            aria-label={t('nav.scan')}
          >
            <span className="nav-icon"><Camera size={20} strokeWidth={2} /></span>
            <span className="nav-label">{t('nav.scan')}</span>
          </button>
          <button
            className={`nav-item ${currentView === "history" ? "active" : ""}`}
            onClick={() => onViewChange("history")}
            aria-label={t('nav.history')}
          >
            <span className="nav-icon"><History size={20} strokeWidth={2} /></span>
            <span className="nav-label">{t('nav.history')}</span>
          </button>
        </>
      )}
    </nav>
  );
}


