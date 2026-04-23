import { useState } from "react";
import { bottleRegistry } from "../data/bottleRegistry.ts";
import type { BottleEntry } from "../data/bottleRegistry.ts";
import { EmptyState } from "./EmptyState.tsx";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import "./BottleManager.css";

import { BottleCard } from "./BottleManager/BottleCard.tsx";
import { BottleForm } from "./BottleManager/BottleForm.tsx";

const STORAGE_KEY = "afia_custom_bottles";

export function BottleManager() {
  const { t } = useTranslation();
  const [customBottles, setCustomBottles] = useState<BottleEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingBottle, setEditingBottle] = useState<BottleEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDeleteSku, setPendingDeleteSku] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "builtin" | "custom">("all");

  const allBottles = [...bottleRegistry, ...customBottles];
  const builtinCount = bottleRegistry.length;
  const customCount = customBottles.length;

  const filteredBottles = allBottles.filter((bottle) => {
    const isCustom = customBottles.some((b) => b.sku === bottle.sku);
    if (filterType === "builtin" && isCustom) return false;
    if (filterType === "custom" && !isCustom) return false;
    return (
      bottle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bottle.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSave = (bottle: BottleEntry) => {
    setCustomBottles((prev) => {
      const updated = editingBottle
        ? prev.map((b) => (b.sku === editingBottle.sku ? bottle : b))
        : [...prev, bottle];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setIsAdding(false);
    setEditingBottle(null);
  };

  const handleDeleteRequest = (sku: string) => {
    setPendingDeleteSku(sku);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteSku) return;
    const sku = pendingDeleteSku;
    setCustomBottles((prev) => {
      const updated = prev.filter((b) => b.sku !== sku);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setPendingDeleteSku(null);
  };

  const handleCancelDelete = () => {
    setPendingDeleteSku(null);
  };

  return (
    <div className="bottle-manager">
      <header className="manager-header">
        <h3>{t('admin.bottles.title', 'Bottle Registry')}</h3>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          {t('admin.bottles.addBottle', '+ Add Bottle')}
        </button>
      </header>

      {/* Filter pills */}
      <div className="filter-pills-row" role="group" aria-label="Filter bottles">
        {([
          { value: "all" as const, label: t('admin.bottleManager.filter.all', { count: allBottles.length, defaultValue: `All (${allBottles.length})` }) },
          { value: "builtin" as const, label: t('admin.bottleManager.filter.builtin', { count: builtinCount, defaultValue: `Built-in (${builtinCount})` }) },
          { value: "custom" as const, label: t('admin.bottleManager.filter.custom', { count: customCount, defaultValue: `Custom (${customCount})` }) },
        ]).map(({ value, label }) => (
          <button
            key={value}
            className={`filter-pill${filterType === value ? " active" : ""}`}
            onClick={() => setFilterType(value)}
            aria-pressed={filterType === value}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="search-input-wrap">
        <label htmlFor="bottle-search" className="sr-only">
          {t('admin.bottleManager.searchPlaceholder', 'Search bottles')}
        </label>
        <Search className="search-input-icon" size={16} aria-hidden="true" />
        <input
          id="bottle-search"
          type="search"
          className="search-input"
          placeholder={t('admin.bottleManager.searchPlaceholder', 'Search bottles...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="bottles-list">
        {filteredBottles.length === 0 ? (
          <EmptyState
            title={t('admin.bottleManager.noResults', 'No bottles found')}
            description={t('admin.bottleManager.noResultsDesc', 'Try adjusting your search criteria.')}
            icon={<Search size={48} />}
          />
        ) : (
          filteredBottles.map((bottle) => {
            const isCustom = customBottles.some((b) => b.sku === bottle.sku);
            return (
              <BottleCard
                key={bottle.sku}
                bottle={bottle}
                isCustom={isCustom}
                isPendingDelete={pendingDeleteSku === bottle.sku}
                onEdit={() => setEditingBottle(bottle)}
                onDelete={() => handleDeleteRequest(bottle.sku)}
                onConfirmDelete={handleConfirmDelete}
                onCancelDelete={handleCancelDelete}
              />
            );
          })
        )}
      </div>

      {(isAdding || editingBottle) && (
        <BottleForm
          bottle={editingBottle}
          existingSkus={allBottles
            .map((b) => b.sku)
            .filter((sku) => sku !== editingBottle?.sku)}
          onSave={handleSave}
          onCancel={() => {
            setIsAdding(false);
            setEditingBottle(null);
          }}
        />
      )}
    </div>
  );
}
