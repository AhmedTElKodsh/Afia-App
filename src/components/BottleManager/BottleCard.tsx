import { useTranslation } from "react-i18next";
import type { BottleEntry } from "../../data/bottleRegistry.ts";
import { InlineConfirm } from "../InlineConfirm.tsx";

interface BottleCardProps {
  bottle: BottleEntry;
  isCustom: boolean;
  isPendingDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export function BottleCard({
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
