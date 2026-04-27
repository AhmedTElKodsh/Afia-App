import { useState, useEffect, useCallback, useRef } from "react";
import type { StoredScan } from "./useScanHistory";
import { getBottleBySku } from "../data/bottleRegistry";
import { getAdminScans } from "../api/apiClient";

const SESSION_KEY = "afia_admin_session";
const FETCH_CACHE_MS = 30_000; // skip refetch if data is fresh (prevents double-fetch on tab remount)

export function useGlobalScans() {
  const [scans, setScans] = useState<StoredScan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchScans = useCallback(async () => {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) return;

    if (Date.now() - lastFetchRef.current < FETCH_CACHE_MS) return;

    setIsLoading(true);
    setError(null);

    try {
      const globalScans = await getAdminScans(token);
      
      // Map AdminScan to StoredScan format
      const mappedScans: StoredScan[] = globalScans.map((s) => {
        const bottle = getBottleBySku(s.sku);
        const totalVolume = bottle?.totalVolumeMl || 0;
        const remainingMl = Math.round(totalVolume * (s.fillPercentage / 100));
        
        return {
          id: s.scanId,
          timestamp: s.timestamp,
          sku: s.sku,
          bottleName: bottle?.name || `Unknown (${s.sku})`,
          fillPercentage: s.fillPercentage,
          remainingMl,
          consumedMl: totalVolume - remainingMl,
          confidence: s.confidence as "high" | "medium" | "low",
          aiProvider: s.aiProvider as StoredScan['aiProvider'],
          latencyMs: s.latencyMs,
          feedbackRating: s.feedbackRating as StoredScan['feedbackRating'],
        };
      });

      setScans(mappedScans);
      lastFetchRef.current = Date.now();
    } catch (err) {
      console.error("Global scans fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch global scans");
      
      // If unauthorized, token might be stale
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const getStats = useCallback(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

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

    // Proxy for active users: unique dates in the POC
    const uniqueDays = new Set(scans.map(s => s.timestamp.split('T')[0])).size;

    return {
      totalScans: scans.length,
      totalConsumedMl: scans.reduce((sum, s) => sum + (s.consumedMl || 0), 0),
      averageFillPercentage: Math.round(
        scans.reduce((sum, s) => sum + s.fillPercentage, 0) / scans.length
      ),
      scansLast7Days: scans.filter(
        s => now - new Date(s.timestamp).getTime() < sevenDaysMs
      ).length,
      scansLast30Days: scans.filter(
        s => now - new Date(s.timestamp).getTime() < thirtyDaysMs
      ).length,
      feedbackCount: scans.filter(s => s.feedbackRating).length,
      activeUsers: uniqueDays,
    };
  }, [scans]);

  return {
    scans,
    isLoading,
    error,
    refresh: fetchScans,
    getStats,
  };
}
