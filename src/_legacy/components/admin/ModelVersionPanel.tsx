/**
 * Model Version Panel
 * Story 7.5 - Task 4
 * 
 * Displays current active model version, MAE, and training sample count
 * in the admin dashboard.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Database, Calendar, AlertCircle } from 'lucide-react';
import type { TFunction } from 'i18next';

interface ModelVersionInfo {
  version: string;
  mae: number;
  trainingCount: number;
  r2Key: string;
  deployedAt: string;
}

interface ModelVersionPanelProps {
  t: TFunction;
}

export function ModelVersionPanel({ t }: ModelVersionPanelProps) {
  const { i18n } = useTranslation();
  const [versionInfo, setVersionInfo] = useState<ModelVersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const apiUrl =
          import.meta.env.VITE_API_URL ||
          import.meta.env.VITE_PROXY_URL ||
          'https://afia-worker.savola.workers.dev';
        const response = await fetch(`${apiUrl}/model/version`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(t('admin.modelVersion.fetchError', { defaultValue: `Failed to fetch model version: ${response.status}`, status: response.status }));
        }

        const data = await response.json();
        setVersionInfo(data);
        setError(null);
      } catch (err) {
        console.error('[ModelVersionPanel] Failed to fetch version:', err);
        setError(err instanceof Error ? err.message : t('admin.modelVersion.error', 'Failed to load model version'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersionInfo();
  }, [t]);

  if (isLoading) {
    return (
      <div className="model-version-panel">
        <div className="model-version-header">
          <h3>{t('admin.modelVersion.title', 'Model Version')}</h3>
        </div>
        <div className="skeleton skeleton-metric-card" aria-hidden="true" />
      </div>
    );
  }

  if (error || !versionInfo) {
    return (
      <div className="model-version-panel">
        <div className="model-version-header">
          <h3>{t('admin.modelVersion.title', 'Model Version')}</h3>
        </div>
        <div className="model-version-error">
          <AlertCircle size={20} />
          <span>{error || t('admin.modelVersion.error', 'Failed to load model version')}</span>
        </div>
      </div>
    );
  }

  const deployedDate = new Date(versionInfo.deployedAt);
  const maePercentage = (versionInfo.mae * 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const maeStatus = versionInfo.mae < 0.05 ? 'excellent' : versionInfo.mae < 0.10 ? 'good' : 'needs-improvement';

  return (
    <div className="model-version-panel" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="model-version-header">
        <h3>{t('admin.modelVersion.title', 'Model Version')}</h3>
        <span className="model-version-badge">v{versionInfo.version}</span>
      </div>

      <div className="model-version-metrics">
        <div className="model-version-metric">
          <div className="model-version-metric-icon">
            <TrendingUp size={18} />
          </div>
          <div className="model-version-metric-content">
            <span className="model-version-metric-label">
              {t('admin.modelVersion.mae', 'Model Error (MAE)')}
            </span>
            <span className={`model-version-metric-value model-version-metric-value--${maeStatus}`}>
              {maePercentage}%
            </span>
            <span className="model-version-metric-sub">
              {maeStatus === 'excellent' 
                ? t('admin.modelVersion.maeExcellent', 'Excellent') 
                : maeStatus === 'good'
                ? t('admin.modelVersion.maeGood', 'Good')
                : t('admin.modelVersion.maeNeedsImprovement', 'Needs Training')}
            </span>
          </div>
        </div>

        <div className="model-version-metric">
          <div className="model-version-metric-icon">
            <Database size={18} />
          </div>
          <div className="model-version-metric-content">
            <span className="model-version-metric-label">
              {t('admin.modelVersion.trainingCount', 'Training Samples')}
            </span>
            <span className="model-version-metric-value">
              {versionInfo.trainingCount.toLocaleString(locale)}
            </span>
          </div>
        </div>

        <div className="model-version-metric">
          <div className="model-version-metric-icon">
            <Calendar size={18} />
          </div>
          <div className="model-version-metric-content">
            <span className="model-version-metric-label">
              {t('admin.modelVersion.deployedAt', 'Deployed')}
            </span>
            <span className="model-version-metric-value">
              {deployedDate.toLocaleDateString(locale)}
            </span>
            <span className="model-version-metric-sub">
              {deployedDate.toLocaleTimeString(locale)}
            </span>
          </div>
        </div>
      </div>

      <div className="model-version-footer">
        <span className="model-version-path">{versionInfo.r2Key}</span>
      </div>
    </div>
  );
}
