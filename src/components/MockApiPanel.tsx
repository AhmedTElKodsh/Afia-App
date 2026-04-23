/**
 * Mock API Panel Component
 * 
 * Allows selecting and triggering mock analysis scenarios
 * for testing the Result UI without real API calls.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Beaker, X, Zap } from "lucide-react";
import { MOCK_SCENARIOS, type MockScenario } from "../utils/mockAnalysisApi.ts";
import "./MockApiPanel.css";

interface MockApiPanelProps {
  onSelectScenario: (scenario: MockScenario) => void;
  onClose: () => void;
}

export function MockApiPanel({ onSelectScenario, onClose }: MockApiPanelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [selectedGroup, setSelectedGroup] = useState<"all" | "high" | "medium" | "low">("all");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstScenarioRef = useRef<HTMLButtonElement>(null);

  // F17: Memoize filtered scenarios to avoid recalculation on every render
  const filteredScenarios = useMemo(() => 
    selectedGroup === "all" 
      ? MOCK_SCENARIOS 
      : MOCK_SCENARIOS.filter(s => s.confidence === selectedGroup),
    [selectedGroup]
  );

  // F17: Memoize scenario counts
  const scenarioCounts = useMemo(() => ({
    all: MOCK_SCENARIOS.length,
    high: MOCK_SCENARIOS.filter(s => s.confidence === "high").length,
    medium: MOCK_SCENARIOS.filter(s => s.confidence === "medium").length,
    low: MOCK_SCENARIOS.filter(s => s.confidence === "low").length,
  }), []);

  const getConfidenceBadgeClass = (confidence: string) => {
    switch (confidence) {
      case "high": return "confidence-badge-high";
      case "medium": return "confidence-badge-medium";
      case "low": return "confidence-badge-low";
      default: return "";
    }
  };

  // F3, F4: Focus trap and keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Focus first scenario on mount
    firstScenarioRef.current?.focus();

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // F4: Restore focus to trigger button on close
  useEffect(() => {
    return () => {
      // Store reference to previously focused element
      const previouslyFocused = document.activeElement as HTMLElement;
      if (previouslyFocused && previouslyFocused.blur) {
        previouslyFocused.blur();
      }
    };
  }, []);

  return (
    <div 
      className="mock-api-panel-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-api-title"
    >
      <div className="mock-api-panel" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="mock-api-panel-header">
          <div className="mock-api-panel-title-row">
            <Beaker size={24} strokeWidth={2} className="mock-api-panel-icon" />
            <h2 id="mock-api-title" className="mock-api-panel-title">
              {t('admin.mockApi.title', 'Mock API Test Scenarios')}
            </h2>
          </div>
          <button 
            ref={closeButtonRef}
            className="mock-api-panel-close" 
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            type="button"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <p className="mock-api-panel-description">
          {t('admin.mockApi.description', 'Select a scenario to test the Result UI with different fill levels and confidence ratings.')}
        </p>

        {/* Filter Tabs */}
        <div className="mock-api-filter-tabs" role="tablist" aria-label={t('admin.mockApi.filterByConfidence', 'Filter by confidence level')}>
          <button
            className={`mock-api-filter-tab ${selectedGroup === "all" ? "active" : ""}`}
            onClick={() => setSelectedGroup("all")}
            type="button"
            role="tab"
            aria-selected={selectedGroup === "all"}
            aria-controls="mock-scenarios-list"
          >
            {t('admin.mockApi.filterAll', 'All')} ({scenarioCounts.all})
          </button>
          <button
            className={`mock-api-filter-tab ${selectedGroup === "high" ? "active" : ""}`}
            onClick={() => setSelectedGroup("high")}
            type="button"
            role="tab"
            aria-selected={selectedGroup === "high"}
            aria-controls="mock-scenarios-list"
          >
            {t('admin.mockApi.filterHigh', 'High')} ({scenarioCounts.high})
          </button>
          <button
            className={`mock-api-filter-tab ${selectedGroup === "medium" ? "active" : ""}`}
            onClick={() => setSelectedGroup("medium")}
            type="button"
            role="tab"
            aria-selected={selectedGroup === "medium"}
            aria-controls="mock-scenarios-list"
          >
            {t('admin.mockApi.filterMedium', 'Medium')} ({scenarioCounts.medium})
          </button>
          <button
            className={`mock-api-filter-tab ${selectedGroup === "low" ? "active" : ""}`}
            onClick={() => setSelectedGroup("low")}
            type="button"
            role="tab"
            aria-selected={selectedGroup === "low"}
            aria-controls="mock-scenarios-list"
          >
            {t('admin.mockApi.filterLow', 'Low')} ({scenarioCounts.low})
          </button>
        </div>

        {/* Scenario List */}
        <div 
          id="mock-scenarios-list"
          className="mock-api-scenarios"
          role="tabpanel"
          aria-live="polite"
          aria-atomic="true"
        >
          {filteredScenarios.map((scenario, index) => (
            <button
              key={scenario.id}
              ref={index === 0 ? firstScenarioRef : undefined}
              className="mock-api-scenario-card"
              onClick={() => onSelectScenario(scenario)}
              type="button"
              aria-label={t('admin.mockApi.scenarioLabel', {
                defaultValue: 'Run {{name}}: {{description}}',
                name: t(scenario.nameKey),
                description: t(scenario.descriptionKey)
              })}
            >
              <div className="mock-api-scenario-header">
                <span className="mock-api-scenario-name">{t(scenario.nameKey)}</span>
                <span 
                  className={`confidence-badge ${getConfidenceBadgeClass(scenario.confidence)}`}
                  aria-label={t('admin.mockApi.confidenceLevel', {
                    defaultValue: '{{level}} confidence',
                    level: scenario.confidence
                  })}
                >
                  {t(`admin.mockApi.confidence.${scenario.confidence}`, scenario.confidence)}
                </span>
              </div>
              <p className="mock-api-scenario-description">{t(scenario.descriptionKey)}</p>
              <div className="mock-api-scenario-meta">
                <span className="mock-api-scenario-fill">{scenario.fillPercentage}% {t('admin.mockApi.fill', 'fill')}</span>
                <span className="mock-api-scenario-latency">{scenario.latencyMs}ms</span>
                {scenario.imageQualityIssues && scenario.imageQualityIssues.length > 0 && (
                  <span className="mock-api-scenario-issues">
                    {scenario.imageQualityIssues.length} {t('admin.mockApi.issue', { count: scenario.imageQualityIssues.length, defaultValue: 'issue' })}
                  </span>
                )}
              </div>
              <div className="mock-api-scenario-action">
                <Zap size={16} strokeWidth={2} />
                <span>{t('admin.mockApi.runTest', 'Run Test')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
