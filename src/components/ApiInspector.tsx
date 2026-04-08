import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { analyzeBottle } from "../api/apiClient.ts";
import { AdminToolsOverlay } from "./AdminToolsOverlay.tsx";
import type { AnalysisResult } from "../state/appState.ts";
import "./ApiInspector.css";

// 1×1 white JPEG — pure base64, no data: prefix
const QUICK_FIRE_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAD/9k=';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function ApiInspector({ selectedSku }: { selectedSku: string }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);

  const runAnalysis = useCallback(async (base64: string) => {
    setStatus("loading");
    setResult(null);
    setRawError(null);
    try {
      const res = await analyzeBottle(selectedSku, base64);
      setResult(res);
      setStatus("success");
    } catch (err) {
      setRawError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [selectedSku]);

  // F1 fix: allow resetting to idle so user can run another test
  const handleReset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setRawError(null);
  }, []);

  const handleQuickFire = useCallback(() => {
    runAnalysis(QUICK_FIRE_BASE64);
  }, [runAnalysis]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // F4 fix: guard against files too large for the Worker
    if (file.size > MAX_FILE_SIZE) {
      setStatus("error");
      setRawError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`);
      e.target.value = '';
      return;
    }

    const input = e.target; // capture ref before async
    const reader = new FileReader();

    reader.onload = () => {
      // F2 fix: clear input so the same file can be re-selected
      input.value = '';
      // F3 fix: guard against non-string result (should not happen with readAsDataURL, but typed as string | ArrayBuffer | null)
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        setStatus("error");
        setRawError("Failed to read file: unexpected result type.");
        return;
      }
      const base64Only = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
      runAnalysis(base64Only);
    };

    // F3 fix: handle FileReader errors
    reader.onerror = () => {
      input.value = '';
      setStatus("error");
      setRawError("Failed to read the selected file. Please try another image.");
    };

    reader.readAsDataURL(file);
  }, [runAnalysis]);

  return (
    <div className="api-inspector" dir={isRTL ? 'rtl' : 'ltr'}>
      <p className="api-inspector-description">{t('admin.inspector.description')}</p>

      <button
        className="entry-point-button entry-point-button--primary"
        onClick={handleQuickFire}
        disabled={status === "loading"}
        type="button"
      >
        {t('admin.inspector.quickFireButton')}
      </button>
      <p className="api-inspector-hint">{t('admin.inspector.quickFireHint')}</p>

      <div className="api-inspector-divider">{t('admin.inspector.uploadLabel')}</div>

      {/* F12 fix: associate label with file input for screen readers */}
      <label className="api-inspector-file-label">
        <span className="sr-only">{t('admin.inspector.uploadLabel')}</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={status === "loading"}
          aria-label={t('admin.inspector.uploadLabel')}
        />
      </label>

      {status === "loading" && (
        <div className="analyzing-state">
          <div className="analyzing-spinner" />
          <p className="analyzing-text">{t('admin.inspector.loading')}</p>
        </div>
      )}

      {status === "success" && result && (
        <>
          {/* F1 fix: provide a way to dismiss result and run another test */}
          <div className="api-inspector-result-actions">
            <button
              className="test-lab-back-button"
              onClick={handleReset}
              type="button"
            >
              {t('admin.inspector.runAgain')}
            </button>
          </div>
          <AdminToolsOverlay
            result={result}
            isOpen={true}
            onClose={() => {}}
            onOpen={() => {}}
            onSaveValidation={() => {}}
          />
        </>
      )}

      {status === "error" && (
        <>
          <pre className="api-inspector-error">{rawError}</pre>
          {/* F1 fix: allow retrying after error */}
          <div className="api-inspector-result-actions">
            <button
              className="test-lab-back-button"
              onClick={handleReset}
              type="button"
            >
              {t('admin.inspector.runAgain')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
