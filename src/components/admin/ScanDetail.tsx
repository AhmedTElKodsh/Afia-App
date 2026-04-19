/**
 * Admin Scan Detail Component
 * Story 7.7 - Admin Correction Feedback Loop
 * 
 * Displays scan details with accuracy assessment buttons and correction UI
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  ArrowUp,
  ArrowDown,
  XCircle,
  Save,
  RefreshCw,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { StoredScan } from "../../hooks/useScanHistory";
import "./ScanDetail.css";

interface ScanDetailProps {
  scan: StoredScan;
  onBack: () => void;
  onCorrectionSaved?: () => void;
}

type AccuracyButton = "correct" | "too_big" | "too_small" | "way_off";

interface AdminCorrection {
  correctedFillPct: number;
  by: string;
  method: "manual" | "llm-rerun";
  at: string;
}

interface AdminLlmResult {
  fillPercentage: number;
  confidence: "high" | "medium" | "low";
  provider: string;
  rerunAt: string;
}

const WORKER_URL = import.meta.env.VITE_PROXY_URL || "";

export function ScanDetail({ scan, onBack, onCorrectionSaved }: ScanDetailProps) {
  const { t } = useTranslation();
  const [selectedAccuracy, setSelectedAccuracy] = useState<AccuracyButton | null>(null);
  const [correctedFillPct, setCorrectedFillPct] = useState<number>(50);
  const [isSaving, setIsSaving] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminCorrection, setAdminCorrection] = useState<AdminCorrection | null>(null);
  const [adminLlmResult, setAdminLlmResult] = useState<AdminLlmResult | null>(null);
  const [trainingEligible, setTrainingEligible] = useState(false);

  const getAuthToken = () => {
    return sessionStorage.getItem("afia_admin_session") || "";
  };

  const handleAccuracyClick = (accuracy: AccuracyButton) => {
    setSelectedAccuracy(accuracy);
    setError(null);
    setSuccess(null);

    // AC2: "Correct" marks training-eligible immediately
    if (accuracy === "correct") {
      handleSaveCorrection(accuracy);
    }
  };

  const handleSaveCorrection = async (accuracy: AccuracyButton, fillPct?: number) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getAuthToken();
      const requestBody: any = {
        scanId: scan.id,
        accuracy,
      };

      // AC4: Manual correction requires correctedFillPct
      if (accuracy !== "correct" && fillPct !== undefined) {
        requestBody.correctedFillPct = fillPct;
        requestBody.method = "manual";
      }

      const response = await fetch(`${WORKER_URL}/admin/correct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save correction");
      }

      const data = await response.json();
      setTrainingEligible(data.trainingEligible);
      
      if (accuracy === "correct") {
        setSuccess(t("admin.scanDetail.markedCorrect", "Marked as correct and training-eligible"));
      } else {
        setSuccess(t("admin.scanDetail.correctionSaved", "Correction saved successfully"));
        setAdminCorrection({
          correctedFillPct: fillPct!,
          by: "admin",
          method: "manual",
          at: new Date().toISOString(),
        });
      }

      // Disable buttons after successful save
      setSelectedAccuracy(null);
      
      if (onCorrectionSaved) {
        onCorrectionSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunLlmAgain = async () => {
    setIsRerunning(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`${WORKER_URL}/admin/rerun-llm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scanId: scan.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to re-run LLM");
      }

      const data = await response.json();
      setAdminLlmResult(data.adminLlmResult);
      setSuccess(
        t(
          "admin.scanDetail.llmRerunSuccess",
          `LLM re-run complete: ${data.adminLlmResult.fillPercentage}% (${data.adminLlmResult.provider})`
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRerunning(false);
    }
  };

  const handleManualSave = () => {
    if (selectedAccuracy && selectedAccuracy !== "correct") {
      handleSaveCorrection(selectedAccuracy, correctedFillPct);
    }
  };

  return (
    <div className="scan-detail">
      <header className="scan-detail-header">
        <button className="btn btn-link btn-icon-text" onClick={onBack}>
          <ChevronLeft size={18} /> {t("common.back")}
        </button>
        <h3>{t("admin.scanDetail.title", "Scan Detail")}</h3>
      </header>

      <div className="scan-detail-content">
        {/* Scan Image */}
        <div className="scan-image-container card">
          <img
            src={scan.imageUrl || "/test-bottle.jpg"}
            alt="Scan"
            className="scan-image"
          />
          <div className="scan-metadata">
            <div className="metadata-row">
              <span className="label">{t("admin.scanDetail.sku", "SKU")}:</span>
              <span className="value">{scan.sku}</span>
            </div>
            <div className="metadata-row">
              <span className="label">{t("admin.scanDetail.fillPct", "Fill %")}:</span>
              <span className="value">{scan.fillPercentage}%</span>
            </div>
            <div className="metadata-row">
              <span className="label">{t("admin.scanDetail.confidence", "Confidence")}:</span>
              <span className="value">{scan.confidence}</span>
            </div>
            <div className="metadata-row">
              <span className="label">{t("admin.scanDetail.provider", "Provider")}:</span>
              <span className="value">{scan.aiProvider || "unknown"}</span>
            </div>
          </div>
        </div>

        {/* Accuracy Assessment */}
        <div className="accuracy-assessment card">
          <h4>{t("admin.scanDetail.accuracyAssessment", "Accuracy Assessment")}</h4>
          
          {/* AC1: Accuracy buttons */}
          <div className="accuracy-buttons">
            <button
              className={`accuracy-btn accuracy-btn--too-big ${
                selectedAccuracy === "too_big" ? "active" : ""
              }`}
              onClick={() => handleAccuracyClick("too_big")}
              disabled={isSaving || trainingEligible}
            >
              <ArrowUp size={20} />
              <span>{t("admin.scanDetail.tooBig", "Too Big")}</span>
            </button>
            <button
              className={`accuracy-btn accuracy-btn--too-small ${
                selectedAccuracy === "too_small" ? "active" : ""
              }`}
              onClick={() => handleAccuracyClick("too_small")}
              disabled={isSaving || trainingEligible}
            >
              <ArrowDown size={20} />
              <span>{t("admin.scanDetail.tooSmall", "Too Small")}</span>
            </button>
            <button
              className={`accuracy-btn accuracy-btn--correct ${
                selectedAccuracy === "correct" ? "active" : ""
              }`}
              onClick={() => handleAccuracyClick("correct")}
              disabled={isSaving || trainingEligible}
            >
              <CheckCircle size={20} />
              <span>{t("admin.scanDetail.correct", "Correct")}</span>
            </button>
            <button
              className={`accuracy-btn accuracy-btn--way-off ${
                selectedAccuracy === "way_off" ? "active" : ""
              }`}
              onClick={() => handleAccuracyClick("way_off")}
              disabled={isSaving || trainingEligible}
            >
              <XCircle size={20} />
              <span>{t("admin.scanDetail.wayOff", "Way Off")}</span>
            </button>
          </div>

          {/* AC3: Correction panel (shown after selecting non-correct button) */}
          {selectedAccuracy && selectedAccuracy !== "correct" && !adminCorrection && (
            <div className="correction-panel">
              <h5>{t("admin.scanDetail.correction", "Correction")}</h5>
              
              <div className="correction-input-group">
                <label htmlFor="corrected-fill">
                  {t("admin.scanDetail.correctFillPct", "Correct fill %")}:
                </label>
                <input
                  id="corrected-fill"
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  value={correctedFillPct}
                  onChange={(e) => setCorrectedFillPct(Number(e.target.value))}
                  className="fill-input"
                />
              </div>

              <div className="correction-actions">
                <button
                  className="btn btn-primary btn-icon-text"
                  onClick={handleManualSave}
                  disabled={isSaving || correctedFillPct < 1 || correctedFillPct > 99}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      <span>{t("common.saving", "Saving...")}</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>{t("admin.scanDetail.saveCorrection", "Save Correction")}</span>
                    </>
                  )}
                </button>

                <button
                  className="btn btn-secondary btn-icon-text"
                  onClick={handleRunLlmAgain}
                  disabled={isRerunning}
                >
                  {isRerunning ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      <span>{t("common.loading", "Loading...")}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} />
                      <span>{t("admin.scanDetail.runLlmAgain", "Run LLM Again")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* AC6: Display correction status */}
          {adminCorrection && (
            <div className="correction-status">
              <h5>{t("admin.scanDetail.correctionApplied", "Correction Applied")}</h5>
              <div className="status-details">
                <div className="status-row">
                  <span className="label">{t("admin.scanDetail.correctedFill", "Corrected fill")}:</span>
                  <span className="value">{adminCorrection.correctedFillPct}%</span>
                </div>
                <div className="status-row">
                  <span className="label">{t("admin.scanDetail.method", "Method")}:</span>
                  <span className="value">{adminCorrection.method}</span>
                </div>
                <div className="status-row">
                  <span className="label">{t("admin.scanDetail.timestamp", "Timestamp")}:</span>
                  <span className="value">
                    {new Date(adminCorrection.at).toLocaleString()}
                  </span>
                </div>
                {trainingEligible && (
                  <div className="status-row">
                    <span className="badge badge-success">
                      {t("admin.scanDetail.trainingEligible", "Training Eligible")} ✓
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Display LLM re-run result */}
          {adminLlmResult && (
            <div className="llm-rerun-result">
              <h5>{t("admin.scanDetail.llmRerunResult", "LLM Re-run Result")}</h5>
              <div className="result-details">
                <div className="result-row">
                  <span className="label">{t("admin.scanDetail.fillPct", "Fill %")}:</span>
                  <span className="value">{adminLlmResult.fillPercentage}%</span>
                </div>
                <div className="result-row">
                  <span className="label">{t("admin.scanDetail.confidence", "Confidence")}:</span>
                  <span className="value">{adminLlmResult.confidence}</span>
                </div>
                <div className="result-row">
                  <span className="label">{t("admin.scanDetail.provider", "Provider")}:</span>
                  <span className="value">{adminLlmResult.provider}</span>
                </div>
                <div className="result-row">
                  <span className="label">{t("admin.scanDetail.rerunAt", "Re-run at")}:</span>
                  <span className="value">
                    {new Date(adminLlmResult.rerunAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error/Success messages */}
          {error && (
            <div className="message message-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="message message-success">
              <CheckCircle size={18} />
              <span>{success}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
