import { useTranslation } from "react-i18next";
import { Beaker, TestTube, ExternalLink } from "lucide-react";
import { ACTIVE_SKU } from "../../data/bottleRegistry.ts";

interface TestLabHeaderProps {
  testCount: number;
}

export function TestLabHeader({ testCount }: TestLabHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="test-lab-header">
      <div className="test-lab-title-section">
        <Beaker size={28} strokeWidth={2} className="test-lab-icon" />
        <div>
          <div className="test-lab-header-row">
            <h1 className="test-lab-title">{t('admin.testLab.title')}</h1>
            {testCount > 0 && (
              <div className="test-count-badge">
                <TestTube size={14} strokeWidth={2} className="test-count-icon" />
                {t('admin.testLab.sessionTests', { count: testCount })}
              </div>
            )}
          </div>
          <p className="test-lab-subtitle">{t('admin.testLab.subtitle')}</p>
          <a href={`/?sku=${ACTIVE_SKU}`} target="_blank" rel="noopener noreferrer" className="open-user-view-link">
            <ExternalLink size={14} strokeWidth={2} />
            {t('admin.testLab.openUserView')}
          </a>
        </div>
      </div>
    </div>
  );
}
