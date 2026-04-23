import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { BottleEntry } from "../../data/bottleRegistry.ts";

interface BottleFormProps {
  bottle: BottleEntry | null;
  existingSkus: string[];
  onSave: (bottle: BottleEntry) => void;
  onCancel: () => void;
}

export function BottleForm({ bottle, existingSkus, onSave, onCancel }: BottleFormProps) {
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
    if ((formData.totalVolumeMl || 0) < 1) {
      setFormError(t('admin.bottleManager.form.errorCapacity', 'Capacity must be at least 1 ml.'));
      return;
    }
    const isDuplicate = existingSkus.some(s => s.toLowerCase() === formData.sku?.toLowerCase());
    if (isDuplicate) {
      setFormError(t('admin.bottleManager.form.errorDuplicateSku', 'A bottle with this SKU already exists.'));
      return;
    }
    const geom = formData.geometry;
    if (geom) {
      const isValidGeometry = geom.shape === 'cylinder'
        ? (geom.heightMm ?? 0) > 0 && (geom.diameterMm ?? 0) > 0
        : geom.shape === 'frustum'
          ? (geom.heightMm ?? 0) > 0 && (geom.topDiameterMm ?? 0) > 0 && (geom.bottomDiameterMm ?? 0) > 0
          : Array.isArray(geom.calibrationPoints) && geom.calibrationPoints.length >= 2;
      if (!isValidGeometry) {
        setFormError(t('admin.bottleManager.form.errorGeometry', 'Invalid bottle geometry. Check dimensions or calibration points.'));
        return;
      }
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
                const shape = e.target.value as "cylinder" | "frustum" | "calibrated";
                setFormData({
                  ...formData,
                  geometry:
                    shape === "cylinder"
                      ? { shape, heightMm: 220, diameterMm: 65 }
                      : shape === "frustum"
                        ? {
                            shape,
                            heightMm: 280,
                            topDiameterMm: 70,
                            bottomDiameterMm: 85,
                          }
                      : {
                          shape,
                          calibrationPoints: [
                            { fillHeightPct: 0, remainingMl: 0 },
                            { fillHeightPct: 100, remainingMl: formData.totalVolumeMl || 500 },
                          ],
                        },
                });
              }}
            >
              <option value="cylinder">{t('admin.bottleManager.form.shapeCylinder', 'Cylinder')}</option>
              <option value="frustum">{t('admin.bottleManager.form.shapeFrustum', 'Frustum (Tapered)')}</option>
              <option value="calibrated">{t('admin.bottleManager.form.shapeCalibrated', 'Calibrated')}</option>
            </select>
          </div>

          {formData.geometry?.shape === "cylinder" ? (
            <>
              <div className="form-group">
                <label htmlFor="height">{t('admin.bottleManager.details.heightFull', 'Height')} (mm)</label>
                <input
                  id="height"
                  type="number"
                  min="1"
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
                  min="1"
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
          ) : formData.geometry?.shape === "frustum" ? (
            <>
              <div className="form-group">
                <label htmlFor="height">{t('admin.bottleManager.details.heightFull', 'Height')} (mm)</label>
                <input
                  id="height"
                  type="number"
                  min="1"
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
                  min="1"
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
                  min="1"
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
          ) : (
            <p className="form-helper-text">
              {t(
                'admin.bottleManager.form.calibratedInfo',
                'Calibrated bottles use stored calibration points instead of diameter fields.',
              )}
            </p>
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
