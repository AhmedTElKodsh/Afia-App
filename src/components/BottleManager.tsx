import { useState, useEffect } from "react";
import { bottleRegistry } from "../data/bottleRegistry";
import type { BottleEntry } from "../data/bottleRegistry";
import { InlineConfirm } from "./InlineConfirm";
import { EmptyState } from "./EmptyState";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import "./BottleManager.css";

const STORAGE_KEY = "afia_custom_bottles";

export function BottleManager() {
  const { t } = useTranslation();
  const [customBottles, setCustomBottles] = useState<BottleEntry[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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

// ── Bottle Card ───────────────────────────────────────────────────────────────
interface BottleCardProps {
  bottle: BottleEntry;
  isCustom: boolean;
  isPendingDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function BottleCard({
  bottle,
  isCustom,
  isPendingDelete,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: BottleCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bottle-card">
      <div className="bottle-card-header">
        <h4>{bottle.name}</h4>
        {!isCustom && <span className="builtin-badge">{t('admin.bottleManager.details.builtin', 'Built-in')}</span>}
      </div>

      <div className="bottle-details">
        <div className="detail-row">
          <span className="label">{t('admin.bottleManager.details.sku', 'SKU:')}</span>
          <span className="value">{bottle.sku}</span>
        </div>
        <div className="detail-row">
          <span className="label">{t('admin.bottleManager.details.oilType', 'Oil Type:')}</span>
          <span className="value">{t(`landing.${bottle.oilType}`, bottle.oilType.replace(/_/g, " "))}</span>
        </div>
        <div className="detail-row">
          <span className="label">{t('admin.bottleManager.details.capacity', 'Capacity:')}</span>
          <span className="value">{bottle.totalVolumeMl}ml</span>
        </div>
        <div className="detail-row">
          <span className="label">{t('admin.bottleManager.details.shape', 'Shape:')}</span>
          <span className="value">{bottle.geometry.shape}</span>
        </div>
        {bottle.geometry.shape === "cylinder" ? (
          <div className="detail-row">
            <span className="label">{t('admin.bottleManager.details.dimensions', 'Dimensions:')}</span>
            <span className="value">
              {t('admin.bottleManager.details.heightShort', 'H:')} {bottle.geometry.heightMm}mm, {t('admin.bottleManager.details.diameterShort', 'D:')} {bottle.geometry.diameterMm}mm
            </span>
          </div>
        ) : (
          <>
            <div className="detail-row">
              <span className="label">{t('admin.bottleManager.details.heightFull', 'Height:')}</span>
              <span className="value">{bottle.geometry.heightMm}mm</span>
            </div>
            <div className="detail-row">
              <span className="label">{t('admin.bottleManager.details.topDiameter', 'Top Diameter:')}</span>
              <span className="value">{bottle.geometry.topDiameterMm}mm</span>
            </div>
            <div className="detail-row">
              <span className="label">{t('admin.bottleManager.details.bottomDiameter', 'Bottom Diameter:')}</span>
              <span className="value">{bottle.geometry.bottomDiameterMm}mm</span>
            </div>
          </>
        )}
      </div>

      {isCustom && (
        <div className="bottle-actions">
          <button className="btn btn-sm btn-outline" onClick={onEdit}>
            {t('common.edit', 'Edit')}
          </button>
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            {t('common.delete', 'Delete')}
          </button>
        </div>
      )}

      {isPendingDelete && (
        <InlineConfirm
          message={t('admin.bottleManager.details.deleteConfirm', 'Are you sure you want to delete this bottle?')}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  );
}

// ── Bottle Form ───────────────────────────────────────────────────────────────
interface BottleFormProps {
  bottle: BottleEntry | null;
  onSave: (bottle: BottleEntry) => void;
  onCancel: () => void;
}

function BottleForm({ bottle, onSave, onCancel }: BottleFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<BottleEntry>>({
    sku: bottle?.sku || "",
    name: bottle?.name || "",
    oilType: bottle?.oilType || "extra_virgin_olive",
    totalVolumeMl: bottle?.totalVolumeMl || 500,
    geometry: bottle?.geometry || {
      shape: "cylinder",
      heightMm: 220,
      diameterMm: 65,
    },
  });
  const [formError, setFormError] = useState("");

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.name || !formData.totalVolumeMl) {
      setFormError(t('admin.bottleManager.form.errorRequired', 'Please fill in all required fields (SKU, Name, Capacity).'));
      return;
    }
    setFormError("");
    onSave(formData as BottleEntry);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content bottle-form"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3>{bottle ? t('admin.bottleManager.form.titleEdit', 'Edit Bottle') : t('admin.bottleManager.form.titleAdd', 'Add New Bottle')}</h3>
          <button className="modal-close" onClick={onCancel} aria-label={t('common.close', 'Close')}>
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          {formError && (
            <p className="form-error-message" role="alert">
              {formError}
            </p>
          )}

          <div className="form-group">
            <label htmlFor="sku">{t('admin.bottleManager.details.sku', 'SKU')} *</label>
            <input
              id="sku"
              type="text"
              required
              value={formData.sku}
              onChange={(e) => {
                setFormError("");
                setFormData({ ...formData, sku: e.target.value });
              }}
              placeholder="e.g., filippo-berio-500ml"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">{t('admin.bottleManager.form.nameLabel', 'Bottle Name')} *</label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => {
                setFormError("");
                setFormData({ ...formData, name: e.target.value });
              }}
              placeholder="e.g., Filippo Berio Extra Virgin Olive Oil"
            />
          </div>

          <div className="form-group">
            <label htmlFor="oilType">{t('admin.bottleManager.details.oilType', 'Oil Type')} *</label>
            <select
              id="oilType"
              value={formData.oilType}
              onChange={(e) =>
                setFormData({ ...formData, oilType: e.target.value })
              }
            >
              <option value="extra_virgin_olive">{t('landing.extra_virgin_olive', 'Extra Virgin Olive Oil')}</option>
              <option value="pure_olive">{t('landing.pure_olive', 'Pure Olive Oil')}</option>
              <option value="sunflower">{t('landing.sunflower', 'Sunflower Oil')}</option>
              <option value="vegetable">{t('landing.vegetable', 'Vegetable Oil')}</option>
              <option value="canola">{t('landing.canola', 'Canola Oil')}</option>
              <option value="coconut">{t('landing.coconut', 'Coconut Oil')}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="capacity">{t('admin.bottleManager.details.capacity', 'Capacity')} (ml) *</label>
            <input
              id="capacity"
              type="number"
              required
              min="1"
              value={formData.totalVolumeMl}
              onChange={(e) => {
                setFormError("");
                setFormData({
                  ...formData,
                  totalVolumeMl: parseInt(e.target.value) || 0,
                });
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="shape">{t('admin.bottleManager.details.shape', 'Bottle Shape')} *</label>
            <select
              id="shape"
              value={formData.geometry?.shape}
              onChange={(e) => {
                const shape = e.target.value as "cylinder" | "frustum";
                setFormData({
                  ...formData,
                  geometry:
                    shape === "cylinder"
                      ? { shape, heightMm: 220, diameterMm: 65 }
                      : {
                          shape,
                          heightMm: 280,
                          topDiameterMm: 70,
                          bottomDiameterMm: 85,
                        },
                });
              }}
            >
              <option value="cylinder">{t('admin.bottleManager.form.shapeCylinder', 'Cylinder')}</option>
              <option value="frustum">{t('admin.bottleManager.form.shapeFrustum', 'Frustum (Tapered)')}</option>
            </select>
          </div>

          {formData.geometry?.shape === "cylinder" ? (
            <>
              <div className="form-group">
                <label htmlFor="height">{t('admin.bottleManager.details.heightFull', 'Height')} (mm)</label>
                <input
                  id="height"
                  type="number"
                  value={formData.geometry?.heightMm || 220}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geometry: {
                        ...formData.geometry!,
                        heightMm: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="diameter">{t('admin.bottleManager.details.diameterShort', 'Diameter')} (mm)</label>
                <input
                  id="diameter"
                  type="number"
                  value={formData.geometry?.diameterMm || 65}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geometry: {
                        ...formData.geometry!,
                        diameterMm: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="height">{t('admin.bottleManager.details.heightFull', 'Height')} (mm)</label>
                <input
                  id="height"
                  type="number"
                  value={formData.geometry?.heightMm || 280}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geometry: {
                        ...formData.geometry!,
                        heightMm: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="topDiameter">{t('admin.bottleManager.details.topDiameter', 'Top Diameter')} (mm)</label>
                <input
                  id="topDiameter"
                  type="number"
                  value={formData.geometry?.topDiameterMm || 70}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geometry: {
                        ...formData.geometry!,
                        topDiameterMm: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="bottomDiameter">{t('admin.bottleManager.details.bottomDiameter', 'Bottom Diameter')} (mm)</label>
                <input
                  id="bottomDiameter"
                  type="number"
                  value={formData.geometry?.bottomDiameterMm || 85}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geometry: {
                        ...formData.geometry!,
                        bottomDiameterMm: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onCancel}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {bottle ? t('common.save', 'Save Changes') : t('admin.bottles.addBottle', 'Add Bottle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
