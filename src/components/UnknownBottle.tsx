import { Info } from "lucide-react";
import { AfiaLogo } from "./AfiaLogo.tsx";
import "./UnknownBottle.css";

interface UnknownBottleProps {
  sku: string | null;
}

export function UnknownBottle({ sku }: UnknownBottleProps) {
  return (
    <div className="unknown-bottle">
      <div className="unknown-bottle-content">
        {/* Brand anchor — keeps the experience on-brand */}
        <AfiaLogo height={64} className="ub-logo" />

        <div className="unknown-icon" aria-hidden="true">
          <Info size={44} strokeWidth={1.5} />
        </div>

        <h1>
          {sku ? "Bottle not yet supported" : "No bottle linked"}
        </h1>

        {sku && (
          <p className="sku-display text-secondary">SKU: {sku}</p>
        )}

        <p className="text-secondary ub-desc">
          {sku
            ? "We may support this bottle in a future update."
            : "Scan a QR code on a supported Afia oil bottle to get started."}
        </p>

        {/* Step-by-step orientation guide */}
        {!sku && (
          <div className="card card-compact ub-guide" role="list" aria-label="Getting started steps">
            <p className="ub-guide-title text-caption text-secondary">How to get started:</p>
            <ol className="ub-steps">
              <li role="listitem">Find a supported Afia oil bottle</li>
              <li role="listitem">Scan the QR code on the label</li>
              <li role="listitem">Track your oil consumption effortlessly</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
