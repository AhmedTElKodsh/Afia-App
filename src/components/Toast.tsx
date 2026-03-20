import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { X, Check, AlertTriangle, Info } from "lucide-react";
import "./Toast.css";

/**
 * Toast Notification System
 *
 * Premium glassmorphic toast notifications for user feedback.
 * Supports multiple types, auto-dismiss, and programmatic control.
 *
 * Features:
 * - Multiple toast types (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismiss
 * - Stacked toasts
 * - Accessible (aria-live regions)
 * - Premium animations
 * - Reduced motion support
 */

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Icon configuration
const ICON_CONFIG = {
  success: Check,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

// Color configuration
const COLOR_CONFIG = {
  success: {
    bg: "var(--color-success-bg)",
    border: "var(--color-success)",
    icon: "var(--color-success)",
  },
  error: {
    bg: "var(--color-danger-bg)",
    border: "var(--color-danger)",
    icon: "var(--color-danger)",
  },
  warning: {
    bg: "var(--color-warning-bg)",
    border: "var(--color-warning)",
    icon: "var(--color-warning)",
  },
  info: {
    bg: "var(--glass-bg-subtle)",
    border: "var(--color-primary)",
    icon: "var(--color-primary)",
  },
};

/**
 * ToastProvider Component
 *
 * Provides toast notification context to the app.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2);
      const newToast: Toast = {
        id,
        ...toast,
        duration: toast.duration ?? 4000,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss if duration is set
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, newToast.duration);
      }
    },
    [dismissToast]
  );

  // Convenience methods
  const success = useCallback(
    (title: string, message?: string) => {
      showToast({ type: "success", title, message });
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      showToast({ type: "error", title, message });
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      showToast({ type: "warning", title, message });
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      showToast({ type: "info", title, message });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{ showToast, success, error, warning, info, dismissToast }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

/**
 * useToast Hook
 *
 * Access toast notifications from anywhere in the app.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/**
 * ToastContainer Component
 *
 * Renders all active toasts in a stacked layout.
 */
interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/**
 * ToastItem Component
 *
 * Individual toast notification with animation.
 */
interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = ICON_CONFIG[toast.type];
  const colors = COLOR_CONFIG[toast.type];

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Match exit animation duration
  }, [toast.id, onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(handleDismiss, toast.duration - 300);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleDismiss]);

  return (
    <div
      className={`toast-item toast-item--${toast.type} ${isExiting ? "toast-item--exiting" : ""}`}
      role="alert"
      aria-label={toast.title}
      style={
        {
          "--toast-bg": colors.bg,
          "--toast-border": colors.border,
          "--toast-icon": colors.icon,
        } as React.CSSProperties
      }
    >
      <div className="toast-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2} />
      </div>

      <div className="toast-content">
        <p className="toast-title">{toast.title}</p>
        {toast.message && <p className="toast-message">{toast.message}</p>}
      </div>

      <button
        className="toast-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
