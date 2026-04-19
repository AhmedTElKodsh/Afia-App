/**
 * TestLab Component
 *
 * Unified admin testing interface that simulates the exact user scanning workflow
 * while providing optional debug tools for validation.
 *
 * Features:
 * - Exact user flow simulation
 * - Mock QR code scanning
 * - Bottle selector dropdown with search
 * - Expandable admin tools overlay
 * - Test metadata tracking
 * - First-time onboarding
 * - Toast notifications
 * - Analytics tracking
 * - Keyboard shortcuts
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Beaker, QrCode, Smartphone, RefreshCcw, AlertTriangle, TestTube, ExternalLink, Zap } from "lucide-react";
import { getBottleBySku, ACTIVE_SKU, activeBottleRegistry } from "../data/bottleRegistry.ts";
import { CameraViewfinder } from "./CameraViewfinder.tsx";
import { ResultDisplay } from "./ResultDisplay.tsx";
import { AdminToolsOverlay } from "./AdminToolsOverlay.tsx";
import { AdminOnboarding } from "./AdminOnboarding.tsx";
import { ApiInspector } from "./ApiInspector.tsx";
import { VisualRegressionHarness } from "./VisualRegressionHarness.tsx";
import { MockApiPanel } from "./MockApiPanel.tsx";
import { useToast } from "./Toast.tsx";
import { analytics } from "../utils/analytics.ts";
import { useScanHistory } from "../hooks/useScanHistory.ts";
import { mockAnalyzeBottle, type MockScenario } from "../utils/mockAnalysisApi.ts";
import "./TestLab.css";

const WORKER_URL = import.meta.env.VITE_PROXY_URL || "";

export type EntryPointType = "mock-qr" | "bottle-select" | "manual-sku";
export type TestLabState = "idle" | "scanning" | "analyzing" | "complete" | "error";

export interface TestLabProps {
  /** Admin mode flag */
  isAdmin: boolean;
  /** Current selected SKU from parent */
  selectedSku?: string;
  /** Callback when SKU changes */
  onSkuChange?: (sku: string) => void;
}

