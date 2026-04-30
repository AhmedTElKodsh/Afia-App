import { useTranslation } from 'react-i18next';
import './OrientationGuide.css';

interface OrientationGuideProps {
  visible: boolean;
}

export function OrientationGuide({ visible }: OrientationGuideProps) {
  const { t } = useTranslation();
  
  if (!visible) return null;
  
  return (
    <div className="orientation-guide" role="status" aria-live="polite">
      <span className="orientation-text">{t('camera.shootFrontside')} →</span>
    </div>
  );
}
