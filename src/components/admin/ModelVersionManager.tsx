/**
 * Model Version Manager Component
 * Story 10-2 - Task 1
 * 
 * Allows admins to activate and deactivate TensorFlow.js CNN model versions
 * from the admin dashboard without requiring direct database access.
 */

import { useState, useEffect } from 'react';
import type { TFunction } from 'i18next';

interface ModelVersion {
  version: string;
  mae: number;
  val_accuracy: number;
  training_samples_count: number;
  deployed_at: string;
  r2_key: string;
  is_active: boolean;
}

interface ModelVersionManagerProps {
  t: TFunction;
}

export function ModelVersionManager({ t }: ModelVersionManagerProps) {
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.afia.app';

  const getAdminToken = (): string => {
    return sessionStorage.getItem('afia_admin_session') || '';
  };

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/admin/model/versions`, {
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch versions: ${response.status}`);
      }

      const data = await response.json();
      setVersions(data.versions || []);
      setError(null);
    } catch (err) {
      console.error('[ModelVersionManager] Failed to fetch versions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load model versions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const handleActivate = async (version: string) => {
    try {
      const response = await fetch(`${apiUrl}/admin/model/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version }),
      });

      if (!response.ok) {
        throw new Error(`Failed to activate version: ${response.status}`);
      }

      // Refresh the version list
      await fetchVersions();
    } catch (err) {
      console.error('[ModelVersionManager] Failed to activate version:', err);
      alert(t('admin.modelVersion.activateError', 'Failed to activate version'));
    }
  };

  const handleDeactivate = async (version: string) => {
    const confirmed = confirm(
      t(
        'admin.modelVersion.deactivateConfirm',
        'Deactivate this version? Users will fall back to LLM.'
      )
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/admin/model/deactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version }),
      });

      if (!response.ok) {
        throw new Error(`Failed to deactivate version: ${response.status}`);
      }

      // Refresh the version list
      await fetchVersions();
    } catch (err) {
      console.error('[ModelVersionManager] Failed to deactivate version:', err);
      alert(t('admin.modelVersion.deactivateError', 'Failed to deactivate version'));
    }
  };

  if (loading) {
    return (
      <div className="model-version-manager">
        <h2>{t('admin.modelVersion.managerTitle', 'Model Versions')}</h2>
        <div className="model-version-loading">
          {t('admin.modelVersion.loading', 'Loading...')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="model-version-manager">
        <h2>{t('admin.modelVersion.managerTitle', 'Model Versions')}</h2>
        <div className="model-version-error">
          {t('admin.modelVersion.error', 'Failed to load model versions')}: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="model-version-manager">
      <h2>{t('admin.modelVersion.managerTitle', 'Model Versions')}</h2>
      <table className="model-version-table">
        <thead>
          <tr>
            <th>{t('admin.modelVersion.version', 'Version')}</th>
            <th>{t('admin.modelVersion.mae', 'MAE')}</th>
            <th>{t('admin.modelVersion.valAccuracy', 'Val Accuracy')}</th>
            <th>{t('admin.modelVersion.trainingSamples', 'Training Samples')}</th>
            <th>{t('admin.modelVersion.deployed', 'Deployed')}</th>
            <th>{t('admin.modelVersion.status', 'Status')}</th>
            <th>{t('admin.modelVersion.actions', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.version}>
              <td>{v.version}</td>
              <td>{(v.mae * 100).toFixed(2)}</td>
              <td>{(v.val_accuracy * 100).toFixed(1)}%</td>
              <td>{v.training_samples_count}</td>
              <td>{new Date(v.deployed_at).toLocaleDateString()}</td>
              <td>
                {v.is_active ? (
                  <span className="badge badge-success">
                    {t('admin.modelVersion.active', 'Active')}
                  </span>
                ) : (
                  <span className="badge badge-secondary">
                    {t('admin.modelVersion.inactive', 'Inactive')}
                  </span>
                )}
              </td>
              <td>
                {v.is_active ? (
                  <button
                    onClick={() => handleDeactivate(v.version)}
                    className="btn btn-secondary"
                  >
                    {t('admin.modelVersion.deactivate', 'Deactivate')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(v.version)}
                    className="btn btn-primary"
                  >
                    {t('admin.modelVersion.activate', 'Activate')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