export function TestLab({ isAdmin, selectedSku: propsSku, onSkuChange }: TestLabProps) {
  const { t, i18n } = useTranslation();
  const { success, error: showError, info } = useToast();
  const { updateFeedback } = useScanHistory();

  const isRTL = i18n.language === 'ar';

  // Tab and debug panel state
  const [activeTab, setActiveTab] = useState<"flow" | "inspector" | "visuals">(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "flow" || tabParam === "inspector" || tabParam === "visuals") {
      return tabParam as "flow" | "inspector" | "visuals";
    }
    return "flow";
  });
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);

  // Local state for SKU if not provided by parent (fallback)
  const [internalSku, setInternalSku] = useState<string>(ACTIVE_SKU);
  
  // Use prop if available, otherwise internal
  const selectedSku = propsSku !== undefined ? propsSku : internalSku;
  const setSelectedSku = useCallback((sku: string) => {
    if (onSkuChange) {
      onSkuChange(sku);
    } else {
      setInternalSku(sku);
    }
  }, [onSkuChange]);

  const [testCount, setTestCount] = useState(0);

  const [testImage, setTestImage] = useState<string | null>(null);

  // Scan flow state
  const [scanState, setScanState] = useState<TestLabState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<import("../state/appState").AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [showMockApiPanel, setShowMockApiPanel] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const hasSeenOnboarding = localStorage.getItem('afia_admin_onboarding_seen');
    return !hasSeenOnboarding && isAdmin;
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setTestImage(event.target?.result as string);
      setScanState("scanning");
    };
    reader.readAsDataURL(file);
  };
  // Test session tracking
  const [sessionId] = useState<string>(() => `test_session_${crypto.randomUUID()}`);

  // F5 fix: session start fires once on mount only — not on every showOnboarding toggle
  useEffect(() => {
    analytics.testSessionStart('test-lab', 'flow');
  }, []);

  // Track onboarding start separately (fires when onboarding is shown)
  useEffect(() => {
    if (showOnboarding) {
      analytics.adminOnboardingStarted(sessionId);
    }
  }, [showOnboarding, sessionId]);

  // F6 fix: sync overlay state with debug panel checkbox when scan is complete.
  // Opens on completion if checked; closes if user unchecks mid-session.
  // Manual overlay toggle (AC-6) still works — user can reopen after unchecking.
  useEffect(() => {
    if (scanState === "complete") {
      const timeoutId = setTimeout(() => setShowAdminTools(showDebugPanel), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [scanState, showDebugPanel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close admin tools
      if (e.key === 'Escape') {
        setShowAdminTools(false);
      }

      // Ctrl+Enter: Trigger scan (if bottle selected)
      if (e.ctrlKey && e.key === 'Enter' && selectedSku && scanState === 'idle') {
        setScanState('scanning');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSku, scanState]);

  // Get selected bottle
  const selectedBottle = useMemo(() =>
    selectedSku ? getBottleBySku(selectedSku) : null
  , [selectedSku]);

  const getLocalizedBottleName = useCallback((sku: string, defaultName: string) => {
    const key = `bottles.${sku}`;
    const localized = t(key);
    return localized === key ? defaultName : localized;
  }, [t]);

  const getOilEmoji = (oilType: string) => {
    const map: Record<string, string> = {
      corn: "🌽",
      sunflower: "🌻",
      olive: "🫒",
      canola: "🌿",
    };
    return map[oilType] ?? "🫙";
  };

  // Handle mock QR scan
  const handleMockQrScan = useCallback((sku: string) => {
    const bottle = getBottleBySku(sku);
    setScanState("scanning");

    // Track analytics
    analytics.testEntryPointSelected('mock-qr', sku);
    info(`${t('admin.testLab.scanMockQr')}: ${bottle ? getLocalizedBottleName(sku, bottle.name) : ""}`);
  }, [info, t, getLocalizedBottleName]);

  // Handle error
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setScanState("error");
    showError(errorMessage);
  }, [showError]);

  // Handle mock API scenario selection
  const handleMockScenario = useCallback(async (scenario: MockScenario) => {
    setShowMockApiPanel(false);
    setScanState("analyzing");
    setError(null);

    const bottle = selectedBottle;
    if (!bottle) {
      handleError("No bottle selected");
      return;
    }

    // F2: Create AbortController for cleanup
    const abortController = new AbortController();

    try {
      // F7: Generate realistic test image instead of 1x1 placeholder
      // Create a canvas with bottle-like shape for geometry testing
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw a simple bottle shape for testing
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(250, 100, 140, 300);
        ctx.fillRect(270, 80, 100, 30);
      }
      const mockImageBase64 = canvas.toDataURL('image/png');
      setCapturedImage(mockImageBase64);

      // Simulate API call with realistic delay and abort support
      const mockResult = await mockAnalyzeBottle(scenario, bottle.totalVolumeMl, abortController.signal);
      
      setResult(mockResult);
      setScanState("complete");
      // F15: Indicate this is a mock result
      success(t('admin.testLab.mockScenarioComplete', {
        defaultValue: 'Mock scenario complete: {{name}}',
        name: scenario.name
      }));
      
      // Track analytics
      analytics.testEntryPointSelected('mock-api', selectedSku);
    } catch (err) {
      // F2: Handle abort gracefully
      if (err instanceof Error && err.message.includes('aborted')) {
        info(t('admin.testLab.mockScenarioCancelled', 'Mock scenario cancelled'));
        setScanState("idle");
      } else {
        handleError(err instanceof Error ? err.message : "Mock analysis failed");
      }
    }

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [selectedBottle, selectedSku, success, handleError, info, t]);

  // Handle capture complete
  const handleCapture = useCallback((imageBase64: string) => {
    setCapturedImage(imageBase64);
    // Analysis happens automatically in parent flow
  }, []);

  // Handle retry
  const handleRetry = useCallback(() => {
    setScanState("scanning");
    setError(null);
    info(t('admin.testLab.retrying'));
  }, [info, t]);

  // Handle retake
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setResult(null);
    setScanState("scanning");
    setShowAdminTools(false);
    info(t('admin.testLab.readyNewScan'));
  }, [info, t]);

  // Handle new test
  const handleNewTest = useCallback(() => {
    setScanState("idle");
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setShowAdminTools(false);
    setTestCount(prev => prev + 1);
    success(t('admin.testLab.readyNewTest'));
  }, [success, t]);

  // Handle validation save — persists to local history and posts to worker
  const handleValidationSave = useCallback(async (validation: unknown) => {
    const val = validation as { accuracyRating: "accurate" | "too_high" | "too_low"; notes?: string; correctedFillPercentage?: number };

    // Map admin overlay rating to worker's expected enum
    const ratingMap: Record<string, "about_right" | "too_high" | "too_low"> = {
      accurate: "about_right",
      too_high: "too_high",
      too_low: "too_low",
    };
    const workerRating = ratingMap[val.accuracyRating] ?? "about_right";

    // 1. Persist to local scan history
    if (result?.scanId) {
      updateFeedback(result.scanId, workerRating);
    }

    // 2. Post to worker feedback endpoint (non-blocking)
    // H3 FIX: Show error toast to user if feedback submission fails
    if (result?.scanId && WORKER_URL) {
      fetch(`${WORKER_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId: result.scanId,
          accuracyRating: workerRating,
          responseTimeMs: result.latencyMs ?? 0,
          llmFillPercentage: result.fillPercentage,
          correctedFillPercentage: val.correctedFillPercentage,
        }),
      }).catch((err) => {
        console.error("Feedback POST failed:", err);
        showError(t('admin.testLab.feedbackFailed'));
      });
    }

    success(t('admin.testLab.validationSaved'));

    analytics.testValidationSaved(
      result?.scanId ?? 'unknown',
      val.accuracyRating,
      !!val.notes
    );
  }, [result, updateFeedback, success, t]);

  // Render onboarding
  if (showOnboarding) {
    return (
      <AdminOnboarding
        onComplete={() => {
          setShowOnboarding(false);
          localStorage.setItem('afia_admin_onboarding_seen', 'true');
        }}
        onSkip={() => {
          setShowOnboarding(false);
          localStorage.setItem('afia_admin_onboarding_seen', 'true');
        }}
      />
    );
  }

  // Render based on scan state
  return (
    <div className="test-lab" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="test-lab-header">
        <div className="test-lab-title-section">
          <Beaker size={28} strokeWidth={2} className="test-lab-icon" />
          <div>
            <div className="test-lab-header-row">
              <h1 className="test-lab-title">{t('admin.testLab.title')}</h1>
              {testCount > 0 && (
                <div className="test-count-badge">
                  <TestTube size={14} strokeWidth={2} className="test-count-icon" />
                  {t('admin.testLab.sessionTests', { count: testCount })}
                </div>
              )}
            </div>
            <p className="test-lab-subtitle">
              {t('admin.testLab.subtitle')}
            </p>
            {/* Open as Real User — persistent in header, always visible */}
            <a
              href={`/?sku=${ACTIVE_SKU}`}
              target="_blank"
              rel="noopener noreferrer"
              className="open-user-view-link"
            >
              <ExternalLink size={14} strokeWidth={2} />
              {t('admin.testLab.openUserView')}
            </a>
          </div>
        </div>
      </div>

      {/* Tab Navigation — F11 fix: proper ARIA tab semantics */}
      <div className="test-lab-tabs" role="tablist">
        <button
          className={`test-lab-tab ${activeTab === "flow" ? "active" : ""}`}
          onClick={() => { setActiveTab("flow"); setShowAdminTools(false); }}
          type="button"
          role="tab"
          aria-selected={activeTab === "flow"}
        >
          <Smartphone size={16} strokeWidth={2} />
          {t('admin.testLab.tabFlow')}
        </button>
        <button
          className={`test-lab-tab ${activeTab === "inspector" ? "active" : ""}`}
          onClick={() => setActiveTab("inspector")}
          type="button"
          role="tab"
          aria-selected={activeTab === "inspector"}
        >
          <Beaker size={16} strokeWidth={2} />
          {t('admin.testLab.tabInspector')}
        </button>
        <button
          className={`test-lab-tab ${activeTab === "visuals" ? "active" : ""}`}
          onClick={() => setActiveTab("visuals")}
          type="button"
          role="tab"
          aria-selected={activeTab === "visuals"}
        >
          <TestTube size={16} strokeWidth={2} />
          Visuals
        </button>
      </div>

      {/* Flow Test Tab */}
      {activeTab === "flow" && (
        <>
          {/* Debug Panel Toggle */}
          <div className="test-lab-debug-toggle">
            <label className="test-lab-debug-toggle-label">
              <input
                type="checkbox"
                checked={showDebugPanel}
                onChange={(e) => setShowDebugPanel(e.target.checked)}
              />
              {t('admin.testLab.showDebugPanel')}
            </label>
          </div>

          {/* Entry Point — single SKU, no dropdown needed */}
          {scanState === "idle" && (
            <div className="test-lab-section test-lab-section--bottle" style={{ textAlign: 'center' }}>
              <h2 className="test-lab-section-title">{t('admin.testLab.selectBottleScanQr')}</h2>

              {/* Confirmed bottle card — allow switching if multiple active */}
              {activeBottleRegistry.length > 1 ? (
                <div className="test-lab-sku-selector" style={{ marginBottom: 'var(--space-md)', display: 'flex', justifyContent: 'center' }}>
                  <select 
                    value={selectedSku} 
                    onChange={(e) => setSelectedSku(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '320px', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                  >
                    {activeBottleRegistry.map(b => (
                      <option key={b.sku} value={b.sku}>{getLocalizedBottleName(b.sku, b.name)}</option>
                    ))}
                  </select>
                </div>
              ) : selectedBottle && (
                <div className="bottle-confirmed-card">
                  <span className="bottle-confirmed-emoji">{getOilEmoji(selectedBottle.oilType)}</span>
                  <span className="bottle-confirmed-name">{getLocalizedBottleName(selectedSku, selectedBottle.name)}</span>
                  <span className="bottle-confirmed-badge">✓</span>
                </div>
              )}

              {/* Scan button — always enabled (bottle is pre-selected) */}
              <div className="entry-point-buttons" style={{ marginTop: 'var(--space-md)', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <button
                  className="entry-point-button entry-point-button--primary"
                  onClick={() => handleMockQrScan(selectedSku)}
                  type="button"
                  style={{ width: '100%', maxWidth: '320px' }}
                >
                  <QrCode size={22} strokeWidth={2} />
                  <span>{t('admin.testLab.scanMockQr')}</span>
                </button>

                <button
                  className="entry-point-button entry-point-button--secondary"
                  onClick={() => setShowMockApiPanel(true)}
                  type="button"
                  style={{ width: '100%', maxWidth: '320px' }}
                >
                  <Zap size={22} strokeWidth={2} />
                  <span>Mock API Test</span>
                </button>

                <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
                  <button
                    className="entry-point-button entry-point-button--secondary"
                    type="button"
                    onClick={() => document.getElementById('geometry-upload')?.click()}
                    style={{ width: '100%' }}
                  >
                    <TestTube size={22} strokeWidth={2} />
                    <span>Upload Image for Geometry Test</span>
                  </button>
                  <input
                    id="geometry-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Scan Flow */}
          {scanState === "scanning" && selectedBottle && (
            <div className="test-lab-section">
              <h2 className="test-lab-section-title">{testImage ? 'GEOMETRY OVERLAY TEST' : t('admin.testLab.capturePhoto')}</h2>
              <CameraViewfinder
                onCapture={handleCapture}
                onError={handleError}
                onPermissionDenied={() => handleError(t('camera.permissionDenied'))}
                testImage={testImage}
                sku={selectedSku}
                onCancel={() => { setTestImage(null); setScanState("idle"); }}
              />
            </div>
          )}

          {/* Analyzing State */}
          {scanState === "analyzing" && (
            <div className="test-lab-section">
              <div className="analyzing-state">
                <div className="analyzing-spinner" />
                <p className="analyzing-text">{t('admin.testLab.analyzing')}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {scanState === "complete" && result && selectedBottle && (
            <div className="test-lab-section">
              <ResultDisplay
                result={result}
                bottle={selectedBottle}
                capturedImage={capturedImage || undefined}
                onRetake={handleRetake}
              />

              {/* Admin Tools Overlay */}
              {isAdmin && (
                <AdminToolsOverlay
                  result={result}
                  isOpen={showAdminTools}
                  onOpen={() => setShowAdminTools(true)}
                  onClose={() => setShowAdminTools(false)}
                  onSaveValidation={handleValidationSave}
                />
              )}

              {/* Action Buttons */}
              <div className="test-lab-result-actions">
                <button
                  className="test-lab-back-button"
                  onClick={handleNewTest}
                  type="button"
                >
                  <RefreshCcw size={20} strokeWidth={2} />
                  <span>{t('admin.testLab.backToTestLab')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {scanState === "error" && error && (
            <div className="test-lab-section">
              <div className="test-lab-error-card" role="alert">
              {/* Icon badge */}
              <div className="test-lab-error-icon-wrap" aria-hidden="true">
                <AlertTriangle size={28} strokeWidth={2} className="test-lab-error-icon" />
              </div>

              {/* Message */}
              <div className="test-lab-error-body">
                <h4 className="test-lab-error-title">{t('admin.testLab.errorTitle')}</h4>
                <p className="test-lab-error-msg">{error}</p>
              </div>

              <div className="test-lab-error-actions">
                <button
                  className="error-retry-button"
                  onClick={handleRetry}
                  type="button"
                >
                  <RefreshCcw size={16} strokeWidth={2} />
                  <span>{t('common.retry')}</span>
                </button>
                <button
                  className="test-lab-back-button"
                  onClick={handleNewTest}
                  type="button"
                >
                  <span>{t('admin.testLab.backToTestLab')}</span>
                </button>
              </div>
            </div>
            </div>
          )}
        </>
      )}

      {/* API Inspector Tab */}
      {activeTab === "inspector" && <ApiInspector selectedSku={selectedSku} />}

      {/* Visual Regression Tab */}
      {activeTab === "visuals" && <VisualRegressionHarness />}

      {/* Mock API Panel */}
      {showMockApiPanel && (
        <MockApiPanel
          onSelectScenario={handleMockScenario}
          onClose={() => setShowMockApiPanel(false)}
        />
      )}
    </div>
  );
}
