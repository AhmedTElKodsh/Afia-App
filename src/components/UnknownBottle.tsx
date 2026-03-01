import "./UnknownBottle.css";

interface UnknownBottleProps {
  sku: string | null;
}

export function UnknownBottle({ sku }: UnknownBottleProps) {
  return (
    <div className="unknown-bottle">
      <div className="unknown-bottle-content">
        <div className="unknown-icon" aria-hidden="true">
          ℹ️
        </div>
        <h1>
          {sku ? "This bottle is not yet supported" : "No bottle specified"}
        </h1>
        {sku && <p className="sku-display text-secondary">SKU: {sku}</p>}
        <p className="text-secondary">
          {sku
            ? "We may support this bottle in the future."
            : "Scan a QR code on a supported oil bottle to get started."}
        </p>
      </div>
    </div>
  );
}
