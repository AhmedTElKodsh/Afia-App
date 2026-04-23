import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

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
import { FillConfirmScreen } from "./components/FillConfirmScreen/FillConfirmScreen.tsx";
import { ResultDisplay } from "./components/ResultDisplay.tsx";
import { IosWarning } from "./components/IosWarning.tsx";
import { useIosInAppBrowser } from "./hooks/useIosInAppBrowser.ts";
import { reportScanError } from "./api/apiClient.ts";
import { calculateVolumes } from "../shared/volumeCalculator.ts";
import { useScanHistory, createStoredScan } from "./hooks/useScanHistory.ts";
import { analyze as runAnalysis } from "./services/analysisRouter.ts";
import { AppControls } from "./components/AppControls.tsx";
import { AnalyzingOverlay } from "./components/AnalyzingOverlay.tsx";
import { SkeletonHistory, SkeletonAdmin } from "./components/Skeleton.tsx";
import { hapticFeedback } from "./utils/haptics.ts";
import { UploadQualityWarning } from "./components/UploadQualityWarning.tsx";
import { getQueueLength } from "./services/syncQueue.ts";
import { useAppLifecycleEffects } from "./hooks/useAppLifecycleEffects.ts";

// Lazy load non-critical components
const ScanHistory = lazy(() => import("./components/ScanHistory.tsx").then(m => ({ default: m.ScanHistory })));
const BottleSelector = lazy(() => import("./components/BottleSelector.tsx").then(m => ({ default: m.BottleSelector })));
const AdminDashboard = lazy(() => import("./components/AdminDashboard.tsx").then(m => ({ default: m.AdminDashboard })));
const TestLab = lazy(() => import("./components/TestLab.tsx").then(m => ({ default: m.TestLab })));

import { Navigation, type CurrentView } from "./components/Navigation.tsx";

declare global {
  interface Window {
    __AFIA_TEST_MODE__?: boolean;
    __AFIA_FORCE_MANUAL__?: boolean;
    __AFIA_PREVENT_CAPTURE__?: boolean;
    __AFIA_TRIGGER_ANALYZE__?: (base64Override?: string) => void;
    __AFIA_TRIGGER_ERROR__?: (message: string) => void;
    webkitAudioContext?: typeof AudioContext;
  }
}

// Helper function to check if admin session is valid
const hasValidAdminSession = (): boolean => {
  const token = sessionStorage.getItem('afia_admin_session');
  return !!token;
};

