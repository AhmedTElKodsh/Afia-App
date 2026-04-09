/**
 * AdminToolsOverlay Component
 * 
 * Expandable admin panel for viewing API responses, metrics, and validation controls.
 * Collapsed by default to maintain pure user simulation experience.
 * 
 * Features:
 * - API Response Inspector (JSON)
 * - Performance Metrics
 * - Validation Controls (Accurate/Too High/Too Low)
 * - Notes Field
 * - Copy to Clipboard
 * - Full i18n support for English and Arabic
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Copy, Check, ThumbsUp, ThumbsDown, Clock, Cpu, CheckCircle, Camera, Wrench, BarChart2, Zap } from "lucide-react";
import type { AnalysisResult } from "../state/appState.ts";
import "./AdminToolsOverlay.css";

export interface AdminToolsOverlayProps {
  /** Analysis result from AI */
  result: AnalysisResult;
  /** Is panel expanded? */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Open callback */
  onOpen: () => void;
  /** Save validation callback */
  onSaveValidation: (validation: TestValidation) => void;
  /** Loading state for API operations */
  isLoading?: boolean;
}

export interface TestValidation {
  accuracyRating: "accurate" | "too_high" | "too_low";
  notes?: string;
  correctedFillPercentage?: number;
}

export function AdminToolsOverlay({
  result,
  isOpen,
  onClose,
  onOpen,
  onSaveValidation,
  isLoading = false,
}: AdminToolsOverlayProps) {
  const { t, i18n } = useTranslation();
  const [validation, setValidation] = useState<TestValidation | null>(null);
  const [notes, setNotes] = useState("");
  const [correctedPercentage, setCorrectedPercentage] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentLang = i18n.language || 'en';
  const isRTL = currentLang === 'ar';

  // Copy API response to clipboard
  const handleCopy = useCallback(async () => {
    if (isLoading) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      setCopyStatus("error");
    }
  }, [result, isLoading]);

  // Handle validation rating
  const handleRatingSelect = useCallback((rating: "accurate" | "too_high" | "too_low") => {
    setValidation(prev => prev ? { ...prev, accuracyRating: rating } : { accuracyRating: rating });
  }, []);

  // Save validation
  const handleSave = useCallback(() => {
    if (isLoading || isSubmitting) return;
    
    setIsSubmitting(true);

    const validationData: TestValidation = {
      accuracyRating: validation?.accuracyRating || "accurate",
      notes: notes || undefined,
      correctedFillPercentage: correctedPercentage ? parseFloat(correctedPercentage) : undefined,
    };

    onSaveValidation(validationData);

    // Reset after save
    setTimeout(() => {
      setIsSubmitting(false);
      setValidation(null);
      setNotes("");
      setCorrectedPercentage("");
    }, 500);
  }, [validation, notes, correctedPercentage, onSaveValidation, setIsSubmitting, isLoading, isSubmitting]);

  // Get confidence status text and class
  const getConfidenceStatus = () => {
    if (result.confidence === 'high') {
      return { text: t('admin.tools.metrics.confidence.high'), className: 'success' };
    } else if (result.confidence === 'medium') {
      return { text: t('admin.tools.metrics.confidence.medium'), className: 'warning' };
    } else {
      return { text: t('admin.tools.metrics.confidence.low'), className: 'error' };
    }
  };

  // Get response time status
  const getResponseTimeStatus = () => {
    if (result.latencyMs < 5000) {
      return { text: t('admin.tools.metrics.responseTime.statusFast'), className: 'success' };
    } else {
      return { text: t('admin.tools.metrics.responseTime.statusSlow'), className: 'warning' };
    }
  };

  // Get quality issues status
  const getQualityStatus = () => {
    if (result.imageQualityIssues?.length) {
      return { text: t('admin.tools.metrics.qualityIssues.issues'), className: 'warning' };
    } else {
      return { text: t('admin.tools.metrics.qualityIssues.good'), className: 'success' };
    }
  };

  const confidenceStatus = getConfidenceStatus();
  const responseTimeStatus = getResponseTimeStatus();
  const qualityStatus = getQualityStatus();

  return (
    <div className={`admin-tools-overlay ${isOpen ? "open" : "closed"}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Toggle Header */}
      <button
        className="admin-tools-toggle"
        onClick={isOpen ? onClose : onOpen}
        type="button"
        aria-expanded={isOpen}
        aria-controls="admin-tools-panel"
      >
        <div className="admin-tools-toggle-header">
          <Wrench size={16} strokeWidth={2} />
          <span className="admin-tools-toggle-title">{t('admin.tools.title')}</span>
        </div>
        <div className="admin-tools-toggle-action">
          {isOpen ? (
            <>
              <span className="admin-tools-toggle-text">{t('admin.tools.toggle.collapse')}</span>
              <ChevronUp size={20} strokeWidth={2} />
            </>
          ) : (
            <>
              <span className="admin-tools-toggle-text">{t('admin.tools.toggle.expand')}</span>
              <ChevronDown size={20} strokeWidth={2} />
            </>
          )}
        </div>
      </button>

      {/* Panel Content */}
      {isOpen && (
        <div 
          id="admin-tools-panel"
          className="admin-tools-panel"
          role="region"
          aria-label={t('admin.tools.title')}
        >
          {/* Section 1: API Response */}
          <div className="admin-tools-section">
            <div className="admin-tools-section-header">
              <h3 className="admin-tools-section-title">
                <BarChart2 size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {t('admin.tools.apiResponse.title')}
              </h3>
              <button
                className="admin-tools-copy-button"
                onClick={handleCopy}
                type="button"
                aria-label={t('admin.tools.apiResponse.copy')}
              >
                {copyStatus === "copied" ? (
                  <>
                    <Check size={16} strokeWidth={2} />
                    <span>{t('admin.tools.apiResponse.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} strokeWidth={2} />
                    <span>{t('admin.tools.apiResponse.copy')}</span>
                  </>
                )}
              </button>
            </div>
            <div className="admin-tools-code-block">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>

          {/* Section 2: Performance Metrics */}
          <div className="admin-tools-section">
            <h3 className="admin-tools-section-title">
              <Clock size={20} strokeWidth={2} /> {t('admin.tools.metrics.title')}
            </h3>
            <div className="admin-tools-metrics-grid">
              <div className="admin-tools-metric-card">
                <div className="admin-tools-metric-icon"><Clock size={20} strokeWidth={2} /></div>
                <div className="admin-tools-metric-content">
                  <span className="admin-tools-metric-value">
                    {t('admin.tools.metrics.responseTime.value', { value: result.latencyMs })}
                  </span>
                  <span className="admin-tools-metric-label">{t('admin.tools.metrics.responseTime.label')}</span>
                  <span className={`admin-tools-metric-status ${responseTimeStatus.className}`}>
                    {responseTimeStatus.text}
                  </span>
                </div>
              </div>

              <div className="admin-tools-metric-card">
                <div className="admin-tools-metric-icon"><Cpu size={20} strokeWidth={2} /></div>
                <div className="admin-tools-metric-content">
                  <span className="admin-tools-metric-value">
                    {result.aiProvider?.toUpperCase() || "N/A"}
                  </span>
                  <span className="admin-tools-metric-label">{t('admin.tools.metrics.aiProvider.label')}</span>
                  {result.cacheHit && (
                    <span className="admin-tools-metric-status success">
                      {t('admin.tools.metrics.aiProvider.cached')}
                    </span>
                  )}
                </div>
              </div>

              <div className="admin-tools-metric-card">
                <div className="admin-tools-metric-icon"><Zap size={20} strokeWidth={2} /></div>
                <div className="admin-tools-metric-content">
                  <span className="admin-tools-metric-value">
                    {result.tokensEstimated != null
                      ? t('admin.tools.metrics.tokens.value', { count: result.tokensEstimated })
                      : "—"}
                  </span>
                  <span className="admin-tools-metric-label">{t('admin.tools.metrics.tokens.label')}</span>
                  {result.tokensEstimated != null && (
                    <span className="admin-tools-metric-status">
                      {result.aiProvider?.toUpperCase() || ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="admin-tools-metric-card">
                <div className="admin-tools-metric-icon"><CheckCircle size={20} strokeWidth={2} /></div>
                <div className="admin-tools-metric-content">
                  <span className="admin-tools-metric-value">
                    {result.confidence === "high" ? "92%" : result.confidence === "medium" ? "75%" : "45%"}
                  </span>
                  <span className="admin-tools-metric-label">{t('admin.tools.metrics.confidence.label')}</span>
                  <span className={`admin-tools-metric-status ${confidenceStatus.className}`}>
                    {confidenceStatus.text}
                  </span>
                </div>
              </div>

              <div className="admin-tools-metric-card">
                <div className="admin-tools-metric-icon"><Camera size={20} strokeWidth={2} /></div>
                <div className="admin-tools-metric-content">
                  <span className="admin-tools-metric-value">
                    {result.imageQualityIssues?.length || 0}
                  </span>
                  <span className="admin-tools-metric-label">{t('admin.tools.metrics.qualityIssues.label')}</span>
                  <span className="admin-tools-metric-status success">
                    {qualityStatus.text}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Validation */}
          <div className="admin-tools-section">
            <h3 className="admin-tools-section-title">
              <CheckCircle size={20} strokeWidth={2} /> {t('admin.tools.validation.title')}
            </h3>
            
            <div className="admin-tools-validation-intro">
              <p>{t('admin.tools.validation.question')}</p>
            </div>

            <div className="admin-tools-validation-buttons">
              <button
                className={`admin-tools-validation-button ${validation?.accuracyRating === "accurate" ? "selected accurate" : ""}`}
                onClick={() => handleRatingSelect("accurate")}
                type="button"
              >
                <ThumbsUp size={20} strokeWidth={2} />
                <span>{t('admin.tools.validation.accurate')}</span>
              </button>
              
              <button
                className={`admin-tools-validation-button ${validation?.accuracyRating === "too_high" ? "selected high" : ""}`}
                onClick={() => handleRatingSelect("too_high")}
                type="button"
              >
                <ThumbsDown size={20} strokeWidth={2} />
                <span>{t('admin.tools.validation.tooHigh')}</span>
              </button>
              
              <button
                className={`admin-tools-validation-button ${validation?.accuracyRating === "too_low" ? "selected low" : ""}`}
                onClick={() => handleRatingSelect("too_low")}
                type="button"
              >
                <ThumbsDown size={20} strokeWidth={2} />
                <span>{t('admin.tools.validation.tooLow')}</span>
              </button>
            </div>

            {/* Notes Field */}
            <div className="admin-tools-notes">
              <label htmlFor="validation-notes" className="admin-tools-notes-label">
                {t('admin.tools.validation.notesLabel')}
              </label>
              <textarea
                id="validation-notes"
                className="admin-tools-notes-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('admin.tools.validation.notesPlaceholder')}
                rows={3}
              />
            </div>

            {/* Corrected Percentage */}
            <div className="admin-tools-corrected">
              <label htmlFor="corrected-percentage" className="admin-tools-corrected-label">
                {t('admin.tools.validation.correctedLabel')}
              </label>
              <input
                id="corrected-percentage"
                type="number"
                className="admin-tools-corrected-input"
                value={correctedPercentage}
                onChange={(e) => setCorrectedPercentage(e.target.value)}
                placeholder={t('admin.tools.validation.correctedPlaceholder')}
                min={0}
                max={100}
              />
            </div>

            {/* Save Button */}
            <button
              className="admin-tools-save-button"
              onClick={handleSave}
              disabled={isSubmitting || !validation}
              type="button"
            >
              {isSubmitting ? t('admin.tools.validation.saving') : t('admin.tools.validation.saveButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}