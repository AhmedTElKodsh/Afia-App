import { useTranslation } from "react-i18next";
import { QrCode, Zap, TestTube } from "lucide-react";
import type { BottleEntry } from "../../data/bottleRegistry.ts";

interface TestFlowIdleProps {
  activeBottleRegistry: BottleEntry[];
  selectedSku: string;
  selectedBottle: BottleEntry | null;
  onSkuChange: (sku: string) => void;
  onMockQrScan: (sku: string) => void;
  onShowMockApi: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getLocalizedBottleName: (sku: string, defaultName: string) => string;
}

export function TestFlowIdle({
  activeBottleRegistry,
  selectedSku,
  selectedBottle,
  onSkuChange,
  onMockQrScan,
  onShowMockApi,
  onImageUpload,
  getLocalizedBottleName,
}: TestFlowIdleProps) {
  const { t } = useTranslation();
  
  const getOilEmoji = (oilType: string) => {
    const map: Record<string, string> = {
      corn: "🌽", sunflower: "🌻", olive: "🫒", canola: "🌿",
    };
    return map[oilType] ?? "🫙";
  };

  return (
    <div className="test-lab-section test-lab-section--bottle" style={{ textAlign: 'center' }}>
      <h2 className="test-lab-section-title">{t('admin.testLab.selectBottleScanQr')}</h2>

      {activeBottleRegistry.length > 1 ? (
        <div className="test-lab-sku-selector" style={{ marginBottom: 'var(--space-md)', display: 'flex', justifyContent: 'center' }}>
          <select 
            value={selectedSku} 
            onChange={(e) => onSkuChange(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '320px', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          >
            {activeBottleRegistry.map(b => (
              <option key={b.sku} value={b.sku}>{getLocalizedBottleName(b.sku, b.name)}</option>
            ))}
          </select>
        </div>
      ) : selectedBottle && (
        <div className="bottle-confirmed-card">
          <span className="bottle-confirmed-emoji">{getOilEmoji(selectedBottle.oilType)}</span>
          <span className="bottle-confirmed-name">{getLocalizedBottleName(selectedSku, selectedBottle.name)}</span>
          <span className="bottle-confirmed-badge">✓</span>
        </div>
      )}

      <div className="entry-point-buttons" style={{ marginTop: 'var(--space-md)', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <button className="entry-point-button entry-point-button--primary" onClick={() => onMockQrScan(selectedSku)} type="button" style={{ width: '100%', maxWidth: '320px' }}>
          <QrCode size={22} strokeWidth={2} />
          <span>{t('admin.testLab.scanMockQr')}</span>
        </button>

        <button className="entry-point-button entry-point-button--secondary" onClick={onShowMockApi} type="button" style={{ width: '100%', maxWidth: '320px' }}>
          <Zap size={22} strokeWidth={2} />
          <span>{t('admin.testLab.mockApiTest', 'Mock API Test')}</span>
        </button>

        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <button className="entry-point-button entry-point-button--secondary" type="button" onClick={() => document.getElementById('geometry-upload')?.click()} style={{ width: '100%' }}>
            <TestTube size={22} strokeWidth={2} />
            <span>{t('admin.testLab.geometryTest', 'Upload Image for Geometry Test')}</span>
          </button>
          <input id="geometry-upload" type="file" accept="image/*" onChange={onImageUpload} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  );
}
