import { useState, useEffect } from "react";
import { bottleRegistry, getBottleBySku } from "../data/bottleRegistry";
import "./BottleSelector.css";

const STORAGE_KEY = "afia_selected_sku";

interface BottleSelectorProps {
  onBottleChange?: (sku: string) => void;
  compact?: boolean;
}

export function BottleSelector({ onBottleChange, compact = false }: BottleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Initialize from localStorage or default to first bottle
  const [selectedSku, setSelectedSku] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && getBottleBySku(stored)) {
      return stored;
    }
    return bottleRegistry[0]?.sku || "";
  });

  const selectedBottle = getBottleBySku(selectedSku);

  // Persist selection and notify parent
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedSku);
    onBottleChange?.(selectedSku);
  }, [selectedSku, onBottleChange]);

  const handleSelect = (sku: string) => {
    setSelectedSku(sku);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="bottle-selector-compact">
        <select
          value={selectedSku}
          onChange={(e) => handleSelect(e.target.value)}
          className="bottle-dropdown"
          aria-label="Select bottle"
        >
          {bottleRegistry.map((bottle) => (
            <option key={bottle.sku} value={bottle.sku}>
              {bottle.name} ({bottle.totalVolumeMl}ml)
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="bottle-selector">
      <button
        className="bottle-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="bottle-selector-info">
          <span className="bottle-selector-label">Current Bottle:</span>
          <span className="bottle-selector-name">{selectedBottle?.name}</span>
          <span className="bottle-selector-capacity">
            {selectedBottle?.totalVolumeMl}ml {selectedBottle?.oilType.replace(/_/g, " ")}
          </span>
        </div>
        <span className={`bottle-selector-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="bottle-selector-dropdown" role="listbox">
          {bottleRegistry.map((bottle) => (
            <button
              key={bottle.sku}
              className={`bottle-option ${selectedSku === bottle.sku ? "selected" : ""}`}
              onClick={() => handleSelect(bottle.sku)}
              role="option"
              aria-selected={selectedSku === bottle.sku}
            >
              <div className="bottle-option-info">
                <span className="bottle-option-name">{bottle.name}</span>
                <span className="bottle-option-meta">
                  {bottle.totalVolumeMl}ml &middot; {bottle.oilType.replace(/_/g, " ")}
                </span>
              </div>
              {selectedSku === bottle.sku && (
                <span className="bottle-option-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="bottle-selector-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