export default function App() {
  const { t } = useTranslation();
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
  const [analysisProgress, setAnalysisProgress] = useState<string>("");
  const [selectedSku, setSelectedSku] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    
    // M8: Enable test mode and bypasses via URL params for maximum E2E reliability
    // SECURITY: Require DEV *and* a local runtime host to avoid a "DEV build accidentally deployed"
    // becoming a privacy/onboarding bypass in production.
    const isLocalHost =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (import.meta.env.DEV && isLocalHost && params.get("test_mode") === "1") {
      window.__AFIA_TEST_MODE__ = true;
      localStorage.setItem('afia_privacy_accepted', 'true');
      localStorage.setItem('afia_onboarding_complete', 'true');
      localStorage.setItem('afia_mock_mode', 'true');
    }
    
    return params.get("sku") || "";
  });
  
  // Story 7.8 - AC2: Quality warning state
  const [qualityWarning, setQualityWarning] = useState<string[] | null>(null);
  // Ref instead of state — avoids stale closure / batching issue where resolver
  // could be replaced by a concurrent re-render before the user responds.
  const qualityWarningResolverRef = useRef<((value: boolean) => void) | null>(null);
  
  // Story 7.8 - AC5: Pending sync queue count
  const [, setPendingSyncCount] = useState<number>(0);
  // Prevents concurrent handleAnalyze calls (C2: double-tap guard)
  const isAnalyzingRef = useRef<boolean>(false);

  const { addScan } = useScanHistory();
  useAppLifecycleEffects({ setPendingSyncCount });

  // Admin mode: URL param AND valid session token required
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(hasValidAdminSession());
  const isAdminMode = isAdminUrlParam && isAdminAuthenticated;

  const isIosInApp = useIosInAppBrowser();

  // All callbacks must be declared before any early returns (Rules of Hooks)
  const bottle = selectedSku ? getBottleBySku(selectedSku) : null;

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    // C1: resolve the pending promise before nulling, so runAnalysis can settle
    const resolver = qualityWarningResolverRef.current;
    if (resolver) {
      qualityWarningResolverRef.current = null;
      resolver(false);
    }
    setQualityWarning(null);
    isAnalyzingRef.current = false;
    setAppState("CAMERA_ACTIVE");
  }, []);

  const handleAnalyze = useCallback(async (base64Override?: string) => {
    const img = typeof base64Override === "string" ? base64Override : capturedImage;
    if (!img || !selectedSku) return;
    // C2: guard against concurrent invocations (double-tap)
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;

    setAppState("API_PENDING");
    setError(null);
    setAnalysisProgress(t('analysis.preparing', 'Preparing analysis...'));

    try {
      // Story 7.8: Use analysisRouter with quality warning callback
      const analysisResult = await runAnalysis({
        sku: selectedSku,
        imageBase64: img,
        totalVolumeMl: bottle?.totalVolumeMl || 1500,
        onProgress: (message) => setAnalysisProgress(message),
        onQualityWarning: async (reasons: string[]) => {
          return new Promise<boolean>((resolve) => {
            let settled = false;
            // Auto-dismiss after 30s — defaults to retake so analysis doesn't hang forever
            const timeout = window.setTimeout(() => {
              if (!settled) {
                settled = true;
                qualityWarningResolverRef.current = null;
                setQualityWarning(null);
                resolve(false);
              }
            }, 30_000);
            qualityWarningResolverRef.current = (value: boolean) => {
              if (!settled) {
                settled = true;
                clearTimeout(timeout);
                resolve(value);
              }
            };
            setQualityWarning(reasons);
          });
        },
      });
      
      setResult(analysisResult);

      if (analysisResult.isUnsupportedSku) {
        // Increment local contribution counter
        const count = Number(localStorage.getItem('afia_contributions') || '0');
        localStorage.setItem('afia_contributions', String(count + 1));
        setAppState("API_SUCCESS");
        return;
      }
      
      // Story 7.8 - AC3: Check if scan was queued for background sync
      if (analysisResult.queuedForSync && bottle) {
        const queuedScan = createStoredScan(
          analysisResult.scanId,
          selectedSku,
          bottle.name,
          bottle.totalVolumeMl,
          { ...analysisResult },
          analysisResult.remainingMl // Use calculated ml from local result
        );
        addScan(queuedScan);
        setAppState("API_SUCCESS");
        // Update pending count
        try {
          const count = await getQueueLength();
          setPendingSyncCount(count);
        } catch { /* IndexedDB unavailable — non-fatal */ }
        return;
      } else if (analysisResult.queuedForSync) {
        setAppState("API_SUCCESS");
        return;
      }

      setAppState("FILL_CONFIRM");
    } catch (err) {
      // M1: clear quality warning overlay if it's stuck after a throw
      if (qualityWarningResolverRef.current) {
        qualityWarningResolverRef.current = null;
        setQualityWarning(null);
      }
      
      const error = err as Error;
      
      // Story 7.8 - AC2: Handle user cancellation
      if (error.message.startsWith('USER_CANCELLED:')) {
        handleRetake();
        return;
      }

      // Story 7.6 - AC6: Handle needs-sku route
      if (error.message.startsWith('NEEDS_SKU:')) {
        // Switch to bottle selector view so user can pick SKU manually
        setCurrentView("scan"); // Ensure we are on scan tab
        setAppState("IDLE");    // Reset to idle to show selector
        // We keep the captured image so we can analyze it once SKU is picked
        // Actually, the UX is better if they pick THEN scan if it was a brand rejection
        return;
      }

      const msg = error.message || t('errors.analysis', 'Analysis failed');
      setError(msg);
      setAppState("API_ERROR");
      reportScanError(selectedSku, msg, navigator.userAgent);
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [addScan, bottle, capturedImage, handleRetake, selectedSku, t]);

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

  const handleRetry = useCallback(() => {
    handleAnalyze();
  }, [handleAnalyze]);

  // Story 7.8 - AC2: Quality warning dialog handlers
  const handleQualityRetake = useCallback(() => {
    const resolver = qualityWarningResolverRef.current;
    if (resolver) {
      qualityWarningResolverRef.current = null;
      setQualityWarning(null);
      resolver(false);
    }
  }, []);

  const handleQualityContinue = useCallback(() => {
    const resolver = qualityWarningResolverRef.current;
    if (resolver) {
      qualityWarningResolverRef.current = null;
      setQualityWarning(null);
      resolver(true);
    }
  }, []);

  // E2E test hook: allows tests to programmatically trigger analysis without camera capture
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (window.__AFIA_TEST_MODE__) {
      // Minimal 1×1 blank JPEG for test (must include data URI prefix to pass validation)
      const blankJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAFCAABAAEEAQD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABgB/9k=';
      window.__AFIA_TRIGGER_ANALYZE__ = () => {
        setCapturedImage(blankJpeg);
        handleAnalyze(blankJpeg);
      };
      window.__AFIA_TRIGGER_ERROR__ = (message: string) => {
        // Story 7.6 - AC6: Handle needs-sku route
        if (message.startsWith('NEEDS_SKU:')) {
          setCurrentView("scan");
          setAppState("IDLE");
          return;
        }
        setError(message);
        setAppState("API_ERROR");
      };
    }
    return () => {
      delete window.__AFIA_TRIGGER_ANALYZE__;
      delete window.__AFIA_TRIGGER_ERROR__;
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

  // Unknown SKU — only block in IDLE; camera/analysis states must render their own screens
  if ((!bottle || !bottleContext) && appState === "IDLE") {
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
              <QrLanding bottle={bottleContext!} onStartScan={handleStartScan} />
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
            onPermissionDenied={() => setError(t('camera.permissionDenied'))}
            onCancel={() => setAppState("IDLE")}
            sku={selectedSku}
          />
        </div>
      );

    case "API_PENDING":
      return (
        <div className="app-with-nav">
          <AppControls isAdminMode={isAdminMode} />
          <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
          {qualityWarning ? (
            <UploadQualityWarning
              reasons={qualityWarning}
              onRetake={handleQualityRetake}
              onContinue={handleQualityContinue}
            />
          ) : (
            <AnalyzingOverlay 
              capturedImage={capturedImage} 
              onCancel={handleRetake}
              progressMessage={analysisProgress}
            />
          )}
        </div>
      );

    case "FILL_CONFIRM":
      if (!result || !capturedImage || !bottle) {
        return (
          <div className="app-with-nav">
            <AppControls isAdminMode={isAdminMode} />
            <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
            <ApiStatus state="error" errorMessage={t('errors.stateLost', 'Analysis state lost')} onRetry={handleRetake} onRetake={handleRetake} />
          </div>
        );
      }
      return (
        <div className="app-with-nav">
          <AppControls isAdminMode={isAdminMode} />
          <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
          <FillConfirmScreen
            imageDataUrl={capturedImage}
            aiEstimatePercent={result.fillPercentage}
            bottleCapacityMl={bottle.totalVolumeMl}
            bottleTopPct={Math.min(bottle.frameTopPct ?? 0.05, (bottle.frameBottomPct ?? 0.95) - 0.01)}
            bottleBottomPct={Math.max(bottle.frameBottomPct ?? 0.95, (bottle.frameTopPct ?? 0.05) + 0.01)}
            onConfirm={(waterMl: number) => {
              // H5: guard against malformed registry entry with totalVolumeMl === 0
              const finalPercentage = bottle.totalVolumeMl > 0
                ? Math.min(100, (waterMl / bottle.totalVolumeMl) * 100)
                : 0;
              handleConfirmFill(finalPercentage);
            }}
            onRetake={handleRetake}
          />
        </div>
      );

    case "API_ERROR":
      return (
        <div className="app-with-nav">
          <AppControls isAdminMode={isAdminMode} />
          <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
          <ApiStatus
            state="error"
            errorMessage={error ?? t('errors.analysis', 'Analysis failed')}
            onRetry={handleRetry}
            onRetake={handleRetake}
          />
        </div>
      );

    case "API_SUCCESS":
    case "API_LOW_CONFIDENCE":
      if (!result) {
        return (
          <div className="app-with-nav">
            <AppControls isAdminMode={isAdminMode} />
            <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
            <ApiStatus state="error" errorMessage={t('errors.analysisUnavailable', 'Analysis result unavailable')} onRetry={handleRetake} onRetake={handleRetake} />
          </div>
        );
      }
      return (
        <div className="app-with-nav">
          <AppControls isAdminMode={isAdminMode} />
          <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
          <ResultDisplay
            result={result}
            bottle={bottle!}
            capturedImage={capturedImage ?? undefined}
            onRetake={handleRetake}
          />
        </div>
      );

    default:
      return null;
  }
}



