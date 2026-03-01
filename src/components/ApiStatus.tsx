import "./ApiStatus.css";

interface ApiStatusProps {
  state: "loading" | "error";
  errorMessage?: string;
  onRetry?: () => void;
  onRetake?: () => void;
}

export function ApiStatus({
  state,
  errorMessage,
  onRetry,
  onRetake,
}: ApiStatusProps) {
  if (state === "loading") {
    return (
      <div className="api-status" role="status" aria-live="polite">
        <div className="analyzing-animation" aria-hidden="true">
          <div className="bottle-outline">
            <div className="fill-wave" />
          </div>
        </div>
        <p className="analyzing-text">Analyzing your bottle...</p>
        <p className="text-caption text-secondary">
          This usually takes 3–8 seconds
        </p>
      </div>
    );
  }

  return (
    <div className="api-status" role="alert">
      <div className="error-icon" aria-hidden="true">
        ⚠️
      </div>
      <h2>Unable to analyze image</h2>
      <p className="text-secondary">{errorMessage || "Please try again"}</p>
      <div className="error-actions">
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            Retry
          </button>
        )}
        {onRetake && (
          <button className="btn btn-outline" onClick={onRetake}>
            Retake Photo
          </button>
        )}
      </div>
    </div>
  );
}
