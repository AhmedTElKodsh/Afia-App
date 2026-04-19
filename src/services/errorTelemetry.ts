/**
 * Error Telemetry Service
 * Story 7.4 - Task 8: Track error patterns for monitoring
 */

const WORKER_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:8787';

interface ErrorEvent {
  timestamp: number;
  category: 'model_loading' | 'inference' | 'network' | 'storage' | 'model_update' | 'version_check' | 'unknown';
  errorType: string;
  message: string;
  context?: Record<string, any>;
}

const errorLog: ErrorEvent[] = [];
const MAX_LOG_SIZE = 100;

/**
 * Log an error event for telemetry
 */
export function logError(
  category: ErrorEvent['category'],
  error: Error,
  context?: Record<string, any>
): void {
  const event: ErrorEvent = {
    timestamp: Date.now(),
    category,
    errorType: error.name || 'Error',
    message: error.message,
    context,
  };
  
  errorLog.push(event);
  
  // Keep log size manageable
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.shift();
  }
  
  console.error(`[ErrorTelemetry] ${category}:`, {
    type: event.errorType,
    message: event.message,
    context: event.context,
  });

  // Send to worker error endpoint (fire-and-forget)
  const payload = JSON.stringify({
    sku: (context as { sku?: string })?.sku ?? 'unknown',
    error: `[${category}] ${error.name}: ${error.message}`,
    timestamp: new Date(event.timestamp).toISOString(),
    deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  });
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(`${WORKER_URL}/error`, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(`${WORKER_URL}/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Never let telemetry break the app
  }
}

/**
 * Get error statistics for monitoring
 */
export function getErrorStats(): {
  total: number;
  byCategory: Record<string, number>;
  recent: ErrorEvent[];
} {
  const byCategory: Record<string, number> = {};
  
  for (const event of errorLog) {
    byCategory[event.category] = (byCategory[event.category] || 0) + 1;
  }
  
  return {
    total: errorLog.length,
    byCategory,
    recent: errorLog.slice(-10), // Last 10 errors
  };
}

/**
 * Clear error log (for testing)
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
}
