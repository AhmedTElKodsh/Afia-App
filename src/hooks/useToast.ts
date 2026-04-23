/**
 * useToast Hook
 * 
 * Easy toast notification management.
 * 
 * Usage:
 * const { toasts, addToast, removeToast } = useToast();
 * 
 * addToast("Success!", "success");
 * addToast("Error occurred", "error");
 */

import { useState, useCallback } from "react";
import type { ToastData, ToastType } from "../components/Toast.tsx";

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Generate unique ID
  const generateId = useCallback(() => {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add toast
  const addToast = useCallback((
    message: string,
    type: ToastType = "info",
    duration?: number
  ) => {
    const id = generateId();
    const toast: ToastData = {
      id,
      message,
      type,
      duration,
    };

    setToasts(prev => [...prev, toast]);
    return id;
  }, [generateId]);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Convenience methods
  const success = useCallback((message: string, duration?: number) => {
    return addToast(message, "success", duration);
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    return addToast(message, "error", duration);
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    return addToast(message, "warning", duration);
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    return addToast(message, "info", duration);
  }, [addToast]);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearToasts,
  };
}
