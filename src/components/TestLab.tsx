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
import { Beaker, QrCode, ChevronDown, Search, Smartphone, Wrench, Target, RefreshCcw, AlertTriangle, TestTube } from "lucide-react";
import { activeBottleRegistry, getBottleBySku } from "../data/bottleRegistry.ts";
import { CameraViewfinder } from "./CameraViewfinder.tsx";
import { ResultDisplay } from "./ResultDisplay.tsx";
import { AdminToolsOverlay } from "./AdminToolsOverlay.tsx";
import { AdminOnboarding } from "./AdminOnboarding.tsx";
import { useToast } from "./Toast.tsx";
import { analytics } from "../utils/analytics.ts";
import { useScanHistory } from "../hooks/useScanHistory.ts";
import "./TestLab.css";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "";

export type TestModeType = "user" | "debug";
export type EntryPointType = "mock-qr" | "bottle-select" | "manual-sku";
export type TestLabState = "idle" | "scanning" | "analyzing" | "complete" | "error";

export interface TestLabProps {
  /** Admin mode flag */
  isAdmin: boolean;
}

export function TestLab({ isAdmin }: TestLabProps) {
  const { t, i18n } = useTranslation();
  const { success, error: showError, info } = useToast();
  const { updateFeedback } = useScanHistory();

  const isRTL = i18n.language === 'ar';

  // Test configuration
  const [testMode, setTestMode] = useState<TestModeType>("user");
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [testCount, setTestCount] = useState(0);

  // Scan flow state
  const [scanState, setScanState] = useState<TestLabState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<import("../state/appState").AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [showBottleDropdown, setShowBottleDropdown] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const hasSeenOnboarding = localStorage.getItem('afia_admin_onboarding_seen');
    return !hasSeenOnboarding && isAdmin;
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Test session tracking
  const [sessionId] = useState<string>(() => `test_session_${crypto.randomUUID()}`);

  // Reset admin tools when switching modes
  const handleModeChange = useCallback((mode: TestModeType) => {
    analytics.testModeChanged(testMode, mode);
    setTestMode(mode);
    setShowAdminTools(false);
  }, [testMode]);

  // Initialize session on mount
  useEffect(() => {
    // Track session start
    analytics.testSessionStart('test-lab', testMode);

    // Track onboarding if shown
    if (showOnboarding) {
      analytics.adminOnboardingStarted(sessionId);
    }
  }, [testMode, showOnboarding, sessionId]);

  // In DEBUG MODE, auto-open admin tools when scan completes
  useEffect(() => {
    if (scanState === "complete" && testMode === "debug") {
      setShowAdminTools(true);
    }
  }, [scanState, testMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close dropdown or admin tools
      if (e.key === 'Escape') {
        setShowBottleDropdown(false);
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

  const getLocalizedBottleName = (sku: string, defaultName: string) => {
    const key = `bottles.${sku}`;
    const localized = t(key);
    return localized === key ? defaultName : localized;
  };

  const getOilEmoji = (oilType: string) => {
    const map: Record<string, string> = {
      corn: "🌽",
      sunflower: "🌻",
      olive: "🫒",
      canola: "🌿",
    };
    return map[oilType] ?? "🫙";
  };

  // Handle bottle selection from dropdown (only selects, doesn't start scan)
  const handleBottleSelect = useCallback((sku: string) => {
    const bottle = getBottleBySku(sku);
    setSelectedSku(sku);
    setShowBottleDropdown(false);
    // Do NOT auto-start scan — user must click Scan Mock QR

    // Track analytics
    analytics.bottleSelected(sku, 'bottle-select');
    info(`${t('admin.testLab.readyNewScan')}: ${bottle ? getLocalizedBottleName(sku, bottle.name) : ""}`);
  }, [info, t]);

  // Handle mock QR scan
  const handleMockQrScan = useCallback((sku: string) => {
    const bottle = getBottleBySku(sku);
    setSelectedSku(sku);
    setScanState("scanning");

    // Track analytics
    analytics.testEntryPointSelected('mock-qr', sku);
    info(`${t('admin.testLab.scanMockQr')}: ${bottle ? getLocalizedBottleName(sku, bottle.name) : ""}`);
  }, [info, t]);

  // Handle capture complete
  const handleCapture = useCallback((imageBase64: string) => {
    setCapturedImage(imageBase64);
    // Analysis happens automatically in parent flow
  }, []);

  // Handle error
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setScanState("error");
    showError(errorMessage);
  }, [showError]);

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
      }).catch((err) => console.error("Feedback POST failed:", err));
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
          </div>
        </div>
      </div>

      {/* Test Mode Selector */}
      <div className="test-lab-section test-lab-section--mode">
        <h2 className="test-lab-section-title">{t('admin.testLab.selectMode')}</h2>
        <div className="test-mode-selector">
          <button
            className={`test-mode-card ${testMode === "user" ? "active" : ""}`}
            onClick={() => handleModeChange("user")}
            type="button"
          >
            <div className="test-mode-icon"><Smartphone size={24} strokeWidth={2} /></div>
            <h3 className="test-mode-title">{t('admin.testLab.userFlow')}</h3>
            <p className="test-mode-description">{t('admin.testLab.userFlowDesc')}</p>
            <div className="test-mode-indicator">
              {testMode === "user" ? `● ${t('admin.testLab.selected')}` : "○"}
            </div>
          </button>
          
          <button
            className={`test-mode-card ${testMode === "debug" ? "active" : ""}`}
            onClick={() => handleModeChange("debug")}
            type="button"
          >
            <div className="test-mode-icon"><Wrench size={24} strokeWidth={2} /></div>
            <h3 className="test-mode-title">{t('admin.testLab.debugMode')}</h3>
            <p className="test-mode-description">{t('admin.testLab.debugModeDesc')}</p>
            <div className="test-mode-indicator">
              {testMode === "debug" ? `● ${t('admin.testLab.selected')}` : "○"}
            </div>
          </button>
        </div>
      </div>

      {/* Entry Point Selector */}
      {scanState === "idle" && (
        <div className="test-lab-section test-lab-section--bottle" style={{ textAlign: 'center' }}>
          <h2 className="test-lab-section-title">{t('admin.testLab.selectBottleScanQr')}</h2>
          {testMode === "debug" && (
            <p className="test-lab-debug-hint">
              <Wrench size={13} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {t('admin.testLab.debugHint')}
            </p>
          )}
          
          {/* Bottle Selector Dropdown */}
          <div className="bottle-selector-container">
            <button
              className="bottle-selector-button"
              onClick={() => setShowBottleDropdown(!showBottleDropdown)}
              type="button"
            >
              <span className="bottle-selector-icon"><Target size={20} strokeWidth={2} /></span>
              <span className="bottle-selector-text">
                {selectedBottle ? getLocalizedBottleName(selectedSku, selectedBottle.name) : t('admin.testLab.selectBottlePlaceholder')}
              </span>
              <ChevronDown 
                size={20} 
                className={`bottle-selector-chevron ${showBottleDropdown ? "rotated" : ""}`} 
              />
            </button>

            {showBottleDropdown && (
              <div className="bottle-selector-dropdown">
                <div className="bottle-selector-search">
                  <Search size={16} strokeWidth={2} />
                  <input
                    type="text"
                    className="bottle-selector-search-input"
                    placeholder={t('admin.testLab.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="bottle-selector-list">
                  {activeBottleRegistry
                    .filter(bottle =>
                      searchQuery === '' ||
                      bottle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      bottle.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      bottle.oilType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      getLocalizedBottleName(bottle.sku, bottle.name).toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((bottle) => (
                      <button
                        key={bottle.sku}
                        className={`bottle-selector-item ${selectedSku === bottle.sku ? "selected" : ""}`}
                        onClick={() => handleBottleSelect(bottle.sku)}
                        type="button"
                      >
                        <span className="bottle-item-icon">{getOilEmoji(bottle.oilType)}</span> {getLocalizedBottleName(bottle.sku, bottle.name)}
                        {selectedSku === bottle.sku && (
                          <span className="bottle-selector-check">✓</span>
                        )}
                      </button>
                    ))}
                  {searchQuery && activeBottleRegistry.filter(b =>
                    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    getLocalizedBottleName(b.sku, b.name).toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="bottle-selector-no-results">
                      {t('admin.testLab.noResults', { query: searchQuery })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Selected Bottle Display */}
          {selectedBottle && scanState === "idle" && (
            <div className="selected-bottle-display">
              <span>{getOilEmoji(selectedBottle.oilType)} {getLocalizedBottleName(selectedSku, selectedBottle.name)}</span>
              <button
                className="clear-bottle-button"
                onClick={() => {
                  setSelectedSku("");
                              }}
                type="button"
              >
                ✕ {t('admin.testLab.clear')}
              </button>
            </div>
          )}

          {/* Mock QR Button — full-width, primary, disabled until bottle is selected */}
          <div className="entry-point-buttons" style={{ marginTop: 'var(--space-md)', justifyContent: 'center' }}>
            <button
              className="entry-point-button entry-point-button--primary"
              onClick={() => {
                if (!selectedSku) return;
                handleMockQrScan(selectedSku);
              }}
              disabled={!selectedSku}
              type="button"
              style={{ width: '100%', maxWidth: '320px' }}
              title={selectedSku ? t('admin.testLab.startWithSelected') : t('admin.testLab.pleaseSelectFirst')}
            >
              <QrCode size={22} strokeWidth={2} />
              <span>{t('admin.testLab.scanMockQr')}</span>
            </button>
            {!selectedSku && (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                {t('admin.testLab.selectToActivate')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Scan Flow */}
      {scanState === "scanning" && selectedBottle && (
        <div className="test-lab-section">
          <h2 className="test-lab-section-title">{t('admin.testLab.capturePhoto')}</h2>
          <CameraViewfinder
            onCapture={handleCapture}
            onError={handleError}
            onPermissionDenied={() => handleError(t('camera.permissionDenied'))}
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
    </div>
  );
}
