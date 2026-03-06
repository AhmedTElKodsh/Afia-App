import type { BottleContext } from "../state/appState.ts";
import { useOnlineStatus } from "../hooks/useOnlineStatus.ts";
import "./QrLanding.css";

interface QrLandingProps {
  bottle: BottleContext;
  onStartScan: () => void;
}

export function QrLanding({ bottle, onStartScan }: QrLandingProps) {
  const isOnline = useOnlineStatus();

  return (
    <div className="qr-landing">
      <div className="qr-landing-content">
        <div className="brand-mark">Afia</div>

        {!isOnline && (
          <div className="offline-banner" role="alert">
            <p>Network connection required for scanning</p>
            <p className="text-caption">Connect to WiFi or cellular data to continue.</p>
          </div>
        )}

        <div className="bottle-info card">
          <div className="bottle-icon" aria-hidden="true">
            🫒
          </div>
          <h1 className="bottle-name">{bottle.name}</h1>
          <p className="bottle-details text-secondary">
            {bottle.oilType.replace(/_/g, " ")} &middot; {bottle.totalVolumeMl}
            ml
          </p>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={onStartScan}
          disabled={!isOnline}
          aria-disabled={!isOnline}
        >
          Start Scan
        </button>

        <p className="baseline-note text-caption text-secondary">
          For accurate tracking, scan your bottle when it's brand new.
        </p>
      </div>
    </div>
  );
}
