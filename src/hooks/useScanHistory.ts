import { useState, useEffect, useCallback } from "react";
import type { AnalysisResult } from "./state/appState";

export interface StoredScan {
  id: string;          // scanId from Worker
  timestamp: string;   // ISO 8601
  sku: string;
  bottleName: string;
  fillPercentage: number;
  remainingMl: number;
  consumedMl: number;
  confidence: "high" | "medium" | "low";
  feedbackRating?: string;
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
        const parsed = JSON.parse(stored) as StoredScan[];
        setScans(parsed);
      }
    } catch (error) {
      console.error("Failed to load scan history:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add scan to history
  const addScan = useCallback((scan: StoredScan) => {
    setScans((prev) => {
      const updated = [scan, ...prev];
      
      // Auto-prune if over limit
      if (updated.length > MAX_SCANS) {
        const pruned = updated.slice(0, MAX_SCANS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
        return pruned;
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Delete scan from history
  const deleteScan = useCallback((scanId: string) => {
    setScans((prev) => {
      const updated = prev.filter((s) => s.id !== scanId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setScans([]);
    localStorage.removeItem(STORAGE_KEY);
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

  // Get statistics
  const getStats = useCallback(() => {
    if (scans.length === 0) {
      return {
        totalScans: 0,
        totalConsumedMl: 0,
        averageFillPercentage: 0,
        scansLast7Days: 0,
        scansLast30Days: 0,
      };
    }

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return {
      totalScans: scans.length,
      totalConsumedMl: scans.reduce((sum, s) => sum + s.consumedMl, 0),
      averageFillPercentage: Math.round(
        scans.reduce((sum, s) => sum + s.fillPercentage, 0) / scans.length
      ),
      scansLast7Days: scans.filter(
        (s) => now - new Date(s.timestamp).getTime() < sevenDaysMs
      ).length,
      scansLast30Days: scans.filter(
        (s) => now - new Date(s.timestamp).getTime() < thirtyDaysMs
      ).length,
    };
  }, [scans]);

  return {
    scans,
    isLoading,
    addScan,
    deleteScan,
    clearHistory,
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
  };
}
