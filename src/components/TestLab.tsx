/**
 * TestLab Component
 * Unified admin testing interface that simulates the exact user scanning workflow.
 * Decomposed into sub-components for better maintainability.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCcw } from "lucide-react";
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
import type { AnalysisResult } from "../state/appState.ts";

import { TestLabHeader } from "./TestLab/TestLabHeader.tsx";
import { TestLabTabs, type TestLabTab } from "./TestLab/TestLabTabs.tsx";
import { TestFlowIdle } from "./TestLab/TestFlowIdle.tsx";
import { TestLabError } from "./TestLab/TestLabError.tsx";

import "./TestLab.css";

const WORKER_URL = import.meta.env.VITE_PROXY_URL || "";

export type TestLabState = "idle" | "scanning" | "analyzing" | "complete" | "error";

export interface TestLabProps {
  isAdmin: boolean;
  selectedSku?: string;
  onSkuChange?: (sku: string) => void;
}

export function TestLab({ isAdmin, selectedSku: propsSku, onSkuChange }: TestLabProps) {
  const { t, i18n } = useTranslation();
  const { success, error: showError, info } = useToast();
  const { updateFeedback } = useScanHistory();
  const isRTL = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<TestLabTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    return (tabParam === "flow" || tabParam === "inspector" || tabParam === "visuals") ? tabParam as TestLabTab : "flow";
  });

  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [internalSku, setInternalSku] = useState<string>(ACTIVE_SKU);
  const selectedSku = propsSku !== undefined ? propsSku : internalSku;

  const setSelectedSku = useCallback((sku: string) => {
    if (onSkuChange) onSkuChange(sku);
    else setInternalSku(sku);
  }, [onSkuChange]);

  const [testCount, setTestCount] = useState(0);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [scanState, setScanState] = useState<TestLabState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [showMockApiPanel, setShowMockApiPanel] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('afia_admin_onboarding_seen') && isAdmin);
  const [sessionId] = useState<string>(() => `test_session_${crypto.randomUUID()}`);

  useEffect(() => { analytics.testSessionStart('test-lab', 'flow'); }, []);
  useEffect(() => { if (showOnboarding) analytics.adminOnboardingStarted(sessionId); }, [showOnboarding, sessionId]);
  useEffect(() => { if (scanState === "complete") { const tid = setTimeout(() => setShowAdminTools(showDebugPanel), 0); return () => clearTimeout(tid); } }, [scanState, showDebugPanel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAdminTools(false);
      if (e.ctrlKey && e.key === 'Enter' && selectedSku && scanState === 'idle') setScanState('scanning');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSku, scanState]);

  const selectedBottle = useMemo(
    () => (selectedSku ? getBottleBySku(selectedSku) ?? null : null),
    [selectedSku]
  );
  const getLocalizedBottleName = useCallback((sku: string, defaultName: string) => {
    const key = `bottles.${sku}`, localized = t(key);
    return localized === key ? defaultName : localized;
  }, [t]);

  const handleMockQrScan = useCallback((sku: string) => {
    const bottle = getBottleBySku(sku);
    setScanState("scanning");
    analytics.testEntryPointSelected('mock-qr', sku);
    info(`${t('admin.testLab.scanMockQr')}: ${bottle ? getLocalizedBottleName(sku, bottle.name) : ""}`);
  }, [info, t, getLocalizedBottleName]);

  const handleError = useCallback((msg: string) => { setError(msg); setScanState("error"); showError(msg); }, [showError]);

  const handleMockScenario = useCallback(async (scenario: MockScenario) => {
    setShowMockApiPanel(false); setScanState("analyzing"); setError(null);
    const bottle = selectedBottle;
    if (!bottle) { handleError(t('admin.testLab.noBottleSelected')); return; }
    const abortController = new AbortController();
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, 640, 480); ctx.fillStyle = '#4a90e2'; ctx.fillRect(250, 100, 140, 300); ctx.fillRect(270, 80, 100, 30); }
      setCapturedImage(canvas.toDataURL('image/png'));
      const mockResult = await mockAnalyzeBottle(scenario, bottle.totalVolumeMl, abortController.signal);
      setResult(mockResult as AnalysisResult); setScanState("complete");
      success(t('admin.testLab.mockScenarioComplete', { name: t(scenario.nameKey) }));
      analytics.testEntryPointSelected('mock-api', selectedSku);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('aborted')) info(t('admin.testLab.mockScenarioCancelled'));
      else handleError(message || "Mock analysis failed");
    }
    return () => abortController.abort();
  }, [selectedBottle, selectedSku, success, handleError, info, t]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (event) => { setTestImage(event.target?.result as string); setScanState("scanning"); };
    reader.readAsDataURL(file);
  };

  const handleValidationSave = useCallback(async (validation: unknown) => {
    const ratingMap: Record<string, "about_right" | "too_high" | "too_low"> = {
      accurate: "about_right",
      too_high: "too_high",
      too_low: "too_low",
    };
    const accuracyRating =
      validation && typeof validation === "object" && "accuracyRating" in validation
        ? String((validation as { accuracyRating?: unknown }).accuracyRating)
        : "accurate";
    const workerRating = ratingMap[accuracyRating] ?? "about_right";

    if (result?.scanId) updateFeedback(result.scanId, workerRating);
    if (result?.scanId && WORKER_URL) {
      fetch(`${WORKER_URL}/feedback`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId: result.scanId,
          accuracyRating: workerRating,
          responseTimeMs: result.latencyMs ?? 0,
          llmFillPercentage: result.fillPercentage,
          correctedFillPercentage:
            validation && typeof validation === "object" && "correctedFillPercentage" in validation
              ? (validation as { correctedFillPercentage?: unknown }).correctedFillPercentage
              : undefined,
        }),
      }).catch(err => { console.error("Feedback failed:", err); showError(t('admin.testLab.feedbackFailed')); });
    }
    success(t('admin.testLab.validationSaved'));
    const notes =
      validation && typeof validation === "object" && "notes" in validation
        ? (validation as { notes?: unknown }).notes
        : undefined;
    analytics.testValidationSaved(result?.scanId ?? 'unknown', accuracyRating, !!notes);
  }, [result, updateFeedback, success, t, showError]);

  if (showOnboarding) return <AdminOnboarding onComplete={() => { setShowOnboarding(false); localStorage.setItem('afia_admin_onboarding_seen', 'true'); }} onSkip={() => { setShowOnboarding(false); localStorage.setItem('afia_admin_onboarding_seen', 'true'); }} />;

  return (
    <div className="test-lab" dir={isRTL ? 'rtl' : 'ltr'}>
      <TestLabHeader testCount={testCount} />
      <TestLabTabs activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setShowAdminTools(false); }} />

      {activeTab === "flow" && (
        <>
          <div className="test-lab-debug-toggle">
            <label className="test-lab-debug-toggle-label">
              <input type="checkbox" checked={showDebugPanel} onChange={(e) => setShowDebugPanel(e.target.checked)} />
              {t('admin.testLab.showDebugPanel')}
            </label>
          </div>

          {scanState === "idle" && (
            <TestFlowIdle
              activeBottleRegistry={activeBottleRegistry}
              selectedSku={selectedSku}
              selectedBottle={selectedBottle}
              onSkuChange={setSelectedSku}
              onMockQrScan={handleMockQrScan}
              onShowMockApi={() => setShowMockApiPanel(true)}
              onImageUpload={handleImageUpload}
              getLocalizedBottleName={getLocalizedBottleName}
            />
          )}

          {scanState === "scanning" && selectedBottle && (
            <div className="test-lab-section">
              <h2 className="test-lab-section-title">{testImage ? t('admin.testLab.geometryOverlay', 'GEOMETRY OVERLAY TEST') : t('admin.testLab.capturePhoto')}</h2>
              <CameraViewfinder onCapture={setCapturedImage} onError={handleError} onPermissionDenied={() => handleError(t('camera.permissionDenied'))} testImage={testImage} sku={selectedSku} onCancel={() => { setTestImage(null); setScanState("idle"); }} />
            </div>
          )}

          {scanState === "analyzing" && (
            <div className="test-lab-section">
              <div className="analyzing-state"><div className="analyzing-spinner" /><p className="analyzing-text">{t('admin.testLab.analyzing')}</p></div>
            </div>
          )}

          {scanState === "complete" && result && selectedBottle && (
            <div className="test-lab-section">
              <ResultDisplay result={result} bottle={selectedBottle} capturedImage={capturedImage || undefined} onRetake={() => { setCapturedImage(null); setResult(null); setScanState("scanning"); setShowAdminTools(false); info(t('admin.testLab.readyNewScan')); }} />
              {isAdmin && <AdminToolsOverlay result={result} isOpen={showAdminTools} onOpen={() => setShowAdminTools(true)} onClose={() => setShowAdminTools(false)} onSaveValidation={handleValidationSave} />}
              <div className="test-lab-result-actions">
                <button className="test-lab-back-button" onClick={() => { setScanState("idle"); setCapturedImage(null); setResult(null); setError(null); setShowAdminTools(false); setTestCount(prev => prev + 1); success(t('admin.testLab.readyNewTest')); }} type="button">
                  <RefreshCcw size={20} strokeWidth={2} /><span className="nav-label">{t('admin.testLab.backToTestLab')}</span>
                </button>
              </div>
            </div>
          )}

          {scanState === "error" && error && (
            <TestLabError error={error} onRetry={() => { setScanState("scanning"); setError(null); info(t('admin.testLab.retrying')); }} onBackToIdle={() => { setScanState("idle"); setCapturedImage(null); setResult(null); setError(null); setShowAdminTools(false); setTestCount(prev => prev + 1); success(t('admin.testLab.readyNewTest')); }} />
          )}
        </>
      )}

      {activeTab === "inspector" && <ApiInspector selectedSku={selectedSku} />}
      {activeTab === "visuals" && <VisualRegressionHarness />}
      {showMockApiPanel && <MockApiPanel onSelectScenario={handleMockScenario} onClose={() => setShowMockApiPanel(false)} />}
    </div>
  );
}
