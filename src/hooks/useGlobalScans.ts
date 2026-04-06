import { useState, useEffect, useCallback } from "react";
import type { StoredScan } from "./useScanHistory";
import { getBottleBySku } from "../data/bottleRegistry";

const PROXY_URL = import.meta.env.VITE_PROXY_URL || "http://localhost:8787";
const SESSION_KEY = "afia_admin_session";

export function useGlobalScans() {
  const [scans, setScans] = useState<StoredScan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token || !PROXY_URL) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${PROXY_URL}/admin/scans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch scans: ${response.statusText}`);
      }

      const data = await response.json() as { scans: any[] };
      
      // Map Supabase rows to StoredScan format
      const mappedScans: StoredScan[] = data.scans.map((s) => {
        const bottle = getBottleBySku(s.sku);
        const totalVolume = bottle?.totalVolumeMl || 0;
        const remainingMl = Math.round(totalVolume * (s.fill_percentage / 100));
        
        return {
          id: s.id,
          timestamp: s.timestamp,
          sku: s.sku,
          bottleName: bottle?.name || `Unknown (${s.sku})`,
          fillPercentage: s.fill_percentage,
          remainingMl,
          consumedMl: totalVolume - remainingMl,
          confidence: s.confidence as "high" | "medium" | "low",
          aiProvider: s.ai_provider,
          latencyMs: s.latency_ms,
          feedbackRating: s.accuracy_rating,
        };
      });

      setScans(mappedScans);
    } catch (err) {
      console.error("Global scans fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch global scans");
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
