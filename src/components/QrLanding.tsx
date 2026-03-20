import { useState, useEffect } from "react";
import { Wifi, WifiOff, Camera, Droplets } from "lucide-react";
import type { BottleContext } from "../state/appState.ts";
import { useOnlineStatus } from "../hooks/useOnlineStatus.ts";
import { LiquidGauge } from "./LiquidGauge.tsx";
import { PrivacyInline } from "./PrivacyInline.tsx";
import { PRIVACY_CONFIG } from "../config/privacy.ts";
import { AfiaLogo } from "./AfiaLogo.tsx";
import "./QrLanding.css";

interface QrLandingProps {
  bottle: BottleContext;
  onStartScan: () => void;
}

interface StoredScan {
  sku: string;
  fillPercentage: number;
  remainingMl: number;
  scannedAt: string;
}

const STORAGE_KEY_HISTORY = "afia_scan_history";

/** Read last N scans for a given SKU from localStorage */
function readScans(sku: string, limit: number): StoredScan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const all: StoredScan[] = JSON.parse(raw);
    return all
      .filter((s) => s.sku === sku)
      .slice(0, limit)
      .reverse();
  } catch {
    return [];
  }
}

/**
 * L1 fix: Reactive hook — increments a revision counter inside the
 * storage event handler (which is a callback — not synchronous in the
 * effect body), then derives the scan list from the revision.
 */
function useRecentScans(sku: string, limit = 6): StoredScan[] {
  const bumpRevision = useState(0)[1];

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY_HISTORY) {
        bumpRevision((r: number) => r + 1);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [bumpRevision]);

  // readScans runs on each render; _revision dependency ensures re-reads on storage changes
  return readScans(sku, limit);
}

export function QrLanding({ bottle, onStartScan }: QrLandingProps) {
  const isOnline = useOnlineStatus();
  const recentScans = useRecentScans(bottle.sku);
  const [privacyAccepted, setPrivacyAccepted] = useState(
    () => localStorage.getItem(PRIVACY_CONFIG.storageKey) === "true"
  );

  const lastScan = recentScans.length > 0 ? recentScans[recentScans.length - 1] : null;
  const lastFill = lastScan ? Math.round(lastScan.fillPercentage) : 0;
  const consumedMl = lastScan
    ? Math.round(bottle.totalVolumeMl - lastScan.remainingMl)
    : 0;

  // Peak for sparkline normalisation
  const maxFill = recentScans.length > 0
    ? Math.max(...recentScans.map((s) => s.fillPercentage))
    : 100;

  return (
    <div className="qr-landing">
      {/* ── Header ── */}
      <header className="qrl-header">
        <AfiaLogo height={44} />
        <div className="qrl-header-right">
          {isOnline
            ? <Wifi size={18} className="qrl-status-icon qrl-status-online" />
            : <WifiOff size={18} className="qrl-status-icon qrl-status-offline" />
          }
        </div>
      </header>

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div className="qrl-offline-banner card card-compact" role="alert">
          <WifiOff size={16} />
          <div>
            <p className="qrl-offline-title">No connection</p>
            <p className="text-caption text-secondary">Connect to scan your bottle.</p>
          </div>
        </div>
      )}

      {/* ── Bottle selector pill ── */}
      <div className="qrl-selector-wrap">
        <div className="qrl-selector-pill">
          <Droplets size={16} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
          <span>{bottle.name}</span>
        </div>
      </div>

      {/* ── Liquid Gauge ── */}
      <div className="qrl-gauge-wrap">
        <LiquidGauge
          percentage={lastScan ? lastFill : 0}
          size="lg"
          sublabel={lastScan ? `${consumedMl}ml used` : "No scan yet"}
          animate
        />
      </div>

      {/* ── Camera guidance ── */}
      <div className="card card-compact qrl-camera-guide">
        <p className="text-caption text-secondary" style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
          <Camera size={14} style={{ flexShrink: 0, color: "var(--color-primary)" }} aria-hidden="true" />
          <span><strong>Tip:</strong> Hold your phone steadily, ensure the full bottle is visible, and photograph it in a well-lit spot.</span>
        </p>
      </div>

      {/* ── CTA ── */}
      <div className="qrl-cta-wrapper">
        {privacyAccepted ? (
          <button
            className="btn btn-primary btn-full qrl-cta"
            onClick={onStartScan}
            disabled={!isOnline}
            aria-disabled={!isOnline}
          >
            START SMART SCAN
          </button>
        ) : (
          <PrivacyInline
            ctaText="START SMART SCAN"
            onAccepted={() => {
              setPrivacyAccepted(true);
              onStartScan();
            }}
          />
        )}
      </div>

      {/* ── Sparkline card ── */}
      {recentScans.length > 0 && (
        <div className="card card-compact qrl-sparkline-card">
          <div className="qrl-sparkline-header">
            <span className="qrl-sparkline-label">RECENT SCANS</span>
            <span className="qrl-sparkline-count">{recentScans.length} scans</span>
          </div>
          <div className="qrl-sparkline" role="group" aria-label="Recent scan history">
            {recentScans.map((scan, i) => {
              const h = maxFill > 0 ? (scan.fillPercentage / maxFill) * 100 : 0;
              const isLast = i === recentScans.length - 1;
              return (
                <div
                  key={i}
                  className={`qrl-bar${isLast ? " qrl-bar--active" : ""}`}
                  style={{ height: `${Math.max(h, 8)}%` }}
                  tabIndex={0}
                  role="img"
                  aria-label={`Scan ${i + 1}: ${Math.round(scan.fillPercentage)}% fill remaining`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Baseline note ── */}
      <p className="qrl-note text-caption text-secondary">
        For accurate tracking, scan when the bottle is brand new.
      </p>
    </div>
  );
}
