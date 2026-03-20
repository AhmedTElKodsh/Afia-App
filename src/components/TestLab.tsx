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
import { Beaker, QrCode, ChevronDown, Search, Smartphone, Wrench, Target, RefreshCcw, AlertTriangle, TestTube } from "lucide-react";
import { bottleRegistry, getBottleBySku } from "../data/bottleRegistry.ts";
import { CameraViewfinder } from "./CameraViewfinder.tsx";
import { ResultDisplay } from "./ResultDisplay.tsx";
import { AdminToolsOverlay } from "./AdminToolsOverlay.tsx";
import { AdminOnboarding } from "./AdminOnboarding.tsx";
import { useToast } from "./Toast.tsx";
import { analytics } from "../utils/analytics.ts";
import "./TestLab.css";

export type TestModeType = "user" | "debug";
export type EntryPointType = "mock-qr" | "bottle-select" | "manual-sku";
export type TestLabState = "idle" | "scanning" | "analyzing" | "complete" | "error";

export interface TestLabProps {
  /** Admin mode flag */
  isAdmin: boolean;
}

export function TestLab({ isAdmin }: TestLabProps) {
  // Toast notifications
  const { success, error: showError, info } = useToast();

  // Test configuration
  const [testMode, setTestMode] = useState<TestModeType>("user");
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [testCount, setTestCount] = useState(0);

  // Scan flow state
  const [scanState, setScanState] = useState<TestLabState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<import("../state/appState").AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_entryPoint, setEntryPoint] = useState<EntryPointType | null>(null);
  const [_scanStartTime, setScanStartTime] = useState<number | null>(null);
  
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

  // Initialize session on mount
  useEffect(() => {
    // Track session start
    analytics.testSessionStart('test-lab', testMode);
    
    // Track onboarding if shown
    if (showOnboarding) {
      analytics.adminOnboardingStarted(sessionId);
    }
  }, [testMode, showOnboarding, sessionId]);

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

  // Handle bottle selection from dropdown (only selects, doesn't start scan)
  const handleBottleSelect = useCallback((sku: string) => {
    const bottle = getBottleBySku(sku);
    setSelectedSku(sku);
    setEntryPoint("bottle-select");
    setShowBottleDropdown(false);
    // Do NOT auto-start scan — user must click Scan Mock QR

    // Track analytics
    analytics.bottleSelected(sku, 'bottle-select');
    info(`Selected: ${bottle?.name}`);
  }, [info]);

  // Handle mock QR scan
  const handleMockQrScan = useCallback((sku: string) => {
    const bottle = getBottleBySku(sku);
    setSelectedSku(sku);
    setEntryPoint("mock-qr");
    setScanState("scanning");
    setScanStartTime(Date.now());

    // Track analytics
    analytics.testEntryPointSelected('mock-qr', sku);
    info(`Mock QR: ${bottle?.name}`);
  }, [info]);

  // Handle capture complete
  const handleCapture = useCallback((imageBase64: string) => {
    setCapturedImage(imageBase64);
    setScanStartTime(Date.now());
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
    setScanStartTime(Date.now());
    info('Retrying scan...');
  }, [info]);

  // Handle retake
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setResult(null);
    setScanState("scanning");
    setShowAdminTools(false);
    setScanStartTime(Date.now());
    info('Ready for new scan');
  }, [info]);

  // Handle new test
  const handleNewTest = useCallback(() => {
    setScanState("idle");
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setShowAdminTools(false);
    setEntryPoint(null);
    setTestCount(prev => prev + 1);
    success('Ready for new test');
  }, [success]);

  // Handle validation save
  const handleValidationSave = useCallback((validation: unknown) => {
    const val = validation as { accuracyRating: string; notes?: string };
    console.log("Validation saved:", validation);
    success('Validation saved!');

    // Track analytics
    analytics.testValidationSaved(
      'test_result_' + Date.now(),
      val.accuracyRating,
      !!val.notes
    );

    // TODO: Send to API
  }, [success]);

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
    <div className="test-lab">
      {/* Header */}
      <div className="test-lab-header">
        <div className="test-lab-title-section">
          <Beaker size={28} strokeWidth={2} className="test-lab-icon" />
          <div>
            <div className="test-lab-header-row">
              <h1 className="test-lab-title">TEST LAB</h1>
              {testCount > 0 && (
                <div className="test-count-badge">
                  <TestTube size={14} strokeWidth={2} className="test-count-icon" />
                  {testCount} Test{testCount !== 1 ? 's' : ''} This Session
                </div>
              )}
            </div>
            <p className="test-lab-subtitle">
              Test the exact user scanning experience + optional debug tools
            </p>
          </div>
        </div>
      </div>

      {/* Test Mode Selector */}
      <div className="test-lab-section">
        <h2 className="test-lab-section-title">SELECT TEST MODE</h2>
        <div className="test-mode-selector">
          <button
            className={`test-mode-card ${testMode === "user" ? "active" : ""}`}
            onClick={() => setTestMode("user")}
            type="button"
          >
            <div className="test-mode-icon"><Smartphone size={24} strokeWidth={2} /></div>
            <h3 className="test-mode-title">USER FLOW</h3>
            <p className="test-mode-description">Exact user simulation</p>
            <div className="test-mode-indicator">
              {testMode === "user" ? "●" : "○"} Selected
            </div>
          </button>
          
          <button
            className={`test-mode-card ${testMode === "debug" ? "active" : ""}`}
            onClick={() => setTestMode("debug")}
            type="button"
          >
            <div className="test-mode-icon"><Wrench size={24} strokeWidth={2} /></div>
            <h3 className="test-mode-title">DEBUG MODE</h3>
            <p className="test-mode-description">API inspector, validation</p>
            <div className="test-mode-indicator">
              {testMode === "debug" ? "●" : "○"}
            </div>
          </button>
        </div>
      </div>

      {/* Entry Point Selector */}
      {scanState === "idle" && (
        <div className="test-lab-section" style={{ textAlign: 'center' }}>
          <h2 className="test-lab-section-title">SELECT BOTTLE / SCAN QR</h2>
          
          {/* Bottle Selector Dropdown */}
          <div className="bottle-selector-container">
            <button
              className="bottle-selector-button"
              onClick={() => setShowBottleDropdown(!showBottleDropdown)}
              type="button"
            >
              <span className="bottle-selector-icon"><Target size={20} strokeWidth={2} /></span>
              <span className="bottle-selector-text">
                {selectedBottle ? selectedBottle.name : "Select Bottle..."}
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
                    placeholder="Search bottles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="bottle-selector-list">
                  {bottleRegistry
                    .filter(bottle =>
                      searchQuery === '' ||
                      bottle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      bottle.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      bottle.oilType.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((bottle) => (
                      <button
                        key={bottle.sku}
                        className={`bottle-selector-item ${selectedSku === bottle.sku ? "selected" : ""}`}
                        onClick={() => handleBottleSelect(bottle.sku)}
                        type="button"
                      >
                        <span className="bottle-item-icon">🌻</span> {bottle.name}
                        {selectedSku === bottle.sku && (
                          <span className="bottle-selector-check">✓</span>
                        )}
                      </button>
                    ))}
                  {searchQuery && bottleRegistry.filter(b =>
                    b.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="bottle-selector-no-results">
                      No bottles found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Selected Bottle Display */}
          {selectedBottle && scanState === "idle" && (
            <div className="selected-bottle-display">
              <span>🌻 {selectedBottle.name}</span>
              <button
                className="clear-bottle-button"
                onClick={() => {
                  setSelectedSku("");
                  setEntryPoint(null);
                }}
                type="button"
              >
                ✕ Clear
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
              title={selectedSku ? 'Start scan with selected bottle' : 'Please select a bottle first'}
            >
              <QrCode size={22} strokeWidth={2} />
              <span>Scan Mock QR</span>
            </button>
            {!selectedSku && (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                ↑ Select a bottle to activate
              </p>
            )}
          </div>
        </div>
      )}

      {/* Scan Flow */}
      {scanState === "scanning" && selectedBottle && (
        <div className="test-lab-section">
          <h2 className="test-lab-section-title">CAPTURE PHOTO</h2>
          <CameraViewfinder
            onCapture={handleCapture}
            onError={handleError}
            onPermissionDenied={() => handleError("Camera permission denied")}
          />
        </div>
      )}

      {/* Analyzing State */}
      {scanState === "analyzing" && (
        <div className="test-lab-section">
          <div className="analyzing-state">
            <div className="analyzing-spinner" />
            <p className="analyzing-text">Analyzing with AI...</p>
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
              <span>Back to Test Lab</span>
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
            <h4 className="test-lab-error-title">Something went wrong</h4>
            <p className="test-lab-error-msg">{error}</p>
          </div>

          <div className="test-lab-error-actions">
            <button
              className="error-retry-button"
              onClick={handleRetry}
              type="button"
            >
              <RefreshCcw size={16} strokeWidth={2} />
              <span>Retry</span>
            </button>
            <button
              className="test-lab-back-button"
              onClick={handleNewTest}
              type="button"
            >
              <span>← Back to Test Lab</span>
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
