import "./InlineConfirm.css";

interface InlineConfirmProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning";
}

export function InlineConfirm({
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "danger",
}: InlineConfirmProps) {
  return (
    <div className="inline-confirm" role="alert">
      <span className="inline-confirm-message">{message}</span>
      <div className="inline-confirm-actions">
        <button
          className={`btn btn-sm btn-${variant}`}
          onClick={onConfirm}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        >
          {confirmLabel}
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
