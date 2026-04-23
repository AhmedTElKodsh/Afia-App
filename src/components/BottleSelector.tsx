import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Check } from "lucide-react";
import { activeBottleRegistry, getBottleBySku } from "../data/bottleRegistry.ts";
import "./BottleSelector.css";

const STORAGE_KEY = "afia_selected_sku";

interface BottleSelectorProps {
  onBottleChange?: (sku: string) => void;
  compact?: boolean;
}

export function BottleSelector({ onBottleChange, compact = false }: BottleSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Keep callback in a ref to avoid re-running the persist effect when parent re-renders
  const onBottleChangeRef = useRef(onBottleChange);
  useEffect(() => { onBottleChangeRef.current = onBottleChange; });

  // Initialize from localStorage or default to first bottle
  const [selectedSku, setSelectedSku] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && getBottleBySku(stored)) {
      return stored;
    }
    return activeBottleRegistry[0]?.sku || "";
  });

  const selectedBottle = getBottleBySku(selectedSku);

  // Persist selection and notify parent — only re-runs when selectedSku changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedSku);
    onBottleChangeRef.current?.(selectedSku);
  }, [selectedSku]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  const handleSelect = (sku: string) => {
    setSelectedSku(sku);
    setIsOpen(false);
  };

  const getLocalizedBottleName = (sku: string, defaultName: string) => {
    const key = `bottles.${sku}`;
    const localized = t(key);
    return localized === key ? defaultName : localized;
  };

  const getOilTypeLabel = (oilType: string) => {
    const key = `bottleSelector.oilTypes.${oilType.toLowerCase().replace(/_/g, '')}`;
    const label = t(key);
    // Fallback to formatted string if translation key is missing
    return label === key ? oilType.replace(/_/g, " ") : label;
  };

  if (compact) {
    return (
      <div className="bottle-selector-compact">
        <select
          value={selectedSku}
          onChange={(e) => handleSelect(e.target.value)}
          className="bottle-dropdown"
          aria-label={t('admin.qrGenerator.selectBottle')}
        >
          {activeBottleRegistry.map((bottle) => (
            <option key={bottle.sku} value={bottle.sku}>
              {getLocalizedBottleName(bottle.sku, bottle.name)} ({bottle.totalVolumeMl}{t('common.ml')})
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
          <span className="bottle-selector-label">{t('bottleSelector.currentBottle')}</span>
          <span className="bottle-selector-name">
            {selectedBottle ? getLocalizedBottleName(selectedBottle.sku, selectedBottle.name) : ""}
          </span>
          <span className="bottle-selector-capacity">
            {selectedBottle?.totalVolumeMl}{t('common.ml')} {selectedBottle && getOilTypeLabel(selectedBottle.oilType)}
          </span>
        </div>
        <ChevronDown size={14} className={`bottle-selector-arrow ${isOpen ? "open" : ""}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="bottle-selector-dropdown" role="listbox">
          {activeBottleRegistry.map((bottle) => (
            <button
              key={bottle.sku}
              className={`bottle-option ${selectedSku === bottle.sku ? "selected" : ""}`}
              onClick={() => handleSelect(bottle.sku)}
              role="option"
              aria-selected={selectedSku === bottle.sku}
            >
              <div className="bottle-option-info">
                <span className="bottle-option-name">{getLocalizedBottleName(bottle.sku, bottle.name)}</span>
                <span className="bottle-option-meta">
                  {bottle.totalVolumeMl}{t('common.ml')} &middot; {getOilTypeLabel(bottle.oilType)}
                </span>
              </div>
              {selectedSku === bottle.sku && (
                <span className="bottle-option-check" aria-hidden="true"><Check size={14} strokeWidth={2.5} /></span>
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
