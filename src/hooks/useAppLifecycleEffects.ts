import { useEffect } from "react";
import { getQueueLength, processSyncQueue } from "../services/syncQueue.ts";
import { loadModel } from "../services/modelLoader.ts";

interface UseAppLifecycleEffectsArgs {
  setPendingSyncCount: (count: number) => void;
}

export function useAppLifecycleEffects({ setPendingSyncCount }: UseAppLifecycleEffectsArgs): void {
  // Load local model on mount.
  useEffect(() => {
    loadModel().catch(err => {
      console.warn("[App] Model preload failed:", err);
    });
  }, []);

  // Check for model updates on app load.
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const { checkModelVersion } = await import("../services/modelLoader.ts");
        const result = await checkModelVersion();

        if (result.updateAvailable) {
          console.log("[App] Model update available:", result.latestVersion);
        }
      } catch (err) {
        console.warn("[App] Version check failed:", err);
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then(() => checkForUpdates())
        .catch(err => console.warn("[App] SW ready failed:", err));
    } else {
      checkForUpdates();
    }
  }, []);

  // Process offline queue when coming back online.
  useEffect(() => {
    let isProcessingOnline = false;
    const handleOnline = () => {
      if (isProcessingOnline) return;
      isProcessingOnline = true;
      console.log("[App] Network connection restored, processing offline queue");
      import("../services/analysisRouter.ts")
        .then(({ processOfflineQueue }) => processOfflineQueue())
        .catch(err => console.warn("[App] processOfflineQueue failed:", err))
        .finally(() => {
          isProcessingOnline = false;
        });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Process sync queue on mount and track pending count.
  useEffect(() => {
    let mounted = true;

    const initSyncQueue = async () => {
      try {
        const count = await getQueueLength();
        if (!mounted) return;
        setPendingSyncCount(count);

        if (count > 0 && navigator.onLine) {
          console.log(`[App] Found ${count} pending scans, processing...`);
          await processSyncQueue();
          if (!mounted) return;
          const newCount = await getQueueLength();
          if (mounted) setPendingSyncCount(newCount);
        }
      } catch (error) {
        console.warn("[App] Failed to process sync queue:", error);
      }
    };

    initSyncQueue();

    const handleSyncUpdate = () => {
      getQueueLength()
        .then(count => {
          if (mounted) setPendingSyncCount(count);
        })
        .catch(err => console.warn("[App] getQueueLength failed:", err));
    };

    window.addEventListener("sync-success", handleSyncUpdate);
    window.addEventListener("sync-failed", handleSyncUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("sync-success", handleSyncUpdate);
      window.removeEventListener("sync-failed", handleSyncUpdate);
    };
  }, [setPendingSyncCount]);
}
