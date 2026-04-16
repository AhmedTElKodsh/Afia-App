import { useState, useEffect, useCallback } from "react";
import type { AnalysisResult } from "../state/appState";

export interface StoredScan {
  id: string;          // scanId from Worker
  timestamp: string;   // ISO 8601
  sku: string;
  bottleName: string;
  fillPercentage: number;
  remainingMl: number;
  consumedMl: number;
  confidence: "high" | "medium" | "low";
  aiProvider?: "gemini" | "groq" | "openrouter" | "mistral" | "local-cnn" | "mock-api";
  latencyMs?: number;
  feedbackRating?: "about_right" | "too_high" | "too_low" | "way_off";
  correctedPercentage?: number; // Ground truth from admin
  imageUrl?: string;
}

const STORAGE_KEY = "afia_scan_history";
const MAX_SCANS = 500;

export function useScanHistory() {
  const [scans, setScans] = useState<StoredScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (s): s is StoredScan =>
              typeof s === "object" &&
              s !== null &&
              typeof s.id === "string" &&
              typeof s.timestamp === "string" &&
              typeof s.fillPercentage === "number"
          );
          setScans(valid);
        }
      }
    } catch (error) {
      console.error("Failed to load scan history:", error);
      // If corruption is detected, we could clear it, but for now we just log
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save helper with quota handling
  const saveToStorage = (data: StoredScan[]): boolean => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        console.warn("localStorage quota exceeded, pruning history...");
        // Prune oldest 20% and retry
        const pruned = data.slice(0, Math.floor(data.length * 0.8));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
          setScans(pruned);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  };

  // Add scan to history
  const addScan = useCallback((scan: StoredScan) => {
    setScans((prev) => {
      const updated = [scan, ...prev];
      const toStore = updated.length > MAX_SCANS ? updated.slice(0, MAX_SCANS) : updated;
      
      saveToStorage(toStore);

      // Only notify listeners when storage succeeded (saveToStorage returns false on unrecoverable quota error)
      window.dispatchEvent(new CustomEvent("afia:scan-added"));
      return toStore;
    });
  }, []);

  // Delete scan from history
  const deleteScan = useCallback((scanId: string) => {
    setScans((prev) => {
      const updated = prev.filter((s) => s.id !== scanId);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setScans([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  // Get scans filtered by date range
  const getScansByDateRange = useCallback((days: number): StoredScan[] => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return scans.filter((scan) => {
      const scanDate = new Date(scan.timestamp);
      return scanDate >= cutoff;
    });
  }, [scans]);

  // Search scans by bottle name
  const searchScans = useCallback((query: string): StoredScan[] => {
    if (!query.trim()) return scans;
    
    const lowercaseQuery = query.toLowerCase();
    return scans.filter((scan) =>
      scan.bottleName.toLowerCase().includes(lowercaseQuery)
    );
  }, [scans]);

  // Update feedbackRating on an existing scan
  const updateFeedback = useCallback((scanId: string, feedbackRating: StoredScan["feedbackRating"]) => {
    setScans((prev) => {
      const updated = prev.map((s) =>
        s.id === scanId ? { ...s, feedbackRating } : s
      );
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* silent */ }
      return updated;
    });
  }, []);

  // Get statistics
  const getStats = useCallback(() => {
    if (scans.length === 0) {
      return {
        totalScans: 0,
        totalConsumedMl: 0,
        averageFillPercentage: 0,
        scansLast7Days: 0,
        scansLast30Days: 0,
        feedbackCount: 0,
        activeUsers: 0,
      };
    }

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Estimate unique users based on session IDs if available, 
    // or just unique bottle/day combinations as a proxy for this POC
    const uniqueUserProxy = new Set(
      scans.map(s => {
        const date = s.timestamp.split('T')[0];
        // In a real app we'd have a userId or deviceId
        return date; 
      })
    ).size;

    const feedbackCount = scans.filter(s => s.feedbackRating).length;
    
    // Calculate Mean Absolute Error (MAE)
    const reviewedScans = scans.filter(s => typeof s.correctedPercentage === 'number');
    const totalError = reviewedScans.reduce((sum, s) => sum + Math.abs(s.fillPercentage - (s.correctedPercentage || 0)), 0);
    const mae = reviewedScans.length > 0 ? (totalError / reviewedScans.length).toFixed(1) : "N/A";

    return {
      totalScans: scans.length,
      totalConsumedMl: scans.reduce((sum, s) => sum + (Number(s.consumedMl) || 0), 0),
      averageFillPercentage: Math.round(
        scans.reduce((sum, s) => sum + s.fillPercentage, 0) / scans.length
      ),
      scansLast7Days: scans.filter(
        (s) => now - new Date(s.timestamp).getTime() < sevenDaysMs
      ).length,
      scansLast30Days: scans.filter(
        (s) => now - new Date(s.timestamp).getTime() < thirtyDaysMs
      ).length,
      feedbackCount,
      activeUsers: uniqueUserProxy,
      mae
    };
  }, [scans]);

  return {
    scans,
    setScans,
    isLoading,
    addScan,
    deleteScan,
    clearHistory,
    updateFeedback,
    getScansByDateRange,
    searchScans,
    getStats,
  };
}

// Helper to create StoredScan from AnalysisResult
export function createStoredScan(
  scanId: string,
  sku: string,
  bottleName: string,
  totalVolumeMl: number,
  result: AnalysisResult,
  remainingMl: number
): StoredScan {
  return {
    id: scanId,
    timestamp: new Date().toISOString(),
    sku,
    bottleName,
    fillPercentage: result.fillPercentage,
    remainingMl,
    consumedMl: totalVolumeMl - remainingMl,
    confidence: result.confidence,
    aiProvider: result.aiProvider,
    latencyMs: result.latencyMs,
  };
}
